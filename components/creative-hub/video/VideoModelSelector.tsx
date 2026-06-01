// STO-1854 — Video model picker (cloned from ModelSelector).
//
// Groups the catalog by `family`, lets the user pick a family then an
// `operation`. Status badges (active/beta/gated/deprecated) are shown; rows
// where `is_selectable===false` (gated/deprecated/disabled) are disabled.
import { useMemo, useState } from "react";
import { Loader2, Sparkles, X, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { VideoModel } from "@/types/video";
import { VideoFamily } from "@/hooks/useVideoCatalog";

interface VideoModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  families: VideoFamily[];
  loading: boolean;
  /** Currently-selected slug (to highlight on open). */
  selectedSlug?: string | null;
  onConfirm: (model: VideoModel) => void;
}

const OPERATION_LABELS: Record<string, string> = {
  text_to_video: "Text → Video",
  image_to_video: "Image → Video",
  reference_to_video: "Reference → Video",
  motion_control: "Motion Control",
  create_character: "Create Character",
};

function statusBadge(status: string): string {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    case "beta":
      return "bg-sky-500/15 text-sky-400 border-sky-500/30";
    case "gated":
      return "bg-amber-500/15 text-amber-400 border-amber-500/30";
    case "deprecated":
    case "disabled":
      return "bg-red-500/10 text-red-400/80 border-red-500/20";
    default:
      return "bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border-hover)]";
  }
}

export default function VideoModelSelector({
  isOpen,
  onClose,
  families,
  loading,
  selectedSlug,
  onConfirm,
}: VideoModelSelectorProps) {
  const initialFamily = useMemo(() => {
    if (selectedSlug) {
      const fam = families.find((f) => f.operations.some((o) => o.slug === selectedSlug));
      if (fam) return fam.family;
    }
    return families[0]?.family ?? null;
  }, [families, selectedSlug]);

  const [activeFamily, setActiveFamily] = useState<string | null>(initialFamily);

  if (!isOpen) return null;

  const family = families.find((f) => f.family === (activeFamily ?? initialFamily));

  return (
    <AnimatePresence>
      <motion.div
        key="video-model-selector-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0, y: 8 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[var(--surface)] border border-[var(--border)] rounded-md w-full max-w-2xl overflow-hidden shadow-2xl"
        >
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              Select Video Model
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-[var(--surface-hover)] rounded-md text-[var(--text-muted)] hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
            </div>
          ) : families.length === 0 ? (
            <p className="text-center text-[var(--text-muted)] py-8 text-xs">
              No video models available.
            </p>
          ) : (
            <div className="flex max-h-[420px]">
              {/* Family rail */}
              <div className="w-44 border-r border-[var(--border)] overflow-y-auto p-2 space-y-1 flex-shrink-0">
                {families.map((f) => (
                  <button
                    key={f.family}
                    onClick={() => setActiveFamily(f.family)}
                    className={`w-full text-left px-2.5 py-2 rounded-md text-xs transition-colors ${
                      (activeFamily ?? initialFamily) === f.family
                        ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                        : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] border border-transparent"
                    }`}
                  >
                    {f.label}
                    <span className="block text-[9px] text-[var(--text-muted)] mt-0.5">
                      {f.operations.length} operation{f.operations.length !== 1 ? "s" : ""}
                    </span>
                  </button>
                ))}
              </div>

              {/* Operation list */}
              <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
                {family?.operations.map((op) => {
                  const selectable = op.is_selectable;
                  const isSelected = op.slug === selectedSlug;
                  return (
                    <button
                      key={op.slug}
                      disabled={!selectable}
                      onClick={() => {
                        if (selectable) {
                          onConfirm(op);
                          onClose();
                        }
                      }}
                      className={`w-full text-left p-3 rounded-md border transition-all duration-150 ${
                        isSelected
                          ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/15"
                          : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-raised)]"
                      } ${selectable ? "" : "opacity-50 cursor-not-allowed"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {OPERATION_LABELS[op.operation] ?? op.operation}
                            </span>
                            <span
                              className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${statusBadge(op.status)}`}
                            >
                              {op.status}
                            </span>
                            {!selectable && <Lock className="w-3 h-3 text-[var(--text-muted)]" />}
                          </div>
                          <span className="text-[10px] text-[var(--text-muted)] font-mono block truncate">
                            {op.model_api_id}
                          </span>
                          {op.description ? (
                            <p className="text-[10px] text-[var(--text-muted)] mt-0.5 line-clamp-2">
                              {op.description}
                            </p>
                          ) : null}
                          {op.tags?.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {op.tags.slice(0, 4).map((t) => (
                                <span
                                  key={t}
                                  className="text-[8px] px-1 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-secondary)]"
                                >
                                  {t}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
