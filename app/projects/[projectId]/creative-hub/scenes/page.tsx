"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getScripts, getScenes } from "@/services/creative-hub";
import { Script, Scene } from "@/types/creative-hub";
import SceneSyncPreviewModal from "@/components/creative-hub/SceneSyncPreviewModal";
import { Loader2, RefreshCw, AlertCircle, MapPin, ChevronRight, Plus } from "lucide-react";
import { useParams } from "next/navigation";

const CHANGE_LABELS: Record<string, string> = {
  action: "Action",
  scene_name: "Name",
  location: "Location",
  time_of_day: "Time",
  dialogue: "Dialogue",
};

export default function ScenesPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();

  const [scenes, setScenes] = useState<Scene[]>([]);
  const [script, setScript] = useState<Script | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSyncModal, setShowSyncModal] = useState(false);

  useEffect(() => { if (projectId) fetchData(); }, [projectId]);

  const fetchData = async (currentScript?: Script) => {
    try {
      const s = currentScript || script;
      if (!s) {
        const scripts = await getScripts(projectId);
        if (!scripts || scripts.length === 0) { setLoading(false); return; }
        setScript(scripts[0]);
        const scenesData = await getScenes(scripts[0].id);
        setScenes(scenesData || []);
      } else {
        const scenesData = await getScenes(s.id);
        setScenes(scenesData || []);
      }
    } catch (error) {
      console.error("Failed to fetch scenes", error);
    } finally {
      setLoading(false);
    }
  };

  // Count sync changes directly from backend-provided sync_status on each scene
  const newCount = scenes.filter(s => s.sync_status === 'new').length;
  const updatedCount = scenes.filter(s => s.sync_status === 'updated').length;
  const deletedCount = scenes.filter(s => s.sync_status === 'deleted').length;
  const hasChanges = newCount > 0 || updatedCount > 0 || deletedCount > 0;

  if (loading) return (
    <div className="flex justify-center items-center h-full">
      <Loader2 className="animate-spin h-6 w-6 text-[#333]" />
    </div>
  );

  if (!script) return (
    <div className="p-6 text-center bg-[#0d0d0d] rounded-md border border-[#1a1a1a] m-6">
      <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-3" />
      <h2 className="text-base font-bold mb-1 text-white">No Script Found</h2>
      <p className="text-[#555] text-xs">Please upload a script first.</p>
    </div>
  );

  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-xl font-bold mb-1 text-white">Scenes</h1>
          <p className="text-[#555] text-xs">Manage and visualize your script&apos;s scenes</p>
        </div>

        <div className="flex items-center gap-3">
          {/* Change summary badges — counts come from backend sync_status */}
          {hasChanges && (
            <div className="flex items-center gap-1.5 text-xs">
              {newCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-gray-500/20 text-gray-400 border border-gray-500/30">
                  +{newCount} new
                </span>
              )}
              {updatedCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  ~{updatedCount} edited
                </span>
              )}
              {deletedCount > 0 && (
                <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  -{deletedCount} removed
                </span>
              )}
            </div>
          )}

          {scenes.length === 0 ? (
            <button
              data-tour="sync-scenes-btn"
              onClick={() => setShowSyncModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-all flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Sync Scenes
            </button>
          ) : (
            <button
              data-tour="sync-scenes-btn"
              onClick={() => setShowSyncModal(true)}
              className={`px-3 py-2 rounded-md text-xs font-medium transition-all flex items-center gap-1.5 border ${
                hasChanges
                  ? "bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border-orange-500/30"
                  : "bg-[#161616] hover:bg-[#1a1a1a] text-white border-[#222]"
              }`}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${hasChanges ? "text-orange-400" : "text-emerald-400"}`} />
              Re-sync{hasChanges ? " (changes detected)" : ""}
            </button>
          )}
        </div>
      </header>

      {scenes.length > 0 ? (
        <div className="space-y-3">
          {scenes.map((s, idx) => {
            const isNew = s.sync_status === 'new';
            const isUpdated = s.sync_status === 'updated';
            const isDeleted = s.sync_status === 'deleted';

            // Phantom "new" scene card (no DB id)
            if (isNew) {
              return (
                <div
                  key={`new-${idx}`}
                  className="border border-dashed border-gray-600/40 p-4 rounded-md bg-[#0a0a0a] opacity-60"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-14 h-14 bg-[#111] rounded-md flex flex-col items-center justify-center border border-dashed border-gray-600/40">
                      <span className="text-[9px] text-gray-600 uppercase font-bold tracking-wider">SC</span>
                      <span className="text-lg font-bold text-gray-500">{s.order}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between mb-1">
                        <h3 className="text-sm font-bold text-gray-400 truncate pr-4">{s.scene_name}</h3>
                        <span className="flex items-center gap-1 text-[10px] text-gray-500 bg-gray-500/10 px-2 py-0.5 rounded border border-gray-500/20">
                          <Plus className="h-3 w-3" /> New
                        </span>
                      </div>
                      {s.description && (
                        <p className="text-[#555] text-xs line-clamp-2">{s.description}</p>
                      )}
                      {(s.location || s.int_ext || s.environment) && (
                        <div className="flex items-center gap-2 mt-2 text-[10px] text-[#444]">
                          {s.int_ext && <span className="uppercase font-medium">{s.int_ext}</span>}
                          {s.location && (
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <span>{s.location}</span>
                            </div>
                          )}
                          {s.environment && <span>· {s.environment}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div
                key={s.id ?? `scene-${idx}`}
                {...(idx === 0 ? { "data-tour": "scene-card" } : {})}
                onClick={() => !isDeleted && s.id && router.push(`/projects/${projectId}/creative-hub/scenes/${s.id}`)}
                className={`relative p-4 rounded-md border transition-all group ${
                  isDeleted
                    ? "bg-[#0d0d0d] border-red-500/30 cursor-default"
                    : isUpdated
                    ? "bg-[#0d0d0d] border-orange-500/30 hover:border-orange-500/60 hover:bg-[#111] cursor-pointer"
                    : "bg-[#0d0d0d] border-[#1a1a1a] hover:border-emerald-500/30 hover:bg-[#111] cursor-pointer"
                }`}
              >
                {/* Coloured left accent bar */}
                {(isUpdated || isDeleted) && (
                  <div
                    className={`absolute left-0 top-0 bottom-0 w-0.5 rounded-l-md ${
                      isDeleted ? "bg-red-500/70" : "bg-orange-500/70"
                    }`}
                  />
                )}

                <div className="flex items-start gap-3">
                  <div className={`flex-shrink-0 w-14 h-14 rounded-md flex flex-col items-center justify-center border transition-colors ${
                    isDeleted
                      ? "bg-red-500/5 border-red-500/20"
                      : isUpdated
                      ? "bg-orange-500/5 border-orange-500/20 group-hover:border-orange-500/40"
                      : "bg-[#111] border-[#1a1a1a] group-hover:border-emerald-500/20"
                  }`}>
                    <span className="text-[9px] text-[#555] uppercase font-bold tracking-wider">SC</span>
                    <span className={`text-lg font-bold ${isDeleted ? "text-red-400/70" : isUpdated ? "text-orange-300" : "text-white"}`}>
                      {s.order}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start mb-1">
                      <h3 className={`text-sm font-bold truncate pr-4 ${isDeleted ? "text-red-400/80 line-through" : isUpdated ? "text-orange-200" : "text-white"}`}>
                        {s.scene_name}
                      </h3>
                      <div className="flex items-center gap-2">
                        {isDeleted && (
                          <span className="text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                            Will be deleted
                          </span>
                        )}
                        {isUpdated && s.sync_changes && s.sync_changes.length > 0 && (
                          <div className="flex gap-1">
                            {s.sync_changes.slice(0, 2).map((c: string) => (
                              <span key={c} className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                                {CHANGE_LABELS[c] ?? c}
                              </span>
                            ))}
                            {s.sync_changes.length > 2 && (
                              <span className="text-[10px] text-orange-400 bg-orange-500/10 px-1.5 py-0.5 rounded border border-orange-500/20">
                                +{s.sync_changes.length - 2}
                              </span>
                            )}
                          </div>
                        )}
                        {!isUpdated && !isDeleted && (
                          <div className="flex items-center gap-2 text-[10px] text-[#555] bg-[#111] px-2 py-0.5 rounded border border-[#1a1a1a]">
                            <span className="uppercase font-medium">{s.int_ext}</span>
                            <span className="text-[#333]">·</span>
                            <span>{s.environment}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <p className={`text-xs line-clamp-2 ${isDeleted ? "text-[#444]" : "text-[#666]"}`}>{s.description}</p>

                    <div className="flex items-center gap-3 mt-2 text-[10px] text-[#555]">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[120px]">{s.location}</span>
                      </div>
                      {isDeleted && s.sync_shot_count != null && s.sync_shot_count > 0 && (
                        <span className="text-red-500/60">{s.sync_shot_count} shot{s.sync_shot_count !== 1 ? "s" : ""} will be removed</span>
                      )}
                    </div>
                  </div>

                  {!isDeleted && s.id && (
                    <div className="flex items-center self-center pl-3 border-l border-[#1a1a1a]">
                      <ChevronRight className={`h-4 w-4 transition-colors ${isUpdated ? "text-orange-500/40 group-hover:text-orange-400" : "text-[#444] group-hover:text-emerald-400"}`} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-[#0d0d0d] rounded-md border border-dashed border-[#1a1a1a]">
          <p className="text-[#555] text-xs">No scenes synced yet.</p>
          <p className="text-[10px] text-[#444] mt-1">Click &quot;Sync Scenes&quot; to parse your script.</p>
        </div>
      )}



      {showSyncModal && script && (
        <SceneSyncPreviewModal
          scriptId={script.id}
          onClose={() => setShowSyncModal(false)}
          onSynced={() => fetchData(script)}
        />
      )}
    </div>
  );
}
