"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ImageOff, Check } from "lucide-react";
import { toast } from "react-toastify";
import { getPrevizHistory, PrevizSubjectKind } from "@/services/creative-hub";
import { extractApiError } from "@/lib/extract-api-error";

/**
 * Recent-Look rail: a 2-column grid of recent generations sized for the
 * narrow left rail (~280px). The container is bounded to roughly four
 * rows tall and infinite-scrolls inside itself — page scroll is never
 * extended. Click a thumbnail to apply it as the active look for the
 * current subject. Single primary action, no metadata footer.
 */

interface CompactHistoryStripProps {
    kind: PrevizSubjectKind;
    subjectId: number;
    activePrevizId: number | null | undefined;
    /** Apply the chosen previz to the current scene-character. Implemented
     * by the parent so the same strip can be re-used for other subjects. */
    onApply: (previzId: number) => Promise<void>;
    refreshKey?: number;
}

type Row = {
    id: number;
    image_url: string | null;
    created_at: string;
};

const PAGE_SIZE = 12;

export default function CompactHistoryStrip({
    kind,
    subjectId,
    activePrevizId,
    onApply,
    refreshKey = 0,
}: CompactHistoryStripProps) {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [applyingId, setApplyingId] = useState<number | null>(null);
    const [totalCount, setTotalCount] = useState(0);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    // The IntersectionObserver closure captures these once at observer-
    // creation time, so we mirror the freshest loadMore implementation
    // through a ref instead of tearing the observer down on every tick.
    const loadMoreRef = useRef<() => void>(() => {});
    const sentinelRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const result = await getPrevizHistory(kind, subjectId, 1, PAGE_SIZE);
                if (cancelled) return;
                setRows(
                    result.results.map((r) => ({
                        id: r.previsualization.id,
                        image_url: r.previsualization.image_url ?? null,
                        created_at: r.created_at,
                    })),
                );
                setTotalCount(result.count);
                setPage(1);
                setHasMore(!!result.next);
            } catch (err) {
                if (!cancelled) console.error("Failed to load compact history", err);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [kind, subjectId, refreshKey]);

    const loadMore = async () => {
        if (loadingMore || !hasMore) return;
        setLoadingMore(true);
        try {
            const next = page + 1;
            const result = await getPrevizHistory(kind, subjectId, next, PAGE_SIZE);
            const seen = new Set(rows.map((r) => r.id));
            const incoming = result.results
                .map((r) => ({
                    id: r.previsualization.id,
                    image_url: r.previsualization.image_url ?? null,
                    created_at: r.created_at,
                }))
                .filter((r) => !seen.has(r.id));
            setRows((prev) => [...prev, ...incoming]);
            setPage(next);
            setHasMore(!!result.next);
        } catch (err) {
            console.error("Failed to load more recent looks", err);
            toast.error(extractApiError(err, "Failed to load more."));
        } finally {
            setLoadingMore(false);
        }
    };

    loadMoreRef.current = loadMore;

    useEffect(() => {
        const el = sentinelRef.current;
        if (!el) return;
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        loadMoreRef.current();
                    }
                }
            },
            { rootMargin: "200px 0px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, rows.length]);

    const handleApply = async (previzId: number) => {
        if (previzId === activePrevizId) return;
        setApplyingId(previzId);
        try {
            await onApply(previzId);
        } catch (err) {
            toast.error(extractApiError(err, "Failed to apply image."));
        } finally {
            setApplyingId(null);
        }
    };

    if (loading && rows.length === 0) {
        return (
            <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] py-2">
                <Loader2 className="h-3 w-3 animate-spin" />
                Loading recent looks…
            </div>
        );
    }

    if (rows.length === 0) {
        return (
            <p className="text-[10px] text-[var(--text-muted)] italic py-2">
                No previous generations yet.
            </p>
        );
    }

    // 4 rows of square-ish thumbs at ~half-rail-width each. Rail is ~280px
    // wide minus the 24px container padding + 12px column gap, so each
    // thumb lands around 110px. aspect-square reads cleaner than 3/4 at
    // this size — full faces stay legible without forcing the user to
    // squint at narrow portrait crops.
    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                    Recent looks
                </p>
                <span className="text-[9px] text-[var(--text-muted)]">
                    {rows.length} of {totalCount}
                </span>
            </div>
            <div className="max-h-[440px] overflow-y-auto pr-1">
                <div className="grid grid-cols-2 gap-2">
                    {rows.map((r) => {
                        const isActive = r.id === activePrevizId;
                        const isApplying = applyingId === r.id;
                        return (
                            <button
                                key={r.id}
                                type="button"
                                onClick={() => handleApply(r.id)}
                                disabled={isActive || isApplying}
                                title={
                                    isActive
                                        ? "Currently active for this scene"
                                        : `Apply (created ${new Date(r.created_at).toLocaleDateString()})`
                                }
                                className={`relative aspect-square rounded-md overflow-hidden border-2 transition-all ${
                                    isActive
                                        ? "border-emerald-500 ring-2 ring-emerald-500/30 cursor-default"
                                        : "border-[var(--border)] hover:border-emerald-500/60 cursor-pointer"
                                } ${isApplying ? "opacity-50" : ""}`}
                            >
                                {r.image_url ? (
                                    <img
                                        src={r.image_url}
                                        alt=""
                                        loading="lazy"
                                        decoding="async"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-[var(--surface)] text-[var(--text-muted)]">
                                        <ImageOff className="h-3 w-3 opacity-50" />
                                    </div>
                                )}
                                {isActive && (
                                    <span className="absolute top-1 right-1 bg-emerald-500 text-black rounded-full p-0.5 shadow">
                                        <Check className="h-2.5 w-2.5" strokeWidth={3} />
                                    </span>
                                )}
                                {isApplying && (
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/40">
                                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
                {hasMore && (
                    <div
                        ref={sentinelRef}
                        className="flex items-center justify-center gap-1 py-2 text-[10px] text-[var(--text-muted)]"
                    >
                        <span className="inline-block w-1 h-1 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.3s]" />
                        <span className="inline-block w-1 h-1 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.15s]" />
                        <span className="inline-block w-1 h-1 rounded-full bg-[var(--text-muted)] animate-bounce" />
                    </div>
                )}
            </div>
        </div>
    );
}
