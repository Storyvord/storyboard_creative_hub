"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RefreshCw, Loader2, Plus, Edit2, Minus, AlertTriangle, History, Trash2, Check, RotateCcw } from "lucide-react";
import { SceneSyncDiff } from "@/types/creative-hub";
import { getSceneSyncPreview, confirmSceneSync, discardSceneChanges } from "@/services/creative-hub";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";

interface SceneSyncPreviewModalProps {
  scriptId: number;
  preloadedDiff?: SceneSyncDiff | null;
  onClose: () => void;
  onSynced: () => void;
}

const CHANGE_LABELS: Record<string, string> = {
  action: "Action/Description",
  scene_name: "Scene Name",
  location: "Location",
  time_of_day: "Time of Day",
  dialogue: "Dialogue",
};

export default function SceneSyncPreviewModal({
  scriptId,
  preloadedDiff,
  onClose,
  onSynced,
}: SceneSyncPreviewModalProps) {
  const [diff, setDiff] = useState<SceneSyncDiff | null>(preloadedDiff ?? null);
  const [loading, setLoading] = useState(!preloadedDiff);
  const [confirming, setConfirming] = useState(false);
  const [discarding, setDiscarding] = useState(false);
  // Per-scene shot action: "keep" (default) or "delete"
  const [shotActions, setShotActions] = useState<Record<number, "keep" | "delete">>({});

  // Auto-fetch the diff when the modal opens without a preloaded diff
  useEffect(() => {
    if (!preloadedDiff) {
      getSceneSyncPreview(scriptId)
        .then(data => { setDiff(data); setShotActions({}); })
        .catch(() => {})
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getShotAction = (sceneId: number): "keep" | "delete" =>
    shotActions[sceneId] ?? "keep";

  const toggleShotAction = (sceneId: number) => {
    setShotActions((prev) => ({
      ...prev,
      [sceneId]: prev[sceneId] === "keep" ? "delete" : "keep",
    }));
  };

  const loadPreview = async () => {
    setLoading(true);
    try {
      const data = await getSceneSyncPreview(scriptId);
      setDiff(data);
      setShotActions({});
    } catch (error) {
      toast.error(extractApiError(error, "Failed to load sync preview."));
    } finally {
      setLoading(false);
    }
  };

  const handleDiscard = async () => {
    setDiscarding(true);
    try {
      await discardSceneChanges(scriptId);
      toast.success("Script content reverted to match current scenes.");
      onSynced(); // refresh parent so script content reloads
      onClose();
    } catch (error) {
      toast.error(extractApiError(error, "Failed to discard changes."));
    } finally {
      setDiscarding(false);
    }
  };

  const handleConfirm = async () => {
    setConfirming(true);
    try {
      // Send the chosen action for every scene with shots (default is "keep")
      const actionsToSend: Record<number, "keep" | "delete"> = {};
      if (diff) {
        for (const s of diff.updated_scenes) {
          if (s.shot_count > 0) {
            actionsToSend[s.scene_id] = getShotAction(s.scene_id);
          }
        }
      }
      const result = await confirmSceneSync(scriptId, actionsToSend);
      toast.success(`Synced ${result.scenes_synced} scenes successfully.`);
      onSynced();
      onClose();
    } catch (error) {
      toast.error(extractApiError(error, "Failed to apply sync."));
    } finally {
      setConfirming(false);
    }
  };

  const hasChanges = diff && (
    diff.new_scenes.length > 0 ||
    diff.updated_scenes.length > 0 ||
    diff.deleted_scenes.length > 0
  );

  // Total shots that will be deleted from removed scenes (updated scenes handled per-scene)
  const totalShotsAffected = diff
    ? diff.deleted_scenes.reduce((sum, s) => sum + (s.shot_count || 0), 0)
    : 0;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-md w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-5 border-b border-[#1a1a1a] flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <RefreshCw className="h-5 w-5 text-emerald-400" />
                Re-sync Scenes
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Review what will change before applying.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1a1a1a] rounded-md text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {!diff ? (
              <div className="flex flex-col items-center justify-center py-12 gap-4">
                <p className="text-gray-400 text-sm text-center max-w-xs">
                  Preview changes before re-parsing scenes from the current script file.
                </p>
                <button
                  onClick={loadPreview}
                  disabled={loading}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  Load Preview
                </button>
              </div>
            ) : (
              <>
                {/* Summary counters */}
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: "New", count: diff.new_scenes.length, color: "text-gray-300", bg: "bg-gray-500/10 border-gray-500/20" },
                    { label: "Edited", count: diff.updated_scenes.length, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
                    { label: "Removed", count: diff.deleted_scenes.length, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20" },
                    { label: "Unchanged", count: diff.unchanged_scenes.length, color: "text-gray-500", bg: "bg-[#1a1a1a]/50 border-[#1a1a1a]" },
                  ].map(({ label, count, color, bg }) => (
                    <div key={label} className={`rounded-md border p-3 text-center ${bg}`}>
                      <p className={`text-2xl font-bold ${color}`}>{count}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>

                {/* Destructive warning */}
                {(diff.deleted_scenes.length > 0 || diff.updated_scenes.length > 0) && (
                  <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-amber-300 font-medium">
                        Destructive changes — please read before confirming
                      </div>
                    </div>
                    <ul className="text-xs text-amber-200/70 space-y-1 pl-6 list-disc">
                      {diff.deleted_scenes.length > 0 && (
                        <li>
                          <strong>{diff.deleted_scenes.length} scene{diff.deleted_scenes.length !== 1 ? "s" : ""}</strong> will be permanently deleted.
                        </li>
                      )}
                      {diff.updated_scenes.length > 0 && (
                        <li>
                          <strong>{diff.updated_scenes.length} scene{diff.updated_scenes.length !== 1 ? "s" : ""}</strong> will be updated with new content. Choose shot handling per scene below.
                        </li>
                      )}
                      {totalShotsAffected > 0 && (
                        <li>
                          Shots on <strong>deleted scenes</strong> will be removed (previz history is preserved).
                        </li>
                      )}
                    </ul>
                    <div className="flex items-center gap-2 pl-6 mt-1">
                      <History className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                      <p className="text-xs text-emerald-400">
                        All Previsualization data will remain accessible in the <strong>History</strong> section.
                      </p>
                    </div>
                  </div>
                )}

                {/* New scenes */}
                {diff.new_scenes.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-1.5 mb-2">
                      <Plus className="h-4 w-4" /> New Scenes
                    </h3>
                    <div className="space-y-1.5">
                      {diff.new_scenes.map((s, i) => (
                        <div key={i} className="flex items-start gap-3 text-sm bg-gray-500/5 border border-gray-500/15 rounded px-3 py-2">
                          <span className="text-gray-500 font-mono text-xs mt-0.5">#{s.order}</span>
                          <div className="min-w-0">
                            <p className="text-gray-300 font-medium truncate">{s.scene_name}</p>
                            {s.description && (
                              <p className="text-gray-600 text-xs line-clamp-1 mt-0.5">{s.description}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Updated scenes */}
                {diff.updated_scenes.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-orange-400 flex items-center gap-1.5 mb-2">
                      <Edit2 className="h-4 w-4" /> Edited Scenes
                    </h3>
                    <div className="space-y-1.5">
                      {diff.updated_scenes.map((s, i) => {
                        const action = getShotAction(s.scene_id);
                        return (
                          <div key={i} className="bg-orange-500/5 border border-orange-500/15 rounded px-3 py-2.5 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-orange-500/70 font-mono text-xs flex-shrink-0">#{s.order}</span>
                                <span className="text-orange-200 text-sm font-medium truncate">{s.scene_name}</span>
                              </div>
                            </div>
                            {s.changes.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {s.changes.map((c, j) => (
                                  <span key={j} className="text-[11px] bg-orange-500/10 text-orange-300 px-1.5 py-0.5 rounded">
                                    {CHANGE_LABELS[c] ?? c}
                                  </span>
                                ))}
                              </div>
                            )}
                            {/* Per-scene shot action toggle (only shown when scene has shots) */}
                            {s.shot_count > 0 && (
                              <div className="flex items-center gap-2 pt-1 border-t border-orange-500/10">
                                <span className="text-[11px] text-orange-400/60 flex-shrink-0">
                                  {s.shot_count} existing shot{s.shot_count !== 1 ? "s" : ""}:
                                </span>
                                <div className="flex rounded-md overflow-hidden border border-orange-500/20 text-[11px]">
                                  <button
                                    onClick={() => action !== "delete" && toggleShotAction(s.scene_id)}
                                    className={`px-2.5 py-1 flex items-center gap-1 transition-colors ${
                                      action === "delete"
                                        ? "bg-red-500/20 text-red-300"
                                        : "bg-transparent text-orange-400/50 hover:text-orange-300"
                                    }`}
                                  >
                                    {action === "delete" && <Check className="h-2.5 w-2.5" />}
                                    <Trash2 className="h-2.5 w-2.5" /> Delete
                                  </button>
                                  <button
                                    onClick={() => action !== "keep" && toggleShotAction(s.scene_id)}
                                    className={`px-2.5 py-1 flex items-center gap-1 transition-colors border-l border-orange-500/20 ${
                                      action === "keep"
                                        ? "bg-amber-500/20 text-amber-300"
                                        : "bg-transparent text-orange-400/50 hover:text-orange-300"
                                    }`}
                                  >
                                    {action === "keep" && <Check className="h-2.5 w-2.5" />}
                                    Keep (mark stale)
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Deleted scenes */}
                {diff.deleted_scenes.length > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold text-red-400 flex items-center gap-1.5 mb-2">
                      <Minus className="h-4 w-4" /> Removed Scenes
                    </h3>
                    <div className="space-y-1.5">
                      {diff.deleted_scenes.map((s, i) => (
                        <div key={i} className="flex items-center justify-between text-sm bg-red-500/5 border border-red-500/15 rounded px-3 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-red-500/60 font-mono text-xs">#{s.order}</span>
                            <span className="text-red-400/80 line-through">{s.scene_name}</span>
                          </div>
                          {s.shot_count > 0 && (
                            <span className="text-[11px] text-red-400/50">{s.shot_count} shots</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </section>
                )}

                {!hasChanges && (
                  <div className="text-center py-6 text-gray-500 text-sm">
                    ✓ Scenes are already up to date — no changes detected.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#1a1a1a] flex justify-between items-center bg-[#0d0d0d]/50">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] text-white rounded-md text-sm transition-colors"
            >
              Cancel
            </button>
            <div className="flex items-center gap-2">
              {/* Discard: revert script content back to current DB scenes */}
              {diff && hasChanges && (
                <button
                  onClick={handleDiscard}
                  disabled={discarding || confirming}
                  className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] text-red-400 border border-red-500/20 rounded-md text-sm flex items-center gap-2 transition-colors disabled:opacity-40"
                  title="Revert script content to match existing scenes (discard edits)"
                >
                  {discarding ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                  Discard Changes
                </button>
              )}
              {diff && (
                <button
                  onClick={handleConfirm}
                  disabled={confirming || discarding || !hasChanges}
                  className={`px-4 py-2 rounded-md text-sm flex items-center gap-2 transition-colors disabled:opacity-40 ${
                    hasChanges
                      ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                      : "bg-[#1a1a1a] text-gray-500 cursor-not-allowed"
                  }`}
                >
                  {confirming ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {hasChanges ? "Confirm & Apply Sync" : "Nothing to Sync"}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
