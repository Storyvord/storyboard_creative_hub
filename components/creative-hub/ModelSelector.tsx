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
  const estimatedCredits = selected ? selected.credits_per_image * itemCount : 0;

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "together": return "bg-violet-500/15 text-violet-400 border-violet-500/30";
      case "azure_foundry": return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "google": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      default: return "bg-[#1a1a1a] text-[#888] border-[#333]";
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
          className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-md w-full max-w-md overflow-hidden shadow-2xl"
        >
          {/* Header */}
          <div className="p-4 border-b border-[#1a1a1a] flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-emerald-400" />
              {title}
            </h3>
            <button onClick={onClose} className="p-1.5 hover:bg-[#1a1a1a] rounded-md text-[#555] hover:text-white transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-4 space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 animate-spin text-[#444]" />
              </div>
            ) : models.length === 0 ? (
              <p className="text-center text-[#555] py-4 text-xs">No models available</p>
            ) : (
              <>
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                  {[...models].sort((a, b) => b.credits_per_image - a.credits_per_image).map((model, idx) => (
                    <button
                      key={model.model_name}
                      onClick={() => setSelectedIndex(idx)}
                      className={`w-full text-left p-3 rounded-md border transition-all duration-150 ${
                        idx === selectedIndex
                          ? "bg-emerald-500/10 border-emerald-500/30 ring-1 ring-emerald-500/15"
                          : "bg-[#111] border-[#1a1a1a] hover:border-[#333] hover:bg-[#161616]"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-xs font-semibold text-white truncate">
                              {getModelDisplayName(model.model_name)}
                            </span>
                            <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded border ${getProviderColor(model.provider)}`}>
                              {model.provider}
                            </span>
                          </div>
                          <span className="text-[10px] text-[#444] font-mono">{model.model_name}</span>
                        </div>
                        <div className="flex flex-col items-end ml-3 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span className="text-xs font-bold text-amber-400">{model.credits_per_image}</span>
                          </div>
                          <span className="text-[9px] text-[#444]">credits</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Cost Summary */}
                <div className="bg-[#111] rounded-md p-3 border border-[#1a1a1a]">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-[10px] text-[#555] block">Estimated Cost</span>
                      <span className="text-xs text-[#999]">
                        {itemCount} image{itemCount > 1 ? "s" : ""} × {selected?.credits_per_image || 0} credits
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-lg font-bold text-white">{estimatedCredits}</span>
                      </div>
                      <span className="text-[9px] text-[#555]">total</span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#1a1a1a] flex justify-end gap-2">
            <button onClick={onClose} className="px-3 py-2 text-xs text-[#888] hover:text-white transition-colors">
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
