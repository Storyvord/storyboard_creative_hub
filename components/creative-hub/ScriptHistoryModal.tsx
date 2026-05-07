import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { History, X, ImageOff, User, Clock } from "lucide-react";
import { toast } from "react-toastify";
import {
    getScriptPrevizHistory,
    setActiveSubjectPreviz,
    PrevizHistoryRow,
    PrevizSubjectKind,
} from "@/services/creative-hub";
import { extractApiError } from "@/lib/extract-api-error";

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
    /** Currently-active previz id on the parent page. Rows whose
     * `previsualization.id` matches this are rendered as already-applied
     * and their apply button is disabled. */
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

// Mirror PrevizHistorySection's author resolver — prefer name, fall back to
// email's local-part so the UI doesn't leak full addresses for unconfigured
// accounts.
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

// Produce a small badge string from the backend's `subject_summary` payload
// (shape varies by subject_type — see PrevizHistorySerializer.get_subject_summary).
const summarizeSubject = (row: PrevizHistoryRow): string => {
    const s = row.subject_summary || {};
    const subjectType = row.subject_type;
    if (subjectType === "character") {
        const name = s["name"];
        return `Character: ${typeof name === "string" && name ? name : "—"}`;
    }
    if (subjectType === "location") {
        const name = s["name"];
        return `Location: ${typeof name === "string" && name ? name : "—"}`;
    }
    if (subjectType === "scene_character") {
        const order = s["scene_order"];
        const charName = s["character_name"];
        const orderStr =
            typeof order === "number" ? String(order).padStart(2, "0") : "—";
        const charLabel =
            typeof charName === "string" && charName ? charName : "scene look";
        return `Scene ${orderStr} — ${charLabel}`;
    }
    if (subjectType === "shot") {
        const sceneOrder = s["scene_order"];
        const shotOrder = s["shot_order"];
        const so =
            typeof sceneOrder === "number"
                ? String(sceneOrder).padStart(2, "0")
                : "—";
        const sh =
            typeof shotOrder === "number" ? String(shotOrder) : "—";
        return `Shot ${sh} (Scene ${so})`;
    }
    return subjectType || "Unknown";
};

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
    const [rows, setRows] = useState<PrevizHistoryRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [settingId, setSettingId] = useState<number | null>(null);

    const loadMoreRef = useRef<() => void>(() => {});
    const sentinelRef = useRef<HTMLDivElement | null>(null);

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
                const result = await getScriptPrevizHistory(scriptId, { page: 1 });
                if (cancelled) return;
                setRows(result.results);
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
            const result = await getScriptPrevizHistory(scriptId, { page: next });
            // De-dupe in case rows shifted between fetches.
            const seen = new Set(rows.map((r) => r.id));
            const incoming = result.results.filter((r) => !seen.has(r.id));
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
            { rootMargin: "200px 0px" },
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [open, hasMore, rows.length]);

    const handleApply = async (row: PrevizHistoryRow) => {
        setSettingId(row.previsualization.id);
        try {
            await setActiveSubjectPreviz(
                currentKind,
                currentSubjectId,
                row.previsualization.id,
            );
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
                    className="bg-[var(--surface)] border border-[var(--border)] rounded-xl w-full max-w-5xl max-h-[88vh] flex flex-col shadow-2xl overflow-hidden"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)] flex-shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <History className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
                                Script Generation History
                            </h2>
                            {currentSubjectLabel && (
                                <span className="text-xs text-[var(--text-muted)] truncate">
                                    — applying to {currentSubjectLabel}
                                </span>
                            )}
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
                    <div className="flex-1 overflow-y-auto p-4">
                        {loading ? (
                            <div className="flex items-center justify-center gap-1 py-16 text-[10px] text-[var(--text-muted)]">
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.3s]" />
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce [animation-delay:-0.15s]" />
                                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--text-muted)] animate-bounce" />
                            </div>
                        ) : rows.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-center text-[var(--text-muted)] gap-2">
                                <ImageOff className="w-10 h-10 opacity-40" />
                                <p className="text-sm">No previz on this script yet.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                {rows.map((row) => {
                                    const previzId = row.previsualization.id;
                                    const isActive =
                                        currentActivePrevizId != null &&
                                        previzId === currentActivePrevizId;
                                    const isSetting = settingId === previzId;
                                    const author = displayAuthor(row.added_by);
                                    const subjectBadge = summarizeSubject(row);
                                    const created = new Date(row.created_at);
                                    return (
                                        <div
                                            key={row.id}
                                            className={`bg-[var(--background)] border rounded-md overflow-hidden flex flex-col ${
                                                isActive
                                                    ? "border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                                                    : "border-[var(--border)]"
                                            }`}
                                        >
                                            <div className="aspect-video relative bg-black/40">
                                                {row.previsualization.image_url ? (
                                                    <img
                                                        src={row.previsualization.image_url}
                                                        alt={`Previz ${previzId}`}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
                                                        <ImageOff className="w-5 h-5 opacity-50" />
                                                    </div>
                                                )}
                                                <span className="absolute top-1.5 left-1.5 text-[8px] font-semibold uppercase tracking-wider bg-black/70 backdrop-blur-sm border border-[var(--border)] text-[var(--text-secondary)] px-1.5 py-0.5 rounded max-w-[90%] truncate">
                                                    {subjectBadge}
                                                </span>
                                                {isActive && (
                                                    <span className="absolute top-1.5 right-1.5 text-[8px] font-bold uppercase bg-emerald-500 text-black px-1.5 py-0.5 rounded shadow">
                                                        Active
                                                    </span>
                                                )}
                                            </div>
                                            <div className="p-2.5 border-t border-[var(--border)] flex flex-col gap-2">
                                                <button
                                                    type="button"
                                                    disabled={isActive || isSetting}
                                                    onClick={() => handleApply(row)}
                                                    className={`w-full text-[10px] px-2 py-1.5 rounded font-medium transition-colors flex items-center justify-center gap-1 ${
                                                        isActive
                                                            ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 cursor-default"
                                                            : "bg-emerald-600 hover:bg-emerald-500 text-white"
                                                    } disabled:opacity-70`}
                                                >
                                                    {isSetting && (
                                                        <span className="inline-block w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    )}
                                                    {isActive
                                                        ? "Currently Active"
                                                        : isSetting
                                                          ? "Setting…"
                                                          : applyLabel}
                                                </button>
                                                <div className="flex items-center justify-between gap-2 text-[9px] text-[var(--text-muted)]">
                                                    {author ? (
                                                        <div className="flex items-center gap-1 min-w-0">
                                                            <User className="w-3 h-3 text-emerald-500/80 flex-shrink-0" />
                                                            <span className="truncate" title={author}>
                                                                {author}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1 text-[var(--text-muted)]">
                                                            <User className="w-3 h-3" />
                                                            <span>API Generated</span>
                                                        </div>
                                                    )}
                                                    <span className="flex items-center gap-1 flex-shrink-0">
                                                        <Clock className="w-3 h-3" />
                                                        {created.toLocaleDateString()}
                                                    </span>
                                                </div>
                                                {row.notes && (
                                                    <p className="text-[9px] text-[var(--text-secondary)] italic line-clamp-2">
                                                        {row.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
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
