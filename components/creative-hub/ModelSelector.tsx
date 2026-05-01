import { useState, useEffect } from "react";
import { getImageModels, ImageModel } from "@/services/creative-hub";
import { Loader2, Zap, Sparkles, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ModelSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (model: string, provider: string) => void;
  itemCount: number;
  title?: string;
  confirmLabel?: string;
}

export default function ModelSelector({
  isOpen, onClose, onConfirm, itemCount,
  title = "Select AI Model", confirmLabel = "Generate",
}: ModelSelectorProps) {
  const [models, setModels] = useState<ImageModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getImageModels()
        .then((data) => { setModels(data); setSelectedIndex(0); })
        .catch((err) => console.error("Failed to fetch models", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selected = models[selectedIndex];
  const selectedMin = selected?.credits_per_image_min ?? selected?.credits_per_image ?? 0;
  const selectedMax = selected?.credits_per_image_max ?? selected?.credits_per_image ?? 0;
  const estimatedCreditsMin = selectedMin * itemCount;
  const estimatedCreditsMax = selectedMax * itemCount;
  const showRange = !!selected?.has_variants && selectedMin !== selectedMax;

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "together": return "bg-violet-500/15 text-violet-400 border-violet-500/30";
      case "azure_foundry": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "google": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      default: return "bg-[var(--surface-hover)] text-[var(--text-secondary)] border-[var(--border-hover)]";
    }
  };

  const getModelDisplayName = (modelName: string) => {
    const parts = modelName.split("/");
    const name = parts[parts.length - 1];
    return name.replace(/-/g, " ").replace(/\./g, ".").replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <AnimatePresence>
      <motion.div
        key="model-selector-overlay"
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
          className="bg-[var(--surface)] border border-[var(--border)] rounded-md w-full max-w-md overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-[var(--border)] flex justify-between items-center">
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              {title}
            </h3>
            <button onClick={onClose} className="p-1.5 hover:bg-[var(--surface-hover)] rounded-md text-[var(--text-muted)] hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--text-muted)]" />
              </div>
            ) : models.length === 0 ? (
              <p className="text-center text-[var(--text-muted)] py-4 text-xs">No models available</p>
            ) : (
              <>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {[...models]
                    .sort((a, b) => (b.credits_per_image_max ?? b.credits_per_image) - (a.credits_per_image_max ?? a.credits_per_image))
                    .map((model, idx) => {
                      const minCr = model.credits_per_image_min ?? model.credits_per_image;
                      const maxCr = model.credits_per_image_max ?? model.credits_per_image;
                      const isRange = !!model.has_variants && minCr !== maxCr;
                      return (
                        <button
                          key={`${model.model_name}-${model.provider}`}
                          onClick={() => setSelectedIndex(idx)}
                          className={`w-full text-left p-3 rounded-md border transition-all duration-150 ${
                            idx === selectedIndex
                              ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/15"
                              : "bg-[var(--surface)] border-[var(--border)] hover:border-[var(--border-hover)] hover:bg-[var(--surface-raised)]"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <span className="text-xs font-semibold text-[var(--text-primary)] truncate">
                                  {model.display_name || getModelDisplayName(model.model_name)}
                                </span>
                                <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${getProviderColor(model.provider)}`}>
                                  {model.provider}
                                </span>
                              </div>
                              <span className="text-[10px] text-[var(--text-muted)] font-mono">{model.model_name}</span>
                              {(model.credits_per_input_image ?? 0) > 0 && (
                                <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                  + {model.credits_per_input_image} cr per reference image
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col items-end ml-3 flex-shrink-0">
                              <div className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-400" />
                                <span className="text-xs font-bold text-amber-400">
                                  {isRange ? `${minCr}–${maxCr}` : maxCr}
                                </span>
                              </div>
                              <span className="text-[9px] text-[var(--text-muted)]">
                                credits{isRange ? " / image" : ""}
                              </span>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                </div>

                {/* Cost Summary */}
                <div className="bg-[var(--surface)] rounded-md p-3 border border-[var(--border)]">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">Estimated Cost</span>
                      <span className="text-xs text-[var(--text-secondary)]">
                        {itemCount} image{itemCount > 1 ? "s" : ""} ×{" "}
                        {showRange ? `${selectedMin}–${selectedMax}` : selectedMax} credits
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-lg font-bold text-[var(--text-primary)]">
                          {showRange
                            ? `${estimatedCreditsMin}–${estimatedCreditsMax}`
                            : estimatedCreditsMax}
                        </span>
                      </div>
                      <span className="text-[9px] text-[var(--text-muted)]">
                        {showRange ? "range" : "total"}
                      </span>
                    </div>
                  </div>
                  {showRange && (
                    <div className="mt-2 pt-2 border-t border-[var(--border)] text-[10px] text-[var(--text-muted)]">
                      Final cost depends on quality &amp; resolution selected at generation time.
                    </div>
                  )}
                  {(selected?.credits_per_input_image ?? 0) > 0 && (
                    <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                      Reference images add {selected?.credits_per_input_image} credit
                      {(selected?.credits_per_input_image ?? 0) > 1 ? "s" : ""} each.
                    </div>
                  )}
                  {selected?.supported_qualities && selected.supported_qualities.length > 0 && (
                    <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                      Quality options:{" "}
                      <span className="text-[var(--text-secondary)]">
                        {selected.supported_qualities.join(" · ")}
                      </span>
                    </div>
                  )}
                  {selected?.supported_resolutions && selected.supported_resolutions.length > 0 && (
                    <div className="mt-1 text-[10px] text-[var(--text-muted)]">
                      Resolutions:{" "}
                      <span className="text-[var(--text-secondary)]">
                        {selected.supported_resolutions.join(" · ")}
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[var(--border)] flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 text-xs text-[var(--text-secondary)] hover:text-white transition-colors">
              Cancel
            </button>
            <button
              onClick={() => { if (selected) onConfirm(selected.model_name, selected.provider); }}
              disabled={loading || models.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-medium transition-all disabled:opacity-30 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
