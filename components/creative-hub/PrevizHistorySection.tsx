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

export default function PrevizHistorySection({
    kind,
    subjectId,
    subjectLabel,
    activePrevizId,
    onActivePrevizChange,
    refreshKey = 0,
}: PrevizHistorySectionProps) {
    const [history, setHistory] = useState<FlatPreviz[]>([]);
    const [loading, setLoading] = useState(false);
    const [settingActiveId, setSettingActiveId] = useState<number | null>(null);
    const [compareOpen, setCompareOpen] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const page = await getPrevizHistory(kind, subjectId);
                if (!cancelled) setHistory(flatten(page.results));
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
                        const author = previz.added_by?.name || previz.added_by?.email;
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
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[var(--text-muted)]">
                                            <ImageOff className="w-4 h-4 opacity-50" />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2 gap-2">
                                        <button
                                            disabled={isActive || isSetting}
                                            onClick={() => handleSetActive(previz.id)}
                                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-3 py-1.5 rounded disabled:opacity-50 disabled:bg-[var(--surface-raised)]"
                                        >
                                            {isActive
                                                ? "Active"
                                                : isSetting
                                                ? "Setting..."
                                                : "Set Active"}
                                        </button>
                                    </div>
                                </div>
                                <div className="p-2 border-t border-[var(--border)] flex flex-col gap-1">
                                    {author ? (
                                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                            <User className="w-3 h-3 text-emerald-500/80" />
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
                                    <div className="text-[8px] text-[var(--text-muted)]">
                                        {new Date(previz.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
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
