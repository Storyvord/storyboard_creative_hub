"use client";

import { useState, useEffect, useCallback } from "react";
import { getScripts, getScenes, getShots, generateShotImage, bulkGenerateShots, bulkGeneratePreviz, generateShots, getStoryboardData, getSceneStoryboardData, getScriptTasks, getShotPreviz, getBulkTaskStatus } from "@/services/creative-hub";
import ModelSelector from "@/components/creative-hub/ModelSelector";
import { Scene, Shot } from "@/types/creative-hub";
import { Loader2, Film, ChevronLeft, ChevronRight, CheckSquare, Square, Play, Image as ImageIcon, CheckCircle, Circle } from "lucide-react";
import { clsx } from "clsx";
import { useParams } from "next/navigation";
import ShotDetailModal from "@/components/creative-hub/ShotDetailModal";
import StoryboardSlideshowModal from "@/components/creative-hub/StoryboardSlideshowModal";
import { toast } from "react-toastify";

// Simplified SceneItem for internal use if imported one fails or for direct integration
interface SceneItemProps {
    scene: Scene;
    shots: Shot[];
    isSelected: boolean;
    onToggleSelect: (sceneId: number) => void;
    onShotClick: (shot: Shot) => void;
    loadingShots: boolean;
    onGenerateShots: (sceneId: number) => void;
    trackedTasks: Record<number, string>;
    shotErrors: Record<number, string>;
    selectedShotIds: Set<number>;
    onToggleSelectShot: (shotId: number) => void;
    retryingTasks: Record<number, boolean>;
}

function SceneItem({
    scene,
    shots,
    isSelected,
    onToggleSelect,
    onShotClick,
    loadingShots,
    onGenerateShots,
    trackedTasks,
    shotErrors,
    selectedShotIds,
    onToggleSelectShot,
    retryingTasks
}: SceneItemProps) {
    return (
        <div className={clsx(
            "bg-gray-900 border rounded-xl overflow-hidden transition-all mb-6",
            isSelected ? "border-indigo-500/50 shadow-lg shadow-indigo-900/10" : "border-gray-800 hover:border-gray-700"
        )}>
            {/* Scene Header - Simplified/Important info only */}
            <div className="p-3 border-b border-gray-800 flex items-center gap-4 bg-gray-900/50">
                <div className="flex-shrink-0">
                    <button
                        onClick={(e) => { e.stopPropagation(); onToggleSelect(scene.id); }}
                        className="text-gray-500 hover:text-indigo-400 transition-colors"
                    >
                        {isSelected ? <CheckSquare className="w-5 h-5 text-indigo-500" /> : <Square className="w-5 h-5" />}
                    </button>
                </div>
                <div className="flex-1 flex items-center gap-4 overflow-hidden">
                     <span className="flex-shrink-0 bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded text-xs font-mono font-medium border border-indigo-500/20">
                        SCENE {scene.order}
                    </span>
                    <h3 className="font-bold text-base text-white truncate">{scene.scene_name || "Untitled Scene"}</h3>
                    <div className="hidden md:flex items-center gap-3 text-xs text-gray-500 border-l border-gray-800 pl-4">
                        <span className="uppercase tracking-wider">{scene.int_ext || "INT/EXT"}</span>
                        <span>•</span>
                        <span className="truncate max-w-[150px]">{scene.location || "Location Unknown"}</span>
                         <span>•</span>
                        <span>{scene.time || "Time Unknown"}</span>
                    </div>
                </div>
                <div className="flex-shrink-0">
                     {shots.length === 0 && !loadingShots && (
                        <button
                            onClick={() => onGenerateShots(scene.id)}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-2"
                        >
                            <Film className="w-3.5 h-3.5" />
                            Generate Shots
                        </button>
                    )}
                </div>
            </div>

            {/* Horizontal Shots List - Minimized/Important info only */}
            <div className="p-4 bg-gray-950/30">
                {loadingShots ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-5 h-5 animate-spin text-gray-600" />
                    </div>
                ) : shots.length > 0 ? (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-800 scrollbar-track-transparent snap-x">
                        {shots.map((shot) => (
                            <div
                                key={shot.id}
                                onClick={() => onShotClick(shot)}
                                className="flex-shrink-0 w-48 snap-start group cursor-pointer"
                            >
                                <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden border border-gray-800 group-hover:border-indigo-500/50 transition-all relative">
                                    {shot.image_url ? (
                                        <img src={shot.image_url} alt={`Shot ${shot.order}`} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-700 bg-gray-900/50">
                                            <ImageIcon className="w-6 h-6 opacity-20" />
                                        </div>
                                    )}
                                    {/* Loading Overlay from explicitly tracked task_id */}
                                    {!!trackedTasks[shot.id] && (
                                        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-10 transition-opacity">
                                            <Loader2 className="w-6 h-6 text-indigo-400 animate-spin mb-2" />
                                            <span className="text-[10px] text-indigo-200 font-medium">
                                                {retryingTasks[shot.id] ? "Retrying..." : "Generating..."}
                                            </span>
                                        </div>
                                    )}
                                    {/* Error Overlay */}
                                    {shotErrors[shot.id] && !trackedTasks[shot.id] && (
                                        <div className="absolute inset-x-0 bottom-0 bg-red-900/90 p-2 flex flex-col justify-end z-10">
                                            <span className="text-[10px] text-red-200 font-bold uppercase truncate">
                                                Failed: {shotErrors[shot.id].split(':')[0]}
                                            </span>
                                        </div>
                                    )}
                                    {/* Selection Toggle */}
                                    <div className="absolute top-1 right-1 z-20">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onToggleSelectShot(shot.id);
                                            }}
                                            className="p-1 rounded-full bg-black/40 hover:bg-black/80 backdrop-blur text-white transition-colors"
                                        >
                                            {selectedShotIds.has(shot.id) ? (
                                                <CheckCircle className="w-4 h-4 text-indigo-400 fill-indigo-500/20" />
                                            ) : (
                                                <Circle className="w-4 h-4 opacity-50" />
                                            )}
                                        </button>
                                    </div>
                                    {/* Minimal Overlay - Only Shot # and Type */}
                                    <div className="absolute top-1 left-1 bg-black/70 px-1 py-0.5 rounded text-[9px] text-white font-mono backdrop-blur-sm">
                                        #{shot.order}
                                    </div>
                                    <div className="absolute bottom-1 right-1 bg-black/70 px-1 py-0.5 rounded text-[9px] text-white backdrop-blur-sm uppercase tracking-wider">
                                        {shot.type}
                                    </div>
                                    {/* Hover overlay for quick preview of description */}
                                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                                        <p className="text-[10px] text-gray-300 line-clamp-2 leading-tight">
                                           {shot.description}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="py-6 text-center border border-dashed border-gray-800 rounded-lg opacity-50">
                        <p className="text-gray-600 text-xs">No shots</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function StoryboardPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [shotsMap, setShotsMap] = useState<Record<number, Shot[]>>({});
  const [loadingScenes, setLoadingScenes] = useState(true);
  const [loadingShotsMap, setLoadingShotsMap] = useState<Record<number, boolean>>({});
  
  
  const [selectedShot, setSelectedShot] = useState<Shot | null>(null);
  const [selectedSceneIds, setSelectedSceneIds] = useState<Set<number>>(new Set());
  const [selectedShotIds, setSelectedShotIds] = useState<Set<number>>(new Set());
  
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [activeScriptId, setActiveScriptId] = useState<number | null>(null);
  const [trackedTasks, setTrackedTasks] = useState<Record<number, string>>({}); // shotId -> taskId (previs)
  const [trackedShotTasks, setTrackedShotTasks] = useState<Record<number, string>>({}); // sceneId -> taskId (shots)
  const [retryingTasks, setRetryingTasks] = useState<Record<number, boolean>>({});
  const [shotErrors, setShotErrors] = useState<Record<number, string>>({});
  const [initializedScriptId, setInitializedScriptId] = useState<number | null>(null);
  
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [pendingPrevizShotIds, setPendingPrevizShotIds] = useState<number[]>([]);

  // Restore Active Tasks on Mount (or when activeScriptId resolves)
  useEffect(() => {
      const initializeActiveTasks = async () => {
          if (!activeScriptId || activeScriptId === initializedScriptId) return;
          // Ensure we have loaded shots before we initialize active tasks
          // so we can properly check if images are already generated
          if (Object.keys(shotsMap).length === 0) return;

          try {
              const data = await getScriptTasks(activeScriptId);
              const { previs, shots } = data;
              setInitializedScriptId(activeScriptId);
              
              const now = new Date().getTime();
              const maxAgeMs = 60 * 60 * 1000; // 1 hour threshold for stale tasks

              if (shots && shots.length > 0) {
                  const newLoadingShots: Record<number, boolean> = {};
                  const newTrackedShots: Record<number, string> = {};
                  shots.forEach((task: any) => {
                      const taskAge = now - new Date(task.created_at || new Date()).getTime();
                      if (taskAge < maxAgeMs && (task.status === 'processing' || task.status === 'pending' || task.status === 'retrying' || task.status === 'started')) {
                          newLoadingShots[task.object_id] = true;
                          newTrackedShots[task.object_id] = task.task_id;
                      }
                  });
                  // Merge with existing loading states
                  if (Object.keys(newLoadingShots).length > 0) {
                      setLoadingShotsMap(prev => ({ ...prev, ...newLoadingShots }));
                      setTrackedShotTasks(prev => ({ ...prev, ...newTrackedShots }));
                  }
              }
              
              if (previs && previs.length > 0) {
                  const newTracked: Record<number, string> = {};
                  const newRetrying: Record<number, boolean> = {};
                  
                  previs.forEach((task: any) => {
                      // Check if the shot already has an image. If so, we don't need to load
                      let hasImage = false;
                      for (const sceneShots of Object.values(shotsMap)) {
                          const shot = sceneShots.find(s => s.id === task.object_id);
                          if (shot && shot.image_url) {
                              hasImage = true;
                              break;
                          }
                      }
                      
                      const taskAge = now - new Date(task.created_at || new Date()).getTime();

                      if (!hasImage && taskAge < maxAgeMs && (task.status === 'processing' || task.status === 'pending' || task.status === 'retrying' || task.status === 'started')) {
                          // Always track the task if it is incomplete in the DB
                          newTracked[task.object_id] = task.task_id;
                          
                          if (task.status === 'retrying') {
                              newRetrying[task.object_id] = true;
                          }
                      }
                  });
                  
                  if (Object.keys(newTracked).length > 0) {
                      setTrackedTasks(newTracked);
                      setRetryingTasks(newRetrying);
                  }
              }
          } catch (e) {
              console.error("Failed to initialize active tasks", e);
          }
      };

      initializeActiveTasks();
  }, [activeScriptId, shotsMap, initializedScriptId]);

  // Polling Effect
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    const fetchTasks = async () => {
        // Collect all task IDs we care about
        const previsTaskIds = Object.values(trackedTasks);
        const shotTaskIds = Object.values(trackedShotTasks);
        const allTaskIds = [...previsTaskIds, ...shotTaskIds];
        
        if (!activeScriptId || allTaskIds.length === 0) return;
        
        try {
            const data = await getBulkTaskStatus(allTaskIds);
            const returnedTasks = data?.tasks || [];
            
            // Separate logic for shots generation tasks vs previs generation tasks using their tracked IDs
            
            // 1. Process Previs Tasks
            const tasksToComplete: {shotId: number, status: string, error?: string}[] = [];
            Object.entries(trackedTasks).forEach(([shotIdStr, taskId]) => {
                const shotId = Number(shotIdStr);
                const task = returnedTasks.find((t: any) => t.task_id === taskId);
                
                if (task) {
                    if (task.status === 'completed' || task.status === 'failed' || task.status === 'success' || task.status === 'failure') {
                        tasksToComplete.push({ shotId, status: task.status, error: task.error });
                    } else if (task.status === 'retrying') {
                        setRetryingTasks(prev => ({ ...prev, [shotId]: true }));
                    } else if (task.status === 'processing' || task.status === 'started') {
                        setRetryingTasks(prev => {
                            if (!prev[shotId]) return prev;
                            const copy = { ...prev };
                            delete copy[shotId];
                            return copy;
                        });
                    }
                }
            });
            
            // 2. Process Shots Generation Tasks
            const shotsToRefresh: number[] = [];
            const newLoadingShots: Record<number, boolean> = {};
            
            Object.entries(trackedShotTasks).forEach(([sceneIdStr, taskId]) => {
                const sceneId = Number(sceneIdStr);
                const task = returnedTasks.find((t: any) => t.task_id === taskId);
                
                if (task) {
                    if (task.status === 'completed' || task.status === 'failed' || task.status === 'success' || task.status === 'failure') {
                         if (loadingShotsMap[sceneId]) {
                             shotsToRefresh.push(sceneId);
                         } 
                         newLoadingShots[sceneId] = false;
                    } else if (task.status === 'processing' || task.status === 'pending' || task.status === 'started') {
                         newLoadingShots[sceneId] = true;
                    }
                }
            });
            
            // Apply state updates for shots 
            if (Object.keys(newLoadingShots).some(id => newLoadingShots[Number(id)] !== loadingShotsMap[Number(id)])) {
                 setLoadingShotsMap(prev => {
                     const copy = { ...prev };
                     Object.entries(newLoadingShots).forEach(([k, v]) => {
                         if (v) copy[Number(k)] = true;
                         else delete copy[Number(k)];
                     });
                     return copy;
                 });
                 
                 // Remove from tracked tasks if done
                 setTrackedShotTasks(prev => {
                     const copy = { ...prev };
                     shotsToRefresh.forEach(id => delete copy[id]);
                     Object.entries(newLoadingShots).forEach(([k, v]) => {
                         if (!v) delete copy[Number(k)];
                     });
                     return copy;
                 });
                 
                 shotsToRefresh.forEach(id => fetchShots(id));
            }
            
            // Apply state updates for Previs
            if (tasksToComplete.length > 0) {
                // Erase completed from our tracker so loader hides
                setTrackedTasks(prev => {
                    const copy = { ...prev };
                    tasksToComplete.forEach(t => delete copy[t.shotId]);
                    return copy;
                });
                setRetryingTasks(prev => {
                    const copy = { ...prev };
                    tasksToComplete.forEach(t => delete copy[t.shotId]);
                    return copy;
                });
                
                // Fetch corresponding update for the shots that succeeded or log failure
                tasksToComplete.forEach(async t => {
                    if (t.status === 'completed') {
                        try {
                            const shotData = await getShotPreviz(t.shotId);
                            if (shotData && shotData.length > 0) {
                                const lastIdx = shotData.length - 1;
                                const newImageUrl = shotData[lastIdx].image_url;
                                const newPrevizObj = shotData[lastIdx];
                                
                                // Erase any potential lingering errors for this successful shot
                                setShotErrors(prev => {
                                    if (!prev[t.shotId]) return prev;
                                    const copy = { ...prev };
                                    delete copy[t.shotId];
                                    return copy;
                                });
                                
                                setShotsMap(prev => {
                                    const copy = { ...prev };
                                    for (const [sceneIdStr, shots] of Object.entries(copy)) {
                                        const sceneId = parseInt(sceneIdStr, 10);
                                        const shotIndex = shots.findIndex(s => s.id === t.shotId);
                                        if (shotIndex !== -1) {
                                            copy[sceneId] = [
                                                ...shots.slice(0, shotIndex),
                                                { ...shots[shotIndex], image_url: newImageUrl, previz: newPrevizObj },
                                                ...shots.slice(shotIndex + 1)
                                            ];
                                            break;
                                        }
                                    }
                                    return copy;
                                });
                            }
                        } catch (err) {
                            console.error(`Failed to refresh previz mapping for shot ${t.shotId}`, err);
                        }
                    } else if (t.status === 'failed') {
                        toast.error(t.error || "Background task failed.");
                        setShotErrors(prev => ({ ...prev, [t.shotId]: t.error || "Unknown Error" }));
                    }
                });
            }
        } catch (e) {
            console.error("Failed to fetch script tasks for polling", e);
        }
    };

    if (Object.keys(trackedTasks).length > 0) {
        fetchTasks();
        intervalId = setInterval(fetchTasks, 3000);
    }
    
    return () => {
        if (intervalId) clearInterval(intervalId);
    };
  }, [activeScriptId, trackedTasks, scenes, shotsMap]);

  useEffect(() => {
    if (projectId) {
        fetchScenes();
    }
  }, [projectId]);

  const fetchScenes = async () => {
    try {
      setLoadingScenes(true);
      // Use the new V2 endpoint to get everything in one go
      // We need the script ID. If we don't have it, we fetch scripts first.
      
      let scriptId: number | null = null;
      try {
          const scripts = await getScripts(projectId);
          if (scripts && scripts.length > 0) {
              scriptId = scripts[0].id;
              setActiveScriptId(scriptId);
          }
      } catch (e) {
          console.error("Failed to fetch scripts", e);
      }

      if (!scriptId) {
          setLoadingScenes(false);
          return;
      }

      const storyboardData = await getStoryboardData(scriptId);
      
      const parsedScenes: Scene[] = [];
      const parsedShotsMap: Record<number, Shot[]> = {};

      storyboardData.forEach((sceneData: any) => {
          // Parse Scene
          const scene: Scene = {
              id: sceneData.id,
              script_id: scriptId!, // We know scriptId exists here
              scene_name: sceneData.scene_name,
              description: sceneData.description,
              order: sceneData.order,
              // Map other fields if necessary or available
              location: "", 
              set_number: "",
              environment: "",
              int_ext: "",
              date: "",
              timeline: [],
              scene_characters: [],
              created_at: "", 
              updated_at: ""
          };
          parsedScenes.push(scene);

          // Parse Shots
          const shots: Shot[] = (sceneData.shots || []).map((shotData: any) => {
              // Extract image URL from previz list
              // API returns "previz": [ { "image_url": "..." }, ... ]
              let imageUrl = null;
              if (shotData.previz && shotData.previz.length > 0) {
                  // Previz image_url might be a full URL or relative.
                  // The serializer returns obj.image_url.url which is usually full or absolute path.
                  imageUrl = shotData.previz[shotData.previz.length - 1].image_url;
              }

              return {
                  id: shotData.id,
                  scene: sceneData.id, // or object if needed, but ID is usually enough for type
                  description: shotData.description,
                  type: shotData.type || "Wide Shot",
                  order: shotData.order,
                  done: false, // API might not return this in V2 view? view uses filtered fields?
                  // View code: "description", "type", "order", "previz"
                  // It seems V2 view constructs specific dict. 
                  // We might be missing 'done', 'timeline' etc. 
                  // If we need them, we might need to update V2 view or accept defaults.
                  timeline: {},
                  movement: "",
                  camera_angle: "",
                  lighting: "",
                  rationale: "",
                  created_at: "",
                  updated_at: "",
                  image_url: imageUrl,
                  previz: shotData.previz && shotData.previz.length > 0 ? shotData.previz[shotData.previz.length - 1] : null
              } as Shot;
          });
          
          parsedShotsMap[scene.id] = shots.sort((a, b) => a.order - b.order);
      });

      setScenes(parsedScenes.sort((a, b) => a.order - b.order));
      setShotsMap(parsedShotsMap);

    } catch (error) {
      console.error("Failed to fetch storyboard data", error);
    } finally {
      setLoadingScenes(false);
    }
  };

  const fetchShots = async (sceneId: number) => {
    setLoadingShotsMap(prev => ({ ...prev, [sceneId]: true }));
    try {
        // Use V2 endpoint to get shots WITH images
        const sceneData = await getSceneStoryboardData(sceneId);
        
        if (sceneData && sceneData.shots) {
             const shots: Shot[] = sceneData.shots.map((shotData: any) => {
                  let imageUrl = null;
                  if (shotData.previz && shotData.previz.length > 0) {
                      imageUrl = shotData.previz[shotData.previz.length - 1].image_url;
                  }

                  return {
                      id: shotData.id,
                      scene: sceneId,
                      description: shotData.description,
                      type: shotData.type || "Wide Shot",
                      order: shotData.order,
                      // parsing other fields if needed
                      image_url: imageUrl,
                      previz: shotData.previz && shotData.previz.length > 0 ? shotData.previz[shotData.previz.length - 1] : null
                  } as Shot;
             });
             const sortedShots = shots.sort((a, b) => a.order - b.order);
             setShotsMap(prev => ({ ...prev, [sceneId]: sortedShots }));
        } else {
            // Fallback or empty
             setShotsMap(prev => ({ ...prev, [sceneId]: [] }));
        }
    } catch (error) {
      console.error(`Failed to fetch shots for scene ${sceneId}`, error);
    } finally {
      setLoadingShotsMap(prev => ({ ...prev, [sceneId]: false }));
    }
  };

  const handleToggleSelectId = (id: number) => {
      const newSet = new Set(selectedSceneIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedSceneIds(newSet);
  };

  const handleToggleSelectShotId = (id: number) => {
      const newSet = new Set(selectedShotIds);
      if (newSet.has(id)) {
          newSet.delete(id);
      } else {
          newSet.add(id);
      }
      setSelectedShotIds(newSet);
  };

  const handleSelectAll = () => {
      if (selectedSceneIds.size === scenes.length) {
          setSelectedSceneIds(new Set());
      } else {
          setSelectedSceneIds(new Set(scenes.map(s => s.id)));
      }
  };

  const handleBulkGenerateShots = async () => {
      if (selectedSceneIds.size === 0) return;
      setIsBulkGenerating(true);
      try {
          const res = await bulkGenerateShots(Array.from(selectedSceneIds));
          if (res?.task_ids) {
              const newTasks: Record<number, string> = {};
              Array.from(selectedSceneIds).forEach((sceneId, idx) => {
                  if (res.task_ids[idx]) newTasks[sceneId] = res.task_ids[idx];
                  setLoadingShotsMap(prev => ({ ...prev, [sceneId]: true }));
              });
              setTrackedShotTasks(prev => ({ ...prev, ...newTasks }));
          }
          // Note: we don't need to fetchShots immediately, the polling will refresh when done.
          alert("Bulk shot generation started!");
      } catch (error) {
          console.error("Bulk generate shots failed", error);
          alert("Failed to start bulk generation.");
      } finally {
          setIsBulkGenerating(false);
      }
  };

  const handleBulkGeneratePreviz = async () => {
      if (selectedSceneIds.size === 0 && selectedShotIds.size === 0) return;

      const sceneShotIds = Array.from(selectedSceneIds).flatMap(sceneId => 
          (shotsMap[sceneId] || []).map(shot => shot.id)
      );
      
      const combinedShotIds = Array.from(new Set([...sceneShotIds, ...Array.from(selectedShotIds)]));
      
      if (combinedShotIds.length === 0) {
          alert("No shots found to generate previz for.");
          return;
      }

      // Open ModelSelector instead of generating directly
      setPendingPrevizShotIds(combinedShotIds);
      setIsModelSelectorOpen(true);
  };

  const handleModelConfirm = async (model: string, provider: string) => {
      setIsModelSelectorOpen(false);
      if (pendingPrevizShotIds.length === 0) return;

      setIsBulkGenerating(true);
      try {
          const response = await bulkGeneratePreviz(pendingPrevizShotIds, model, provider);
          // Store explicitly generated task IDs to local tracked state!
          if (response && response.shot_ids && response.task_ids) {
              setTrackedTasks(prev => {
                  const copy = { ...prev };
                  response.shot_ids.forEach((sid: number, i: number) => {
                      copy[sid] = response.task_ids[i];
                  });
                  return copy;
              });

              // Clear out any old persistent errors before fresh generation
              setShotErrors(prev => {
                  const copy = { ...prev };
                  response.shot_ids.forEach((sid: number) => {
                      delete copy[sid];
                  });
                  return copy;
              });
          }
          alert("Bulk previz generation started! This may take a while.");
      } catch (error) {
          console.error("Bulk generate previz failed", error);
          alert("Failed to start bulk previz generation.");
      } finally {
          setIsBulkGenerating(false);
          setPendingPrevizShotIds([]);
      }
  };

  const handleGenerateShots = async (sceneId: number) => {
      try {
          alert(`Generating shots for Scene...`);
          await generateShots(sceneId);
          fetchShots(sceneId);
      } catch (error) {
          console.error("Failed to generate shots", error);
          alert("Failed to generate shots.");
      }
  };

  // Navigation for Modal
  const getAllShots = useCallback(() => {
     return scenes.flatMap(scene => shotsMap[scene.id] || []);
  }, [scenes, shotsMap]);

  const handleNextShot = () => {
      const allShots = getAllShots();
      if (!selectedShot || allShots.length === 0) return;
      const currentIndex = allShots.findIndex(s => s.id === selectedShot.id);
      if (currentIndex < allShots.length - 1) {
          setSelectedShot(allShots[currentIndex + 1]);
      }
  }

  const handlePrevShot = () => {
      const allShots = getAllShots();
      if (!selectedShot || allShots.length === 0) return;
      const currentIndex = allShots.findIndex(s => s.id === selectedShot.id);
      if (currentIndex > 0) {
          setSelectedShot(allShots[currentIndex - 1]);
      }
  }

  const refreshPreiviz = (sceneId: number) => {
      fetchShots(sceneId);
  }

  const handlePlaySlideshow = () => {
      setIsSlideshowOpen(true);
  };

  const getSlideshowShots = useCallback(() => {
      if (selectedSceneIds.size === 0 && selectedShotIds.size === 0) {
          // Play all shots
          return getAllShots();
      }

      // Gather from selected scenes
      const sceneShots = Array.from(selectedSceneIds).flatMap(sceneId => 
          shotsMap[sceneId] || []
      );
      
      // Gather specifically selected shots
      const allAvailableShots = getAllShots();
      const specificShots = Array.from(selectedShotIds).map(id => 
          allAvailableShots.find(s => s.id === id)
      ).filter(Boolean) as Shot[];

      // Combine, deduplicate, and sort
      const combined = [...sceneShots, ...specificShots];
      const unique = Array.from(new Set(combined.map(s => s.id)))
          .map(id => combined.find(s => s.id === id)!)
          .sort((a, b) => {
              if (a.scene !== b.scene) return a.scene - b.scene; // Approximation, scene order is better but ok
              return a.order - b.order;
          });

      // To handle proper scene order sorting:
      const sortedUnique = unique.sort((a, b) => {
          const sceneA = scenes.find(s => s.id === a.scene);
          const sceneB = scenes.find(s => s.id === b.scene);
          const orderA = sceneA ? sceneA.order : 0;
          const orderB = sceneB ? sceneB.order : 0;
          
          if (orderA !== orderB) return orderA - orderB;
          return a.order - b.order;
      });

      return sortedUnique;
  }, [selectedSceneIds, selectedShotIds, getAllShots, shotsMap, scenes]);

  if (loadingScenes) return <div className="h-full flex items-center justify-center bg-gray-950"><Loader2 className="animate-spin h-8 w-8 text-indigo-500" /></div>;

  return (
    <div className="flex h-full bg-gray-950 overflow-hidden relative">
      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Toolbar */}
          <div className="h-16 border-b border-gray-800 bg-gray-900/50 flex items-center justify-between px-6 backdrop-blur-md z-10">
              <div className="flex items-center gap-4">
                  <h1 className="text-xl font-bold text-white">Storyboard</h1>
                  <span className="text-gray-500 text-sm">|</span>
                  <div className="relative group">
                      <button className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors text-gray-300">
                          Quick Jump
                          <ChevronRight className="w-3 h-3 rotate-90" />
                      </button>
                      <div className="absolute top-full left-0 mt-2 w-64 max-h-96 overflow-y-auto bg-gray-900 border border-gray-800 rounded-xl shadow-xl p-2 hidden group-hover:block z-50">
                          {scenes.map(scene => (
                             <button
                                key={scene.id}
                                onClick={() => document.getElementById(`scene-${scene.id}`)?.scrollIntoView({ behavior: 'smooth' })}
                                className="w-full text-left px-3 py-2 rounded text-xs text-gray-400 hover:bg-gray-800 hover:text-white truncate transition-colors flex items-center gap-2"
                             >
                                <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-gray-800 rounded text-[10px] font-mono opacity-50">{scene.order}</span>
                                <span className="truncate">{scene.scene_name || "Untitled"}</span>
                             </button>
                          ))}
                      </div>
                  </div>
                  <div className="flex items-center gap-2">
                      <button 
                        onClick={handleSelectAll}
                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs font-medium transition-colors"
                      >
                          {selectedSceneIds.size === scenes.length && scenes.length > 0 ? <CheckSquare className="w-3.5 h-3.5" /> : <Square className="w-3.5 h-3.5" />}
                          {selectedSceneIds.size === scenes.length && scenes.length > 0 ? "Deselect All" : "Select All"}
                      </button>
                      {selectedSceneIds.size > 0 && (
                          <span className="text-xs text-indigo-400 font-medium bg-indigo-500/10 px-2 py-1 rounded">
                              {selectedSceneIds.size} Selected
                          </span>
                      )}
                  </div>
              </div>
              <div className="flex items-center gap-3">
                  <button 
                      onClick={handlePlaySlideshow}
                      disabled={scenes.length === 0}
                      className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 border border-gray-700 hover:border-gray-600"
                  >
                      <Play className="w-4 h-4 text-indigo-400" />
                      Play Slideshow
                  </button>
                  
                  {(selectedSceneIds.size > 0 || selectedShotIds.size > 0) && (
                      <>
                        <button 
                            disabled={isBulkGenerating || selectedSceneIds.size === 0} // Only bulk scenes
                            onClick={handleBulkGenerateShots}
                            className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isBulkGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                            Bulk Shots
                        </button>
                        <button 
                            disabled={isBulkGenerating}
                            onClick={handleBulkGeneratePreviz}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                             {isBulkGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                            Bulk Previz {selectedShotIds.size > 0 && selectedSceneIds.size === 0 ? `(${selectedShotIds.size})` : ''}
                        </button>
                      </>
                  )}
              </div>
          </div>

          {/* Vertical Feed */}
          <div className="flex-1 overflow-y-auto p-6 scroll-smooth">
              <div className="max-w-7xl mx-auto">
                  {scenes.length > 0 ? (
                      scenes.map(scene => (
                          <div id={`scene-${scene.id}`} key={scene.id} className="scroll-mt-6">
                              <SceneItem 
                                scene={scene}
                                shots={shotsMap[scene.id] || []}
                                isSelected={selectedSceneIds.has(scene.id)}
                                onToggleSelect={handleToggleSelectId}
                                onShotClick={setSelectedShot}
                                loadingShots={loadingShotsMap[scene.id]}
                                onGenerateShots={handleGenerateShots}
                                trackedTasks={trackedTasks}
                                shotErrors={shotErrors}
                                selectedShotIds={selectedShotIds}
                                onToggleSelectShot={handleToggleSelectShotId}
                                retryingTasks={retryingTasks}
                              />
                          </div>
                      ))
                  ) : (
                      <div className="text-center py-20">
                          <p className="text-gray-500">No scenes found in this script.</p>
                      </div>
                  )}
                  <div className="h-20" /> {/* Spacer */}
              </div>
          </div>
      </div>

      <ShotDetailModal
        isOpen={!!selectedShot}
        onClose={() => setSelectedShot(null)}
        shot={selectedShot}
        error={selectedShot ? shotErrors[selectedShot.id] : undefined}
        scene={selectedShot ? scenes.find(s => shotsMap[s.id]?.some(shot => shot.id === selectedShot.id)) || null : null}
        onPrev={getAllShots().findIndex(s => s.id === selectedShot?.id) > 0 ? handlePrevShot : undefined}
        onNext={getAllShots().findIndex(s => s.id === selectedShot?.id) < getAllShots().length - 1 ? handleNextShot : undefined}
        onGeneratePreviz={(shotId) => {
             generateShotImage(shotId).then(() => {
                 alert("Previz generation started.");
                 // Find scene id for this shot
                 const scene = scenes.find(s => shotsMap[s.id]?.some(shot => shot.id === shotId));
                 if (scene) {
                    refreshPreiviz(scene.id);
                 }
             }).catch(e => {
                 console.error(e);
                 alert("Failed to generate previz");
             });
        }}
        showGenerateButton={true}
      />

      <StoryboardSlideshowModal 
        isOpen={isSlideshowOpen}
        onClose={() => setIsSlideshowOpen(false)}
        shots={getSlideshowShots()}
      />

      <ModelSelector
        isOpen={isModelSelectorOpen}
        onClose={() => { setIsModelSelectorOpen(false); setPendingPrevizShotIds([]); }}
        onConfirm={handleModelConfirm}
        itemCount={pendingPrevizShotIds.length}
        title="Select Model for Previz Generation"
        confirmLabel="Generate Previz"
      />
    </div>
  );
}
