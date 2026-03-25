import { Scene, Shot } from "@/types/creative-hub";
import { X, Calendar, MapPin, Clock, Film, Edit, Trash2, Wand2, Loader2, ExternalLink, MessageSquare, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { getShots, generateShots, updateScene, getSceneCharacters, getSceneDialogs, dismissStaleShotWarning, deleteSceneShots } from "@/services/creative-hub";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import SceneCharacterDetailModal from "./SceneCharacterDetailModal";
import ShotSkeleton from "./ShotSkeleton";
import Link from "next/link";

interface SceneDetailModalProps {
  scene: Scene | null;
  projectId?: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function SceneDetailModal({ scene, projectId, onClose, onUpdate }: SceneDetailModalProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Scene>>({});
  const [saving, setSaving] = useState(false);

  // Missing state restored
  const [shots, setShots] = useState<Shot[]>([]);
  const [loadingShots, setLoadingShots] = useState(false);
  const [generatingShots, setGeneratingShots] = useState(false);

  const [sceneCharacters, setSceneCharacters] = useState<any[]>([]);
  const [selectedSceneCharacter, setSelectedSceneCharacter] = useState<any | null>(null);

  const [dialogs, setDialogs] = useState<any[]>([]);
  const [loadingDialogs, setLoadingDialogs] = useState(false);

  const [shotsStale, setShotsStale] = useState(false);
  const [staleDismissing, setStaleDismissing] = useState(false);

  useEffect(() => {
    if (scene) {
      setFormData(scene);
      setShotsStale(!!scene.shots_stale);
      fetchShots();
      fetchSceneCharacters();
      fetchDialogs();
    }
  }, [scene]);

  const handleIgnoreStale = async () => {
    if (!scene) return;
    setStaleDismissing(true);
    try {
      await dismissStaleShotWarning(scene.id);
      setShotsStale(false);
    } catch {
      // Dismiss locally even if API fails
      setShotsStale(false);
    } finally {
      setStaleDismissing(false);
    }
  };

  const handleDeleteStaleShots = async () => {
    if (!scene) return;
    setStaleDismissing(true);
    try {
      await deleteSceneShots(scene.id);
      setShotsStale(false);
      setShots([]);
      toast.success("Shots deleted. Previz history is still accessible.");
    } catch (error) {
      toast.error(extractApiError(error, "Failed to delete shots."));
    } finally {
      setStaleDismissing(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
        if (!scene) return;
        setSaving(true);
        try {
            await updateScene(scene.id, formData);
            toast.success("Scene updated successfully");
            setIsEditing(false);
            onUpdate(); // Refresh parent data
        } catch (error) {
            console.error("Failed to update scene", error);
            toast.error(extractApiError(error, "Failed to update scene."));
        } finally {
            setSaving(false);
        }
  };

  const fetchShots = async () => {
    if (!scene) return;
    setLoadingShots(true);
    try {
      const data = await getShots(scene.id);
      setShots(data || []);
    } catch (error) {
      console.error("Failed to fetch shots", error);
    } finally {
      setLoadingShots(false);
    }
  };

  const fetchSceneCharacters = async () => {
      if (!scene) return;
      try {
          const data = await getSceneCharacters(scene.id);
          setSceneCharacters(data);
      } catch (error) {
          console.error("Failed to fetch scene characters", error);
      }
  };

  const fetchDialogs = async () => {
      if (!scene) return;
      setLoadingDialogs(true);
      try {
          const data = await getSceneDialogs(scene.id);
          setDialogs(data || []);
      } catch (error) {
          console.error("Failed to fetch dialogs", error);
      } finally {
          setLoadingDialogs(false);
      }
  };

  const handleGenerateShots = async () => {
    if (!scene) return;
    setGeneratingShots(true);
    try {
      await generateShots(scene.id);
      // Poll or wait for update - simplifying to reload
      setTimeout(fetchShots, 3000);
    } catch (error) {
      console.error("Failed to generate shots", error);
    } finally {
      setGeneratingShots(false);
    }
  };

  if (!scene) return null;

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
          className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-md w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="p-6 border-b border-[#1a1a1a] flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-emerald-500/10 text-emerald-400 px-3 py-1 rounded-md text-sm font-medium border border-emerald-500/20">
                  Scene {scene.order}
                </span>
                {isEditing ? (
                    <input 
                        type="text"
                        name="scene_name"
                        value={formData.scene_name || ""}
                        onChange={handleInputChange}
                        className="bg-[#1a1a1a] border border-[#222] rounded px-3 py-1 text-white font-bold text-xl focus:outline-none focus:border-emerald-500"
                    />
                ) : (
                    <h2 className="text-2xl font-bold text-white max-w-2xl truncate">{scene.scene_name}</h2>
                )}
              </div>
              <div className="flex items-center gap-4 text-gray-400 text-sm flex-wrap">
                <div className="flex items-center gap-1.5">
                    <MapPin className="h-4 w-4" />
                    {isEditing ? (
                        <div className="flex gap-2">
                             <select
                                name="int_ext"
                                value={formData.int_ext || "INT"}
                                onChange={handleInputChange}
                                className="bg-[#1a1a1a] border border-[#222] rounded px-2 py-0.5 text-white text-xs focus:outline-none"
                             >
                                 <option value="INT">INT</option>
                                 <option value="EXT">EXT</option>
                                 <option value="INT/EXT">INT/EXT</option>
                             </select>
                             <input 
                                type="text"
                                name="location"
                                value={formData.location || ""}
                                onChange={handleInputChange}
                                placeholder="Location"
                                className="bg-[#1a1a1a] border border-[#222] rounded px-2 py-0.5 text-white text-xs focus:outline-none w-32"
                            />
                        </div>
                    ) : (
                        <span>{scene.int_ext} {scene.location}</span>
                    )}
                </div>
                <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {isEditing ? (
                         <input
                            type="text"
                            name="environment"
                            value={formData.environment || ""}
                            onChange={handleInputChange}
                            placeholder="Time of day"
                            className="bg-[#1a1a1a] border border-[#222] rounded px-2 py-0.5 text-white text-xs focus:outline-none w-24"
                        />
                    ) : (
                        <span>{scene.environment}</span>
                    )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[#1a1a1a] rounded-md text-gray-400 hover:text-white transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            
            {/* Location Image Banner */}
            {scene.location_detail?.image_url && (
              <section>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-emerald-400" />
                  Location
                </h3>
                <div className="relative rounded-md overflow-hidden border border-[#1a1a1a] bg-[#0a0a0a]">
                  <img
                    src={scene.location_detail.image_url}
                    alt={scene.location_detail.name}
                    className="w-full object-cover max-h-48"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                    <p className="text-white text-sm font-semibold">{scene.location_detail.name}</p>
                    {scene.location_detail.description && (
                      <p className="text-[#aaa] text-xs line-clamp-1">{scene.location_detail.description}</p>
                    )}
                  </div>
                </div>
              </section>
            )}

            {/* Stale shots warning */}
            {shotsStale && (
              <div className="rounded-md border border-amber-500/30 bg-amber-500/8 p-4 flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-amber-300 font-medium">Scene content changed — shots may be inconsistent</p>
                  <p className="text-xs text-amber-200/60 mt-0.5">
                    The scene description was updated after these shots were generated.
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={handleIgnoreStale}
                    disabled={staleDismissing}
                    className="text-xs px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {staleDismissing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Ignore
                  </button>
                  <button
                    onClick={handleDeleteStaleShots}
                    disabled={staleDismissing}
                    className="text-xs px-3 py-1.5 bg-transparent hover:bg-red-500/10 text-red-500/60 hover:text-red-400 border border-red-500/20 rounded-md transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    {staleDismissing ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                    Delete shots
                  </button>
                </div>
              </div>
            )}

          {/* Description */}

            <section>
                <h3 className="text-lg font-semibold text-white mb-3">Description</h3>
                {isEditing ? (
                    <textarea
                        name="description"
                        value={formData.description || ""}
                        onChange={handleInputChange}
                        rows={5}
                        className="w-full bg-[#1a1a1a]/30 border border-[#222] rounded-md p-4 text-gray-300 leading-relaxed focus:outline-none focus:border-emerald-500"
                    />
                ) : (
                    <p className="text-gray-300 leading-relaxed bg-[#1a1a1a]/30 p-4 rounded-md border border-[#1a1a1a]">
                        {scene.description}
                    </p>
                )}
            </section>

             {/* Production Details */}
             <section>
                <h3 className="text-lg font-semibold text-white mb-3">Production Details</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-[#1a1a1a]/20 p-4 rounded-md border border-[#1a1a1a]">
                    <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Set Number</span>
                        {isEditing ? (
                             <input 
                                type="text"
                                name="set_number"
                                value={formData.set_number || ""}
                                onChange={handleInputChange}
                                className="w-full bg-[#1a1a1a] border border-[#222] rounded px-2 py-1 text-white text-sm focus:outline-none"
                            />
                        ) : (
                            <span className="text-gray-200 font-medium">{scene.set_number || "-"}</span>
                        )}
                    </div>
                     <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Environment</span>
                        {isEditing ? (
                             <input 
                                type="text"
                                name="environment"
                                value={formData.environment || ""}
                                onChange={handleInputChange}
                                className="w-full bg-[#1a1a1a] border border-[#222] rounded px-2 py-1 text-white text-sm focus:outline-none"
                            />
                        ) : (
                             <span className="text-gray-200 font-medium">{scene.environment || "-"}</span>
                        )}
                    </div>
                     <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Date</span>
                        {isEditing ? (
                             <input 
                                type="text"
                                name="date"
                                value={formData.date || ""}
                                onChange={handleInputChange}
                                className="w-full bg-[#1a1a1a] border border-[#222] rounded px-2 py-1 text-white text-sm focus:outline-none"
                            />
                        ) : (
                            <span className="text-gray-200 font-medium">{scene.date || "-"}</span>
                        )}
                    </div>
                     <div>
                        <span className="text-xs text-gray-500 uppercase tracking-wider block mb-1">Timeline</span>
                        <div className="text-gray-200 font-medium truncate">
                            {typeof scene.timeline === 'object' ? JSON.stringify(scene.timeline) : (scene.timeline || "-")}
                        </div>
                    </div>
                </div>
            </section>

            {/* Characters */}
            <section>
                <h3 className="text-lg font-semibold text-white mb-3">Characters ({sceneCharacters.length})</h3>
                {sceneCharacters.length > 0 ? (
                    <div className="flex flex-wrap gap-4">
                        {sceneCharacters.map((char: any, idx: number) => (
                            <div 
                                key={idx} 
                                onClick={() => setSelectedSceneCharacter(char)}
                                className="flex items-center gap-3 bg-[#1a1a1a]/50 p-3 rounded-md border border-[#1a1a1a] min-w-[200px] cursor-pointer hover:bg-[#1a1a1a] hover:border-emerald-500/50 transition-all group"
                            >
                                <div className="w-10 h-10 bg-[#222] rounded-md overflow-hidden flex-shrink-0 relative">
                                     {char.image_url ? (
                                         <img src={char.image_url} alt={char.character_name} className="w-full h-full object-cover" />
                                     ) : char.character?.image_url ? (
                                         <img src={char.character.image_url} alt={char.character_name} className="w-full h-full object-cover opacity-80" />
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center bg-gray-600 text-gray-400">?</div>
                                     )}
                                     
                                     {/* Use fallback indicator if scene char doesn't have image but script char does */}
                                     {!char.image_url && char.character?.image_url && (
                                         <div className="absolute inset-0 bg-emerald-500/20 group-hover:bg-emerald-500/0 transition-colors"></div>
                                     )}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-gray-200 group-hover:text-white transition-colors">
                                        {char.character_name || char.name || (char.character ? char.character.name : "Unknown")}
                                    </p>
                                    <div className="flex items-center gap-2">
                                        {char.role && <p className="text-xs text-gray-500">{char.role}</p>}
                                        {!char.image_url && <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">Customize</span>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No characters linked to this scene.</p>
                )}
            </section>

            {/* Dialogs */}
            <section>
                <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-emerald-400" />
                    Dialogs {!loadingDialogs && `(${dialogs.length})`}
                </h3>
                {loadingDialogs ? (
                    <div className="space-y-2 animate-pulse">
                        {[...Array(3)].map((_, i) => (
                            <div key={i} className="h-12 bg-[#1a1a1a]/50 rounded-md" />
                        ))}
                    </div>
                ) : dialogs.length > 0 ? (
                    <div className="space-y-3">
                        {dialogs.map((dialog: any, idx: number) => (
                            <div key={idx} className="bg-[#1a1a1a]/30 border border-[#1a1a1a] rounded-md p-3">
                                <p className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
                                    {(typeof dialog.character === 'object' ? dialog.character?.name : dialog.character) || dialog.character_name || "Unknown"}
                                </p>
                                <p className="text-sm text-gray-300 leading-relaxed">{dialog.dialog || dialog.text || dialog.content}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-500 italic">No dialogs in this scene.</p>
                )}
            </section>

            {/* Shots */}
            <section>
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Film className="h-5 w-5 text-emerald-400" />
                        Shots ({shots.length})
                    </h3>
                    <button
                        onClick={handleGenerateShots}
                        disabled={generatingShots}
                        className="text-sm px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                        {generatingShots ? <Wand2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                        Generate Shots
                    </button>
                </div>

                {generatingShots ? (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-emerald-400 font-medium text-xs mb-2">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            <span>AI is analyzing script for shots...</span>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                            <ShotSkeleton count={6} className="w-full" />
                        </div>
                    </div>
                ) : loadingShots ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 animate-pulse">
                        <ShotSkeleton count={3} className="w-full" />
                    </div>
                ) : shots.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {shots.map((shot) => (
                            <div key={shot.id} className="bg-[#1a1a1a]/50 p-3 rounded-md border border-[#1a1a1a]">
                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-xs font-mono text-gray-500">Shot {shot.order}</span>
                                    <span className="text-xs px-2 py-0.5 bg-[#222] rounded text-gray-300">{shot.type}</span>
                                </div>
                                <p className="text-sm text-gray-300 line-clamp-3 mb-2">{shot.description}</p>
                                {shot.image_url && (
                                    <img src={shot.image_url} alt={`Shot ${shot.order}`} className="w-full h-24 object-cover rounded-md bg-[#0d0d0d]" />
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-8 border border-dashed border-[#1a1a1a] rounded-md bg-[#1a1a1a]/20">
                        <p className="text-gray-500">No shots generated yet</p>
                    </div>
                )}
            </section>
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-[#1a1a1a] flex justify-end gap-3 bg-[#0d0d0d]/50 backdrop-blur-xl">
             {isEditing ? (
                 <>
                    <button 
                        onClick={() => { setIsEditing(false); setFormData(scene); }}
                        className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] text-white rounded-md text-sm font-medium transition-colors"
                        disabled={saving}
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        {saving ? <Wand2 className="h-4 w-4 animate-spin" /> : null} Save Changes
                    </button>
                 </>
             ) : (
                <>
                    {projectId && (
                        <Link
                            href={`/projects/${projectId}/creative-hub/scenes/${scene.id}`}
                            className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] text-gray-300 hover:text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                        >
                            <ExternalLink className="h-4 w-4" /> Open Full View
                        </Link>
                    )}
                    <button
                        onClick={() => setIsEditing(true)}
                        className="px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
                    >
                        <Edit className="h-4 w-4" /> Edit Scene
                    </button>
                    <button className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border border-red-500/20">
                        <Trash2 className="h-4 w-4" /> Delete
                    </button>
                </>
             )}
          </div>
          
          {/* Nested Modals */}
          {selectedSceneCharacter && (
              <SceneCharacterDetailModal 
                  sceneCharacter={selectedSceneCharacter}
                  scriptId={scene.script_id}
                  onClose={() => setSelectedSceneCharacter(null)}
                  onUpdate={() => {
                      fetchSceneCharacters(); // Refresh local characters list
                      // onUpdate(); // Optional: Refresh parent scene data if needed, but local fetch is faster
                      setSelectedSceneCharacter(null);
                  }}
              />
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
