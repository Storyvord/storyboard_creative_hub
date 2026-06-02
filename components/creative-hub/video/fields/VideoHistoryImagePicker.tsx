// STO-1854 — "From history" media picker for video form media roles.
//
// Lets the user pick a source from the script's history instead of re-uploading:
//   - kind="image" → previz stills via getScriptPrevisualizations (same source
//     as the Creative Space "View History" feed) — for start/end/image roles.
//   - kind="video" → generated clips via getScriptVideoClips — for reference /
//     motion-control video roles.
// On pick we hand back the already-hosted URL + the source id (previzId for
// images, videoClipId for videos) so the backend re-signs a FRESH storage URL at
// task time (the captured SAS URL is short-lived). Per-(script,kind) module
// cache: reopening renders instantly and only newly-detected rows are appended.
// Infinite scroll fetches the next page when scrolled to 80% of the list.
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, ImageOff } from "lucide-react";
import { toast } from "react-toastify";
import { getScriptPrevisualizations } from "@/services/creative-hub";
import { getScriptVideoClips } from "@/services/video";
import { extractApiError } from "@/lib/extract-api-error";

export type HistoryMediaKind = "image" | "video";

/** Unified history row (image still or generated video clip). */
interface HistoryRow {
  id: number;
  url: string | null;
  label: string | null;
}

export interface PickedHistoryMedia {
  url: string;
  description: string | null;
  /** Set for image picks (source previz id). */
  previzId: number | null;
  /** Set for video picks (source clip id). */
  videoClipId: number | null;
}

interface VideoHistoryImagePickerProps {
  open: boolean;
  onClose: () => void;
  scriptId: number;
  /** Which history to browse — stills or generated clips. Defaults to image. */
  kind?: HistoryMediaKind;
  /** Human label for the target role (e.g. "Start frame", "Reference video"). */
  roleLabel: string;
  onPick: (media: PickedHistoryMedia) => void;
}

interface CacheEntry {
  rows: HistoryRow[];
  page: number;
  hasMore: boolean;
  ts: number;
}
// Keyed by `${scriptId}:${kind}` so images and clips cache independently.
const historyCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 8 * 60 * 1000;

async function fetchHistoryPage(
  kind: HistoryMediaKind,
  scriptId: number,
  page: number,
): Promise<{ rows: HistoryRow[]; hasNext: boolean }> {
  if (kind === "video") {
    const r = await getScriptVideoClips(scriptId, page);
    return {
      rows: (r.results ?? []).map((c) => ({
        id: c.id,
        url: c.video_url ?? null,
        label: c.prompt_detail?.final_prompt ?? c.prompt ?? null,
      })),
      hasNext: !!r.next,
    };
  }
  const r = await getScriptPrevisualizations(scriptId, page);
  return {
    rows: ((r.results ?? []) as Array<{ id: number; image_url?: string | null; description?: string | null }>).map(
      (x) => ({ id: x.id, url: x.image_url ?? null, label: x.description ?? null }),
    ),
    hasNext: !!r.next,
  };
}

export default function VideoHistoryImagePicker({
  open,
  onClose,
  scriptId,
  kind = "image",
  roleLabel,
  onPick,
}: VideoHistoryImagePickerProps) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadMoreRef = useRef<() => void>(() => {});
  const cacheKey = `${scriptId}:${kind}`;
  const usable = rows.filter((r) => !!r.url);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;

    const cached = historyCache.get(cacheKey);
    const fresh = !!cached && Date.now() - cached.ts < CACHE_TTL_MS;

    if (cached) {
      // Render cached rows instantly — no flash, no thumbnail re-download.
      setRows(cached.rows);
      setPage(cached.page);
      setHasMore(cached.hasMore);
      setLoading(false);
    } else {
      setRows([]);
      setPage(1);
      setHasMore(false);
      setLoading(true);
    }

    const sync = async () => {
      try {
        const { rows: incoming, hasNext } = await fetchHistoryPage(kind, scriptId, 1);
        if (cancelled) return;
        if (fresh && cached) {
          // Delta: prepend ONLY new rows (id not cached) so existing thumbnails
          // keep their browser-cached URLs. TTL (ts) preserved for a later refresh.
          const seen = new Set(cached.rows.map((r) => r.id));
          const added = incoming.filter((r) => r.id != null && !seen.has(r.id));
          if (added.length > 0) {
            const merged = [...added, ...cached.rows];
            historyCache.set(cacheKey, { ...cached, rows: merged });
            setRows(merged);
          }
        } else {
          historyCache.set(cacheKey, { rows: incoming, page: 1, hasMore: hasNext, ts: Date.now() });
          setRows(incoming);
          setPage(1);
          setHasMore(hasNext);
        }
      } catch (err) {
        if (!cancelled && !cached) {
          console.error("Failed to fetch script history", err);
          toast.error(extractApiError(err, "Failed to load script history."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    sync();
    return () => {
      cancelled = true;
    };
  }, [open, scriptId, kind, cacheKey]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const { rows: incoming, hasNext } = await fetchHistoryPage(kind, scriptId, next);
      setRows((prev) => {
        const seen = new Set(prev.map((r) => r.id));
        const merged = [...prev, ...incoming.filter((r) => r.id != null && !seen.has(r.id))];
        const entry = historyCache.get(cacheKey);
        historyCache.set(cacheKey, {
          rows: merged,
          page: next,
          hasMore: hasNext,
          ts: entry?.ts ?? Date.now(),
        });
        return merged;
      });
      setPage(next);
      setHasMore(hasNext);
    } catch (err) {
      console.error("Failed to load more script history", err);
      toast.error(extractApiError(err, "Failed to load more."));
    } finally {
      setLoadingMore(false);
    }
  };
  loadMoreRef.current = loadMore;

  // Fetch the next page when scrolled to 80% of the list (before the very end).
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (el.scrollHeight <= el.clientHeight) return;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight * 0.8) {
      loadMoreRef.current();
    }
  };

  const handlePick = (row: HistoryRow) => {
    if (!row.url) return;
    onPick({
      url: row.url,
      description: row.label,
      previzId: kind === "image" ? row.id : null,
      videoClipId: kind === "video" ? row.id : null,
    });
    onClose();
  };

  if (!open) return null;

  const emptyLabel = kind === "video" ? "No generated videos on this script yet." : "No images on this script yet.";

  return (
    <AnimatePresence>
      <motion.div
        key="video-history-picker-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.98, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.98, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <History className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">Pick from history</h2>
              <span className="text-xs text-[var(--text-muted)] truncate">— using as {roleLabel}</span>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-[var(--surface-hover)] rounded-md text-[var(--text-secondary)] transition-colors"
              aria-label="Close picker"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto p-4" onScroll={handleScroll}>
            {loading ? (
              <div className="flex items-center justify-center gap-1 py-16 text-[10px] text-[var(--text-muted)]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.3s]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.15s]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" />
              </div>
            ) : usable.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-[var(--text-muted)] gap-2">
                <ImageOff className="w-10 h-10 opacity-40" />
                <p className="text-sm">{emptyLabel}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {usable.map((row) => {
                  const label = row.label;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => handlePick(row)}
                      title={label ?? `#${row.id}`}
                      className="group bg-[var(--background)] border border-[var(--border)] hover:border-emerald-500 rounded-md overflow-hidden flex flex-col text-left transition-colors"
                    >
                      <div className="aspect-video relative bg-black/40">
                        {kind === "video" ? (
                          <video
                            src={row.url as string}
                            muted
                            playsInline
                            preload="metadata"
                            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                          />
                        ) : (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={row.url as string}
                            alt={label ?? `#${row.id}`}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                          />
                        )}
                        <span className="absolute inset-x-0 bottom-0 px-2 py-1 text-[9px] font-medium text-white bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity text-center">
                          {kind === "video" ? "Use this video" : "Use this image"}
                        </span>
                      </div>
                      {label ? (
                        <p className="p-1.5 text-[9px] text-[var(--text-secondary)] line-clamp-2">{label}</p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}

            {loadingMore && (
              <div className="flex items-center justify-center gap-1 py-4 text-[10px] text-[var(--text-muted)]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.3s]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.15s]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" />
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
