import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, ImageOff, Check } from "lucide-react";
import { toast } from "react-toastify";
import {
    getScriptPrevisualizations,
    setActiveSubjectPreviz,
    PrevizSubjectKind,
} from "@/services/creative-hub";
import { extractApiError } from "@/lib/extract-api-error";
import {
    MASONRY_COLS,
    parseAspectRatio,
    isReferencePreviz,
    groupByDay,
} from "@/lib/history-gallery";

interface ScriptHistoryModalProps {
    open: boolean;
    onClose: () => void;
    scriptId: number;
    currentKind: PrevizSubjectKind;
    currentSubjectId: number;
    /** Optional human label for the current subject (used in the apply
     * button copy: "Set as Active for <label>"). Falls back to a generic
     * kind label when omitted. */
    currentSubjectLabel?: string;
    /** Currently-active previz id on the parent page. The matching tile is
     * rendered as already-applied and its action button is disabled. */
    currentActivePrevizId?: number | null;
    /** Bumped on the parent so the per-subject strip can refetch. */
    onApplied?: () => void;
}

const KIND_LABEL: Record<PrevizSubjectKind, string> = {
    character: "character",
    scene_character: "scene look",
    location: "location",
    shot: "shot",
};

// Flat previz row from the whole-script previz list — the same source the
// Creative Space "View History" feed uses, so Creative Space generations
// (which have no Character/Location/Shot subject) appear here too.
interface PrevizRow {
    id: number;
    image_url: string | null;
    aspect_ratio: string | null;
    created_at: string;
    description: string | null;
    notes: string | null;
}

const mapRow = (x: Record<string, unknown>): PrevizRow => ({
    id: Number(x.id),
    image_url: (x.image_url as string | null) ?? null,
    aspect_ratio: (x.aspect_ratio as string | null) ?? null,
    created_at: (x.created_at as string) ?? "",
    description:
        (x.description as string | null) ?? (x.prompt as string | null) ?? null,
    notes: (x.notes as string | null) ?? null,
});

export default function ScriptHistoryModal({
    open,
    onClose,
    scriptId,
    currentKind,
    currentSubjectId,
    currentSubjectLabel,
    currentActivePrevizId,
    onApplied,
}: ScriptHistoryModalProps) {
    const [rows, setRows] = useState<PrevizRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [settingId, setSettingId] = useState<number | null>(null);

    const loadMoreRef = useRef<() => void>(() => {});
    const sentinelRef = useRef<HTMLDivElement | null>(null);
    // The grid scrolls inside the modal body, not the page. The observer
    // must use that body as its root — watching the viewport (the default)
    // never sees the sentinel move, so paging stalls after page 1.
    const scrollRootRef = useRef<HTMLDivElement | null>(null);

    // Reset + load page 1 whenever the modal opens (or scriptId changes).
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
                setRows(result.results.map(mapRow));
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
            // De-dupe in case rows shifted between fetches.
            const seen = new Set(rows.map((r) => r.id));
            const incoming = result.results
                .map(mapRow)
                .filter((r) => !seen.has(r.id));
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

    // Keep ref pointing at freshest closure so the IO callback (created once
    // per sentinel mount) always invokes up-to-date paging logic.
    loadMoreRef.current = loadMore;

    // IntersectionObserver sentinel — only mount when there's more to load
    // and the modal is open; otherwise the sentinel ref is never hit.
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
            { root: scrollRootRef.current, rootMargin: "200px 0px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [open, hasMore, rows.length]);

    // When a page doesn't fill the scroll area there's nothing to scroll, so
    // the sentinel never leaves/re-enters the viewport and infinite scroll
    // never starts — keep pulling pages until the content overflows (or we
    // run out). loadMore's own guard de-dupes against the observer firing too.
    useEffect(() => {
        if (!open || loading || loadingMore || !hasMore) return;
        const el = scrollRootRef.current;
        if (!el) return;
        if (el.scrollHeight <= el.clientHeight) loadMoreRef.current();
    }, [open, rows.length, hasMore, loading, loadingMore]);

    const handleApply = async (row: PrevizRow) => {
        if (row.id === currentActivePrevizId) return;
        setSettingId(row.id);
        try {
            await setActiveSubjectPreviz(currentKind, currentSubjectId, row.id);
            toast.success("Active image updated");
            onApplied?.();
        } catch (err) {
            console.error("Failed to set active previz", err);
            toast.error(extractApiError(err, "Failed to set active image"));
        } finally {
            setSettingId(null);
        }
    };

    const applyLabel = (() => {
        if (currentSubjectLabel) return `Set as Active for ${currentSubjectLabel}`;
        return `Set as Active for this ${KIND_LABEL[currentKind]}`;
    })();

    if (!open) return null;

    // Only tiles with a rendered image; grouped by day (newest day first).
    const withImages = rows.filter((r) => !!r.image_url);
    const groups = groupByDay(withImages, (r) => r.created_at);

    return (
        <AnimatePresence>
            <motion.div
                key="script-history-overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ opacity: 0, scale: 0.98, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98, y: 8 }}
                    transition={{ duration: 0.15 }}
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-xl w-full max-w-6xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                            <History className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <h2 className="text-sm font-semibold text-[var(--text-primary)] truncate">
                                Script Generation History
                            </h2>
                            <span className="text-[11px] text-[var(--text-muted)] truncate">
                                — every previz on this script
                            </span>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="p-1.5 hover:bg-[var(--surface-hover)] rounded-md text-[var(--text-secondary)] transition-colors"
                            aria-label="Close history"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Body */}
                    <div ref={scrollRootRef} className="flex-1 overflow-y-auto p-4">
                        {loading ? (
                            <div className="flex items-center justify-center gap-1 py-16 text-[10px] text-[var(--text-muted)]">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.3s]" />
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.15s]" />
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" />
                            </div>
                        ) : withImages.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center text-[var(--text-muted)] gap-2">
                                <ImageOff className="w-10 h-10 opacity-40" />
                                <p className="text-sm">No previz on this script yet.</p>
                            </div>
                        ) : (
                            <div className="flex flex-col gap-8">
                                {groups.map((group) => (
                                    <section key={group.label}>
                                        <div className="mb-3 flex items-center gap-4">
                                            <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                                                {group.label}
                                            </span>
                                            <div className="h-px flex-1 bg-[var(--border)]" />
                                        </div>
                                        <div className={MASONRY_COLS}>
                                            {group.items.map((row) => (
                                                <HistoryTile
                                                    key={row.id}
                                                    row={row}
                                                    isActive={
                                                        currentActivePrevizId != null &&
                                                        row.id === currentActivePrevizId
                                                    }
                                                    isSetting={settingId === row.id}
                                                    applyLabel={applyLabel}
                                                    onApply={() => handleApply(row)}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                ))}
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

// A single masonry tile — just the image at its natural aspect ratio, with a
// hover "Set as Active" action. No author / created-date / subject footer.
function HistoryTile({
    row,
    isActive,
    isSetting,
    applyLabel,
    onApply,
}: {
    row: PrevizRow;
    isActive: boolean;
    isSetting: boolean;
    applyLabel: string;
    onApply: () => void;
}) {
    const { w, h } = parseAspectRatio(row.aspect_ratio);
    // Start from the declared ratio (placeholder to avoid load jank), then
    // correct to the natural dimensions on load so each tile renders at its
    // true aspect ratio with no letterbox.
    const [ratio, setRatio] = useState(w / h);
    const isRef = isReferencePreviz(row);

    return (
        <div
            style={{ aspectRatio: ratio }}
            title={row.description ?? undefined}
            className={
                "group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-md border bg-[var(--background)] transition-colors " +
                (isActive
                    ? "border-emerald-500 ring-2 ring-emerald-500/30"
                    : "border-[var(--border)] hover:border-emerald-500/50")
            }
        >
            {row.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                    src={row.image_url}
                    alt=""
                    loading="lazy"
                    decoding="async"
                    onLoad={(e) => {
                        const t = e.currentTarget;
                        if (t.naturalWidth > 0 && t.naturalHeight > 0)
                            setRatio(t.naturalWidth / t.naturalHeight);
                    }}
                    className="h-full w-full object-cover"
                />
            ) : (
                <div className="flex h-full w-full items-center justify-center text-[var(--text-muted)]">
                    <ImageOff className="w-5 h-5 opacity-50" />
                </div>
            )}

            {isRef && (
                <span className="absolute left-1.5 bottom-1.5 z-10 text-[8px] font-bold uppercase bg-blue-500 text-white px-1.5 py-0.5 rounded shadow">
                    Reference
                </span>
            )}
            {isActive && (
                <span className="absolute left-1.5 top-1.5 z-10 flex items-center gap-1 text-[8px] font-bold uppercase bg-emerald-500 text-black px-1.5 py-0.5 rounded shadow">
                    <Check className="w-2.5 h-2.5" strokeWidth={3} />
                    Active
                </span>
            )}

            {/* Hover action — set this image as the subject's active previz. */}
            <div
                className={
                    "absolute inset-x-0 bottom-0 flex items-end justify-center p-2 bg-gradient-to-t from-black/80 to-transparent transition-opacity " +
                    (isActive ? "opacity-0" : "opacity-0 group-hover:opacity-100")
                }
            >
                <button
                    type="button"
                    disabled={isActive || isSetting}
                    onClick={onApply}
                    className="w-full text-[10px] px-2 py-1.5 rounded font-medium transition-colors flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-70"
                >
                    {isSetting && (
                        <span className="inline-block w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    )}
                    {isSetting ? "Setting…" : applyLabel}
                </button>
            </div>
        </div>
    );
}
