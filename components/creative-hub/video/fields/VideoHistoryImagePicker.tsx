// STO-1854 — "From history" image picker for image-type media roles.
//
// Lets the user pick a source image for image_to_video / reference_to_video
// FROM the script's history instead of re-uploading. Uses the SAME data source
// as the Creative Space "View History" feed — `getScriptPrevisualizations`
// (/previsualization/list/?script_id=) — so every image visible in View History
// is pickable here. Filtered to rows with a non-null `image_url` (stills only —
// never a video). On pick we hand back the already-hosted URL + description; the
// caller appends it as UploadedMedia with null mime/bytes (no re-upload, payload
// unchanged).
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, ImageOff } from "lucide-react";
import { toast } from "react-toastify";
import { getScriptPrevisualizations } from "@/services/creative-hub";
import { extractApiError } from "@/lib/extract-api-error";

/** Minimal shape of a Previsualization row from the script-wide list. */
interface PrevizRow {
  id: number;
  image_url?: string | null;
  description?: string | null;
}

interface PickedHistoryImage {
  url: string;
  description: string | null;
  /** Source previz id — lets the backend re-sign a fresh URL at task time. */
  previzId: number | null;
}

interface VideoHistoryImagePickerProps {
  open: boolean;
  onClose: () => void;
  scriptId: number;
  /** Human label for the target role (e.g. "Start frame"). */
  roleLabel: string;
  onPick: (image: PickedHistoryImage) => void;
}

export default function VideoHistoryImagePicker({
  open,
  onClose,
  scriptId,
  roleLabel,
  onPick,
}: VideoHistoryImagePickerProps) {
  const [rows, setRows] = useState<PrevizRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const loadMoreRef = useRef<() => void>(() => {});
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Only stills are valid for an image role — never feed a non-image previz.
  const stills = rows.filter((r) => !!r.image_url);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setRows([]);
      setPage(1);
      setHasMore(false);
      try {
        const result = await getScriptPrevisualizations(scriptId, 1);
        if (cancelled) return;
        setRows((result.results ?? []) as PrevizRow[]);
        setHasMore(!!result.next);
        setPage(1);
      } catch (err) {
        if (!cancelled) {
          console.error("Failed to fetch script history", err);
          toast.error(extractApiError(err, "Failed to load script history."));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [open, scriptId]);

  const loadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    try {
      const next = page + 1;
      const result = await getScriptPrevisualizations(scriptId, next);
      const seen = new Set(rows.map((r) => r.id));
      const incoming = ((result.results ?? []) as PrevizRow[]).filter((r) => !seen.has(r.id));
      setRows((prev) => [...prev, ...incoming]);
      setPage(next);
      setHasMore(!!result.next);
    } catch (err) {
      console.error("Failed to load more script history", err);
      toast.error(extractApiError(err, "Failed to load more."));
    } finally {
      setLoadingMore(false);
    }
  };

  loadMoreRef.current = loadMore;

  useEffect(() => {
    if (!open) return;
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) loadMoreRef.current();
        }
      },
      { rootMargin: "200px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, hasMore, rows.length]);

  const handlePick = (row: PrevizRow) => {
    const url = row.image_url;
    if (!url) return;
    onPick({ url, description: row.description ?? null, previzId: row.id ?? null });
    onClose();
  };

  if (!open) return null;

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
              <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                Pick from history
              </h2>
              <span className="text-xs text-[var(--text-muted)] truncate">
                — using as {roleLabel}
              </span>
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
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="flex items-center justify-center gap-1 py-16 text-[10px] text-[var(--text-muted)]">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.3s]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.15s]" />
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" />
              </div>
            ) : stills.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center text-[var(--text-muted)] gap-2">
                <ImageOff className="w-10 h-10 opacity-40" />
                <p className="text-sm">No images on this script yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {stills.map((row) => {
                  const desc = row.description;
                  return (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => handlePick(row)}
                      title={desc ?? `Previz ${row.id}`}
                      className="group bg-[var(--background)] border border-[var(--border)] hover:border-emerald-500 rounded-md overflow-hidden flex flex-col text-left transition-colors"
                    >
                      <div className="aspect-video relative bg-black/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={row.image_url as string}
                          alt={desc ?? `Previz ${row.id}`}
                          loading="lazy"
                          decoding="async"
                          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                        />
                        <span className="absolute inset-x-0 bottom-0 px-2 py-1 text-[9px] font-medium text-white bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity text-center">
                          Use this image
                        </span>
                      </div>
                      {desc ? (
                        <p className="p-1.5 text-[9px] text-[var(--text-secondary)] line-clamp-2">
                          {desc}
                        </p>
                      ) : null}
                    </button>
                  );
                })}
              </div>
            )}

            {hasMore && !loading && (
              <div
                ref={sentinelRef}
                className="flex items-center justify-center gap-1 py-4 text-[10px] text-[var(--text-muted)]"
              >
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
