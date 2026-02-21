"use client";

import { useState, useEffect, useCallback } from "react";
import { getScripts, getScenes, getShots, generateShotImage, bulkGenerateShots, bulkGeneratePreviz, generateShots, getStoryboardData, getSceneStoryboardData } from "@/services/creative-hub";
import { Scene, Shot } from "@/types/creative-hub";
import { Loader2, Film, ChevronLeft, ChevronRight, CheckSquare, Square, Play, Image as ImageIcon } from "lucide-react";
import { clsx } from "clsx";
import { useParams } from "next/navigation";
import ShotDetailModal from "@/components/creative-hub/ShotDetailModal";

// Simplified SceneItem for internal use if imported one fails or for direct integration
interface SceneItemProps {
    scene: Scene;
    shots: Shot[];
    isSelected: boolean;
    onToggleSelect: (sceneId: number) => void;
    onShotClick: (shot: Shot) => void;
    loadingShots: boolean;
    onGenerateShots: (sceneId: number) => void;
}

function SceneItem({
    scene,
    shots,
    isSelected,
    onToggleSelect,
    onShotClick,
    loadingShots,
    onGenerateShots
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
  
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);

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
                  imageUrl = shotData.previz[0].image_url;
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
                  previz: shotData.previz && shotData.previz.length > 0 ? shotData.previz[0] : null
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
                      imageUrl = shotData.previz[0].image_url;
                  }

                  return {
                      id: shotData.id,
                      scene: sceneId,
                      description: shotData.description,
                      type: shotData.type || "Wide Shot",
                      order: shotData.order,
                      // parsing other fields if needed
                      image_url: imageUrl,
                      previz: shotData.previz && shotData.previz.length > 0 ? shotData.previz[0] : null
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
          await bulkGenerateShots(Array.from(selectedSceneIds));
          // Refresh shots for selected scenes
          Array.from(selectedSceneIds).forEach(id => fetchShots(id));
          alert("Bulk shot generation started!");
      } catch (error) {
          console.error("Bulk generate shots failed", error);
          alert("Failed to start bulk generation.");
      } finally {
          setIsBulkGenerating(false);
      }
  };

  const handleBulkGeneratePreviz = async () => {
      if (selectedSceneIds.size === 0) return;

      const shotIds = Array.from(selectedSceneIds).flatMap(sceneId => 
          (shotsMap[sceneId] || []).map(shot => shot.id)
      );
      
      if (shotIds.length === 0) {
          alert("No shots found in the selected scenes to generate previz for.");
          return;
      }

      setIsBulkGenerating(true);
      try {
          await bulkGeneratePreviz(shotIds);
          alert("Bulk previz generation started! This may take a while.");
          // We might want to poll for updates or just let user refresh
      } catch (error) {
          console.error("Bulk generate previz failed", error);
          alert("Failed to start bulk previz generation.");
      } finally {
          setIsBulkGenerating(false);
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
                  {selectedSceneIds.size > 0 && (
                      <>
                        <button 
                            disabled={isBulkGenerating}
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
                            Bulk Previz
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
    </div>
  );
}
