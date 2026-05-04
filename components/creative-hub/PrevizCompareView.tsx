import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { X, Check, GitCompare, ImageOff } from "lucide-react";
import { toast } from "react-toastify";

const MAX_SELECTED = 4;

type PrevizItem = {
  id: number;
  image_url?: string | null;
  assignment_date?: string | null;
  created_at?: string | null;
  aspect_ratio?: string | null;
  added_by?: { name?: string | null; email?: string | null } | null;
  [key: string]: unknown;
};

interface PrevizCompareViewProps {
  subjectId: number;
  subjectLabel?: string;
  previzList: PrevizItem[];
  activePrevizId: number | null | undefined;
  onClose: () => void;
  onSetActive: (previzId: number) => Promise<void>;
}

export default function PrevizCompareView({
  subjectLabel,
  previzList,
  activePrevizId,
  onClose,
  onSetActive,
}: PrevizCompareViewProps) {
  const [selectedIds, setSelectedIds] = useState<number[]>(() => {
    const ids: number[] = [];
    if (activePrevizId && previzList.some((p) => p.id === activePrevizId)) {
      ids.push(activePrevizId);
    }
    for (const p of previzList) {
      if (ids.length >= 2) break;
      if (!ids.includes(p.id)) ids.push(p.id);
    }
    return ids;
  });
  const [settingActiveId, setSettingActiveId] = useState<number | null>(null);

  const selectedPreviz = selectedIds
    .map((id) => previzList.find((p) => p.id === id))
    .filter(Boolean);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX_SELECTED) {
        toast.info(`Compare limit is ${MAX_SELECTED} — replaced oldest selection`);
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const handleSetActive = async (previzId: number) => {
    setSettingActiveId(previzId);
    try {
      await onSetActive(previzId);
    } finally {
      setSettingActiveId(null);
    }
  };

  const gridCols = (() => {
    const n = selectedPreviz.length;
    if (n <= 1) return "grid-cols-1";
    if (n === 2) return "grid-cols-1 md:grid-cols-2";
    if (n === 3) return "grid-cols-1 md:grid-cols-3";
    return "grid-cols-1 md:grid-cols-2";
  })();

  const formatDate = (raw?: string | number | null) => {
    if (!raw) return null;
    try {
      return new Date(raw).toLocaleString();
    } catch {
      return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="previz-compare-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-md flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex items-center gap-3 min-w-0">
            <GitCompare className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">Compare Previz</h2>
            {subjectLabel && (
              <span className="text-xs text-[var(--text-muted)]">— {subjectLabel}</span>
            )}
            <span className="text-[10px] text-[var(--text-muted)] px-2 py-0.5 rounded-full bg-[var(--surface-raised)]">
              {selectedPreviz.length}/{MAX_SELECTED} selected
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-[var(--surface-hover)] rounded-md text-[var(--text-secondary)] transition-colors"
            aria-label="Close compare view"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 flex overflow-hidden">
          {/* Left rail */}
          <aside className="w-56 flex-shrink-0 border-r border-[var(--border)] bg-[var(--surface)] overflow-y-auto p-3 space-y-2">
            <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 px-1">
              All Previz ({previzList.length})
            </h3>
            {previzList.map((previz) => {
              const isSelected = selectedIds.includes(previz.id);
              const isActive = previz.id === activePrevizId;
              const dateRaw = previz.assignment_date || previz.created_at;
              return (
                <button
                  key={previz.id}
                  onClick={() => toggleSelect(previz.id)}
                  className={`w-full text-left rounded-md border overflow-hidden transition-all ${
                    isSelected
                      ? "border-emerald-500 ring-1 ring-emerald-500/30"
                      : "border-[var(--border)] hover:border-[var(--border-hover)]"
                  }`}
                >
                  <div className="aspect-video relative bg-[var(--background)]">
                    {previz.image_url ? (
                      <img
                        src={previz.image_url}
                        alt={`Previz ${previz.id}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center text-[var(--text-muted)]">
                        <ImageOff className="w-4 h-4 opacity-50" />
                      </div>
                    )}
                    {isActive && (
                      <span className="absolute top-1 left-1 text-[8px] font-bold uppercase bg-emerald-500 text-black px-1.5 py-0.5 rounded">
                        Active
                      </span>
                    )}
                    {isSelected && (
                      <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center shadow">
                        <Check className="w-3 h-3" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <div className="px-2 py-1.5 text-[9px] text-[var(--text-muted)] flex items-center justify-between gap-1">
                    <span className="truncate">
                      {dateRaw ? new Date(dateRaw).toLocaleDateString() : `#${previz.id}`}
                    </span>
                    {previz.aspect_ratio && (
                      <span className="px-1 rounded bg-[var(--surface-raised)] text-[8px] flex-shrink-0">
                        {previz.aspect_ratio}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Main canvas */}
          <main className="flex-1 overflow-y-auto p-4">
            {selectedPreviz.length < 2 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-[var(--text-muted)] gap-2">
                <GitCompare className="w-10 h-10 opacity-40" />
                <p className="text-sm">
                  {selectedPreviz.length === 0
                    ? "Pick at least 2 previz from the rail to start comparing."
                    : "Pick one more previz to compare side-by-side."}
                </p>
              </div>
            ) : (
              <div className={`grid ${gridCols} gap-3 h-full auto-rows-fr`}>
                {selectedPreviz.map((previz) => {
                  if (!previz) return null;
                  const isActive = previz.id === activePrevizId;
                  const isSettingActive = settingActiveId === previz.id;
                  const dateRaw = previz.assignment_date || previz.created_at;
                  const author = previz.added_by?.name || previz.added_by?.email;
                  return (
                    <div
                      key={previz.id}
                      className={`flex flex-col bg-[var(--surface)] border rounded-md overflow-hidden min-h-0 ${
                        isActive
                          ? "border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
                          : "border-[var(--border)]"
                      }`}
                    >
                      <div className="flex-1 bg-black/40 flex items-center justify-center p-2 min-h-0">
                        {previz.image_url ? (
                          <img
                            src={previz.image_url}
                            alt={`Previz ${previz.id}`}
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="text-[var(--text-muted)] text-xs flex flex-col items-center gap-1">
                            <ImageOff className="w-6 h-6 opacity-40" />
                            <span>No image</span>
                          </div>
                        )}
                      </div>
                      <div className="p-3 border-t border-[var(--border)] flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-[10px] text-[var(--text-muted)] uppercase tracking-wider">
                            {isActive && (
                              <span className="text-emerald-400 font-bold">● Active</span>
                            )}
                            {previz.aspect_ratio && <span>{previz.aspect_ratio}</span>}
                            {dateRaw && (
                              <span className="truncate normal-case tracking-normal">
                                {formatDate(dateRaw)}
                              </span>
                            )}
                          </div>
                          {author && (
                            <p
                              className="text-[10px] text-[var(--text-secondary)] truncate mt-0.5"
                              title={author}
                            >
                              {author}
                            </p>
                          )}
                        </div>
                        <button
                          onClick={() => handleSetActive(previz.id)}
                          disabled={isActive || isSettingActive}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-3 py-1.5 rounded disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5 whitespace-nowrap flex-shrink-0"
                        >
                          {isSettingActive ? (
                            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white/30 border-t-white" />
                          ) : isActive ? (
                            <Check className="w-3 h-3" strokeWidth={3} />
                          ) : null}
                          {isActive ? "Active" : isSettingActive ? "Setting..." : "Set as Active"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
