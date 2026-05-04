import { useEffect, useState } from "react";
import { Clock, GitCompare, User, ImageOff } from "lucide-react";
import { toast } from "react-toastify";
import {
    getPrevizHistory,
    setActiveSubjectPreviz,
    PrevizHistoryRow,
    PrevizSubjectKind,
} from "@/services/creative-hub";
import { extractApiError } from "@/lib/extract-api-error";
import PrevizCompareView from "@/components/creative-hub/PrevizCompareView";

interface PrevizHistorySectionProps {
    kind: PrevizSubjectKind;
    subjectId: number;
    subjectLabel?: string;
    activePrevizId: number | null | undefined;
    /** Called after a successful set-active so the parent can update its local state. */
    onActivePrevizChange?: (previzId: number, imageUrl: string | null) => void;
    /** Bumping this triggers a refetch (e.g., after a generation completes). */
    refreshKey?: number;
}

type FlatPreviz = {
    id: number;
    image_url: string | null;
    aspect_ratio: string | null;
    created_at: string;
    added_by: { name?: string | null; email?: string | null } | null;
    notes: string | null;
};

const flatten = (rows: PrevizHistoryRow[]): FlatPreviz[] =>
    rows.map((row) => ({
        id: row.previsualization.id,
        image_url: row.previsualization.image_url ?? null,
        aspect_ratio: row.previsualization.aspect_ratio ?? null,
        created_at: row.created_at,
        added_by: row.added_by,
        notes: row.notes ?? null,
    }));

// Prefer the user's display name; if the backend fell back to the email
// (no first/last name set on the account), surface only the username portion
// rather than the raw email so the UI reads cleaner.
const displayAuthor = (
    addedBy: { name?: string | null; email?: string | null } | null | undefined,
): string | null => {
    if (!addedBy) return null;
    const name = addedBy.name?.trim();
    const email = addedBy.email?.trim();
    if (name && name !== email) return name;
    if (email) return email.split("@")[0];
    return null;
};

export default function PrevizHistorySection({
    kind,
    subjectId,
    subjectLabel,
    activePrevizId,
    onActivePrevizChange,
    refreshKey = 0,
}: PrevizHistorySectionProps) {
    const PAGE_SIZE = 12;
    const [history, setHistory] = useState<FlatPreviz[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [settingActiveId, setSettingActiveId] = useState<number | null>(null);
    const [compareOpen, setCompareOpen] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const result = await getPrevizHistory(kind, subjectId, 1, PAGE_SIZE);
                if (cancelled) return;
                setHistory(flatten(result.results));
                setPage(1);
                setHasMore(!!result.next);
            } catch (err) {
                if (!cancelled) {
                    console.error("Failed to fetch previz history", err);
                }
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
            // Dedupe in case the active set has shifted between fetches.
            const seen = new Set(history.map((p) => p.id));
            const incoming = flatten(result.results).filter((p) => !seen.has(p.id));
            setHistory((prev) => [...prev, ...incoming]);
            setPage(next);
            setHasMore(!!result.next);
        } catch (err) {
            console.error("Failed to load more history", err);
            toast.error(extractApiError(err, "Failed to load more."));
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSetActive = async (previzId: number) => {
        setSettingActiveId(previzId);
        try {
            await setActiveSubjectPreviz(kind, subjectId, previzId);
            const matched = history.find((p) => p.id === previzId);
            toast.success("Active image updated");
            onActivePrevizChange?.(previzId, matched?.image_url ?? null);
        } catch (err) {
            console.error("Failed to set active previz", err);
            toast.error(extractApiError(err, "Failed to update active image."));
        } finally {
            setSettingActiveId(null);
        }
    };

    return (
        <section>
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                    <Clock className="h-3 w-3 text-emerald-500" />
                    Generation History
                </h3>
                <button
                    type="button"
                    onClick={() => setCompareOpen(true)}
                    disabled={history.length < 2}
                    title={
                        history.length < 2
                            ? "Need at least 2 generations to compare"
                            : "Compare side-by-side"
                    }
                    className="flex items-center gap-1 text-[10px] font-medium text-emerald-400 hover:text-emerald-300 disabled:text-[var(--text-muted)] disabled:cursor-not-allowed transition-colors"
                >
                    <GitCompare className="w-3 h-3" />
                    Compare
                </button>
            </div>

            {loading ? (
                <div className="text-[10px] text-[var(--text-muted)]">Loading...</div>
            ) : history.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                    {history.map((previz) => {
                        const isActive = previz.id === activePrevizId;
                        const isSetting = settingActiveId === previz.id;
                        const author = displayAuthor(previz.added_by);
                        return (
                            <div
                                key={previz.id}
                                className={`bg-[var(--background)] rounded-md overflow-hidden border ${
                                    isActive
                                        ? "border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                        : "border-[var(--border)]"
                                } group relative flex flex-col`}
                            >
                                <div className="aspect-video relative">
                                    {previz.image_url ? (
                                        <img
                                            src={previz.image_url}
                                            alt={`Generation ${previz.id}`}
                                            loading="lazy"
                                            decoding="async"
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                                            <ImageOff className="w-4 h-4 opacity-50" />
                                        </div>
                                    )}
                                    {isActive && (
                                        <span className="absolute top-1 left-1 text-[8px] font-bold uppercase bg-emerald-500 text-black px-1.5 py-0.5 rounded shadow">
                                            Active
                                        </span>
                                    )}
                                </div>
                                <div className="p-2 border-t border-[var(--border)] flex flex-col gap-2">
                                    <button
                                        type="button"
                                        disabled={isActive || isSetting}
                                        onClick={() => handleSetActive(previz.id)}
                                        className={`w-full text-[10px] px-2 py-1.5 rounded font-medium transition-colors flex items-center justify-center gap-1 ${
                                            isActive
                                                ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default"
                                                : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                        } disabled:opacity-70`}
                                    >
                                        {isSetting && (
                                            <span className="inline-block w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        )}
                                        {isActive ? "Active" : isSetting ? "Setting..." : "Set as Active"}
                                    </button>
                                    <div className="flex items-center justify-between gap-1">
                                        {author ? (
                                            <div className="flex items-center gap-1.5 text-[var(--text-secondary)] min-w-0">
                                                <User className="w-3 h-3 text-emerald-500/80 flex-shrink-0" />
                                                <span className="text-[9px] truncate" title={author}>
                                                    {author}
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                                                <User className="w-3 h-3" />
                                                <span className="text-[9px]">API Generated</span>
                                            </div>
                                        )}
                                        <span className="text-[8px] text-[var(--text-muted)] flex-shrink-0">
                                            {new Date(previz.created_at).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    {hasMore && (
                        <button
                            type="button"
                            onClick={loadMore}
                            disabled={loadingMore}
                            className="col-span-2 text-[10px] font-medium text-emerald-400 hover:text-emerald-300 disabled:text-[var(--text-muted)] disabled:cursor-not-allowed py-2 border border-dashed border-[var(--border)] rounded-md transition-colors flex items-center justify-center gap-1.5"
                        >
                            {loadingMore && (
                                <span className="inline-block w-2.5 h-2.5 border-2 border-emerald-400/30 border-t-emerald-400 rounded-full animate-spin" />
                            )}
                            {loadingMore ? "Loading…" : "Load more"}
                        </button>
                    )}
                </div>
            ) : (
                <p className="text-[10px] text-[var(--text-muted)]">No history yet.</p>
            )}

            {compareOpen && (
                <PrevizCompareView
                    subjectId={subjectId}
                    subjectLabel={subjectLabel}
                    previzList={history}
                    activePrevizId={activePrevizId ?? null}
                    onClose={() => setCompareOpen(false)}
                    onSetActive={handleSetActive}
                />
            )}
        </section>
    );
}
