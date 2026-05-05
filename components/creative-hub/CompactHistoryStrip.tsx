"use client";

import { useEffect, useState } from "react";
import { Loader2, ImageOff, Check } from "lucide-react";
import { toast } from "react-toastify";
import { getPrevizHistory, PrevizSubjectKind } from "@/services/creative-hub";
import { extractApiError } from "@/lib/extract-api-error";

/**
 * Tight horizontal strip of recent generations. Click a thumbnail to apply
 * it as the active look for the current subject — single primary action,
 * no nested grid or metadata footer. Built for the SceneCharacter detail
 * page where the artist needs the history compact and out of the way of
 * the stylist tools on the right.
 */

interface CompactHistoryStripProps {
    kind: PrevizSubjectKind;
    subjectId: number;
    activePrevizId: number | null | undefined;
    /** Apply the chosen previz to the current scene-character. Implemented
     * by the parent so the same strip can be re-used for other subjects. */
    onApply: (previzId: number) => Promise<void>;
    refreshKey?: number;
    /** Show the most recent N rows. Default 8. */
    limit?: number;
}

type Row = {
    id: number;
    image_url: string | null;
    created_at: string;
};

export default function CompactHistoryStrip({
    kind,
    subjectId,
    activePrevizId,
    onApply,
    refreshKey = 0,
    limit = 8,
}: CompactHistoryStripProps) {
    const [rows, setRows] = useState<Row[]>([]);
    const [loading, setLoading] = useState(false);
    const [applyingId, setApplyingId] = useState<number | null>(null);
    const [totalCount, setTotalCount] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const page = await getPrevizHistory(kind, subjectId, 1, limit);
                if (cancelled) return;
                setRows(
                    page.results.map((r) => ({
                        id: r.previsualization.id,
                        image_url: r.previsualization.image_url ?? null,
                        created_at: r.created_at,
                    })),
                );
                setTotalCount(page.count);
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
    }, [kind, subjectId, refreshKey, limit]);

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
            <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
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
                            className={`relative w-16 h-16 flex-shrink-0 rounded-md overflow-hidden border-2 transition-all ${
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
                                <span className="absolute top-0.5 right-0.5 bg-emerald-500 text-black rounded-full p-0.5 shadow">
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
        </div>
    );
}
