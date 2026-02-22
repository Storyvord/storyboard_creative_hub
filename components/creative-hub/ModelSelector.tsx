import { useState, useEffect, useRef } from "react";
import { getImageModels, ImageModel } from "@/services/creative-hub";
import { Loader2, ChevronDown, Zap, Sparkles, X } from "lucide-react";
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
  isOpen,
  onClose,
  onConfirm,
  itemCount,
  title = "Select AI Model",
  confirmLabel = "Generate",
}: ModelSelectorProps) {
  const [models, setModels] = useState<ImageModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getImageModels()
        .then((data) => {
          setModels(data);
          setSelectedIndex(0);
        })
        .catch((err) => console.error("Failed to fetch models", err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const selected = models[selectedIndex];
  const estimatedCredits = selected ? selected.credits_per_image * itemCount : 0;

  const getProviderColor = (provider: string) => {
    switch (provider.toLowerCase()) {
      case "together":
        return "bg-violet-500/15 text-violet-400 border-violet-500/30";
      case "azure_foundry":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "google":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      default:
        return "bg-gray-500/15 text-gray-400 border-gray-500/30";
    }
  };

  const getModelDisplayName = (modelName: string) => {
    // Extract readable part: "black-forest-labs/FLUX.2-pro" -> "FLUX.2 Pro"
    const parts = modelName.split("/");
    const name = parts[parts.length - 1];
    return name
      .replace(/-/g, " ")
      .replace(/\./g, ".")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl shadow-black/50"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-800 flex justify-between items-center">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-800 rounded-lg text-gray-500 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-indigo-400" />
              </div>
            ) : models.length === 0 ? (
              <p className="text-center text-gray-500 py-4 text-sm">
                No models available
              </p>
            ) : (
              <>
                {/* Model Cards — fixed-height scrollable list (shows ~5 items) */}
                <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                  {[...models].sort((a, b) => b.credits_per_image - a.credits_per_image).map((model, idx) => {
                    const originalIdx = models.indexOf(model);
                    return (
                    <button
                      key={model.model_name}
                      onClick={() => setSelectedIndex(idx)}
                      className={`w-full text-left p-3.5 rounded-xl border transition-all duration-200 ${
                        idx === selectedIndex
                          ? "bg-indigo-500/10 border-indigo-500/40 ring-1 ring-indigo-500/20"
                          : "bg-gray-800/50 border-gray-800 hover:border-gray-700 hover:bg-gray-800"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-sm font-semibold text-white truncate">
                              {getModelDisplayName(model.model_name)}
                            </span>
                            <span
                              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${getProviderColor(
                                model.provider
                              )}`}
                            >
                              {model.provider}
                            </span>
                          </div>
                          <span className="text-[11px] text-gray-500 font-mono">
                            {model.model_name}
                          </span>
                        </div>
                        <div className="flex flex-col items-end ml-3 flex-shrink-0">
                          <div className="flex items-center gap-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span className="text-sm font-bold text-amber-400">
                              {model.credits_per_image}
                            </span>
                          </div>
                          <span className="text-[10px] text-gray-600">
                            credits/image
                          </span>
                        </div>
                      </div>
                    </button>
                    );
                  })}
                </div>

                {/* Cost Summary */}
                <div className="bg-gray-800/60 rounded-xl p-4 border border-gray-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="text-xs text-gray-500 block">
                        Estimated Cost
                      </span>
                      <span className="text-sm text-gray-300">
                        {itemCount} image{itemCount > 1 ? "s" : ""} ×{" "}
                        {selected?.credits_per_image || 0} credits
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1.5">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-xl font-bold text-white">
                          {estimatedCredits}
                        </span>
                      </div>
                      <span className="text-[10px] text-gray-500">
                        total credits
                      </span>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-5 border-t border-gray-800 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (selected) {
                  onConfirm(selected.model_name, selected.provider);
                }
              }}
              disabled={loading || models.length === 0}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              {confirmLabel}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
