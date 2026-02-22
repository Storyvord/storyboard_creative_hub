import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Shirt, Wand2, Save, Plus, Upload, User } from "lucide-react";
import { Cloth, Script } from "@/types/creative-hub";
import { getCloths, updateSceneCharacter, generateSceneCharacterImage, createCloth, updateCharacter, getBulkTaskStatus } from "@/services/creative-hub";
import { toast } from "react-toastify";
import { Loader2 } from "lucide-react";

interface SceneCharacterDetailModalProps {
  sceneCharacter: any;
  scriptId: number;
  onClose: () => void;
  onUpdate: () => void;
}

const CLOTH_SLOTS = [
  { id: 'head', label: 'Head' },
  { id: 'face', label: 'Face' },
  { id: 'torso', label: 'Torso' },
  { id: 'legs', label: 'Legs' },
  { id: 'feet', label: 'Feet' },
  { id: 'hands', label: 'Hands' },
  { id: 'full_body', label: 'Full Body' },
  { id: 'accessories', label: 'Accessories' },
];

export default function SceneCharacterDetailModal({ sceneCharacter, scriptId, onClose, onUpdate }: SceneCharacterDetailModalProps) {
  const [activeSlot, setActiveSlot] = useState<string>("torso");
  const [availableCloths, setAvailableCloths] = useState<Cloth[]>([]);
  const [selectedCloths, setSelectedCloths] = useState<Record<string, Cloth | null>>({});
  const [loadingCloths, setLoadingCloths] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState("");
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (scriptId) {
      fetchCloths();
    }
  }, [scriptId]);

  useEffect(() => {
    if (sceneCharacter) {
      const initialSelection: Record<string, Cloth | null> = {};
      
      if (sceneCharacter.cloths && Array.isArray(sceneCharacter.cloths)) {
          sceneCharacter.cloths.forEach((cloth: Cloth) => {
              if (cloth.cloth_type) {
                  initialSelection[cloth.cloth_type] = cloth;
              }
          });
      }
      setSelectedCloths(initialSelection);
      setEditPrompt(sceneCharacter.notes || "");
    }
  }, [sceneCharacter]);

  // Poll for background generation tasks
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTaskId) {
       checkTasks();
       interval = setInterval(checkTasks, 5000);
    }
    return () => clearInterval(interval);
  }, [activeTaskId]);

  const checkTasks = async () => {
      try {
          if (!activeTaskId) return;
          const data = await getBulkTaskStatus([activeTaskId]);
          const tasks = data?.tasks || [];
          
          if (tasks.length > 0) {
              const activeTask = tasks[0];
              
              if (activeTask.status === 'processing' || activeTask.status === 'pending' || activeTask.status === 'retrying' || activeTask.status === 'started') {
                  setGenerating(true);
              } else {
                  setGenerating(false);
                  setActiveTaskId(null); // Stop polling

                  if (activeTask.status === 'success' || activeTask.status === 'completed') {
                      onUpdate(); // refresh data
                  } else if (activeTask.status === 'failed' || activeTask.status === 'failure') {
                      toast.error(`Generation failed: ${activeTask.error || "Unknown error"}`);
                  }
              }
          }
      } catch (err) {
          console.error("Failed to check tasks for scene character", err);
      }
  };

  const fetchCloths = async () => {
    setLoadingCloths(true);
    try {
      const data = await getCloths(scriptId);
      setAvailableCloths(data || []);
    } catch (error) {
      console.error("Failed to fetch cloths", error);
      toast.error("Failed to load wardrobe");
    } finally {
      setLoadingCloths(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!activeSlot || activeSlot === 'full_body') {
          // Maybe full_body is okay, but accessories might need type clarification if generic?
          // For now, assume activeSlot is the target type.
      }

      setUploading(true);
      try {
          const newCloth = await createCloth(scriptId, {
              name: file.name.split('.')[0], // Default name from filename
              cloth_type: activeSlot,
              image: file
          });
          
          toast.success("Item added to wardrobe");
          // Refresh wardrobe
          await fetchCloths();
          // Auto-select the new item?
          handleClothSelect(newCloth);
      } catch (error) {
          console.error("Failed to upload cloth", error);
          toast.error("Failed to upload item");
      } finally {
          setUploading(false);
          // Reset input
          if (fileInputRef.current) fileInputRef.current.value = "";
      }
  };

  const handleUploadClick = () => {
      fileInputRef.current?.click();
  };

  const handleCharacterImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'scene' | 'base') => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      try {
          if (type === 'scene') {
              await updateSceneCharacter(sceneCharacter.id, {
                  image_url: file
              });
              toast.success("Scene character image updated");
          } else {
              if (sceneCharacter.character?.id) {
                  await updateCharacter(sceneCharacter.character.id, {
                      image_url: file
                  });
                  toast.success("Base character appearance updated");
              } else {
                  toast.error("No base character linked");
              }
          }
          onUpdate();
      } catch (error) {
          console.error(`Failed to upload ${type} image`, error);
          toast.error("Failed to upload image");
      } finally {
          setUploading(false);
          // Reset input logic if needed, though inputs are inline
      }
  };

  const handleClothSelect = (cloth: Cloth) => {
      setSelectedCloths(prev => ({
          ...prev,
          [activeSlot]: cloth.id === prev[activeSlot]?.id ? null : cloth // Toggle
      }));
  };

  const handleSave = async () => {
      setSaving(true);
      try {
          const clothIds = Object.values(selectedCloths)
              .filter(c => c !== null)
              .map(c => c!.id);

          await updateSceneCharacter(sceneCharacter.id, {
              cloth_ids: clothIds,
              notes: editPrompt
          });
          toast.success("Character updated successfully");
          onUpdate();
      } catch (error: any) {
          console.error("Failed to update character", error);
          const errorMsg = error?.response?.data?.error || error?.message || "Failed to update character";
          toast.error(errorMsg);
      } finally {
          setSaving(false);
      }
  };

  const handleGenerate = async () => {
      setGenerating(true);
      try {
          const res = await generateSceneCharacterImage(sceneCharacter.id, editPrompt);
          toast.success("Image generation started. It will update shortly.");
          if (res && res.task_id) {
              setActiveTaskId(res.task_id);
          }
      } catch (error: any) {
          console.error("Failed to generate image", error);
          const errorMsg = error?.response?.data?.error || error?.message || "Failed to trigger generation. Please check your credits or try again.";
          toast.error(errorMsg);
          setGenerating(false);
      }
  };

  const filteredCloths = availableCloths.filter(c => c.cloth_type === activeSlot);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-800 p-6">
                <div>
                    <h3 className="text-xl font-bold leading-6 text-white flex items-center gap-2">
                    Fitting Room: <span className="text-indigo-400">{sceneCharacter?.character?.name}</span>
                    </h3>
                    <p className="text-sm text-gray-400 mt-1">Customize appearance for this scene</p>
                </div>
                <button
                onClick={onClose}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
                >
                <X className="h-5 w-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
                {/* Left: Character Preview */}
                <div className="w-full lg:w-1/3 bg-black/50 p-6 flex flex-col items-center border-b lg:border-r border-gray-800 overflow-y-auto">
                    <div className="relative w-full aspect-[3/4] max-w-sm rounded-xl overflow-hidden border border-gray-700 bg-gray-800 flex-shrink-0 group/image">
                            {/* Primary Image: Scene Character Image */}
                            {sceneCharacter?.image_url ? (
                                <img 
                                src={sceneCharacter.image_url} 
                                alt="Scene Appearance" 
                                className="w-full h-full object-cover"
                                />
                            ) : (
                                /* Fallback: Script Character Image */
                                sceneCharacter?.character?.image_url ? (
                                <div className="w-full h-full relative">
                                    <img 
                                        src={sceneCharacter.character.image_url} 
                                        alt="Base Character" 
                                        className="w-full h-full object-cover opacity-80"
                                    />
                                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                        <span className="px-3 py-1 bg-black/60 text-white text-xs rounded-full backdrop-blur-md border border-white/10">Base Appearance</span>
                                    </div>
                                </div>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-500 flex-col gap-2">
                                        <Shirt className="h-10 w-10 opacity-20" />
                                        <span>No Image</span>
                                    </div>
                                )
                            )}

                            {/* Upload Overlay - Always visible at bottom with high z-index */}
                            <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/95 via-black/80 to-transparent flex items-center justify-center gap-3 z-20">
                                <label className="flex flex-col items-center gap-1 cursor-pointer hover:scale-105 transition-transform group/btn">
                                    <div className="p-2 bg-indigo-600 rounded-full text-white shadow-lg group-hover/btn:bg-indigo-500 ring-2 ring-black">
                                        <Upload className="h-4 w-4" />
                                    </div>
                                    <span className="text-[10px] font-bold text-white uppercase tracking-wider shadow-sm bg-black/50 px-1 rounded">Scene Look</span>
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={(e) => handleCharacterImageUpload(e, 'scene')}
                                    />
                                </label>
                            </div>

                            {/* Fallback Reference Overlay (Small) */}
                            {sceneCharacter?.image_url && sceneCharacter?.character?.image_url && (
                                <div className="absolute bottom-2 right-2 w-16 h-16 rounded-lg border-2 border-gray-700 overflow-hidden shadow-lg z-10">
                                    <img src={sceneCharacter.character.image_url} alt="Ref" className="w-full h-full object-cover" />
                                </div>
                            )}
                    </div>

                    <div className="mt-6 w-full max-w-sm space-y-3">
                        <div>
                            <label className="text-xs text-gray-500 uppercase font-bold tracking-wider mb-1 block">Appearance Notes / Prompt</label>
                            <textarea 
                                value={editPrompt}
                                onChange={(e) => setEditPrompt(e.target.value)}
                                placeholder="Describe specific changes for this scene (e.g. 'wearing a red dress', 'dirty face')..."
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-gray-200 focus:outline-none focus:border-indigo-500 resize-none h-24"
                            />
                        </div>
                        
                        <button
                            onClick={handleGenerate}
                            disabled={generating || uploading || saving}
                            className={`w-full py-3 ${generating ? 'bg-indigo-600/50 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-500'} text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center justify-center gap-2 group`}
                        >
                            {generating ? (
                                <>
                                    <Wand2 className="h-5 w-5 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="h-5 w-5 group-hover:scale-110 transition-transform" />
                                    Generate New Look
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right: Wardrobe Selection */}
                <div className="w-full lg:w-2/3 flex flex-col h-full bg-gray-900">
                    {/* Slots Navigation */}
                    <div className="flex overflow-x-auto p-2 border-b border-gray-800 gap-2 hide-scrollbar bg-gray-900">
                        {CLOTH_SLOTS.map(slot => (
                            <button
                                key={slot.id}
                                onClick={() => setActiveSlot(slot.id)}
                                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors flex flex-col items-center gap-1 ${
                                    activeSlot === slot.id 
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' 
                                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200'
                                }`}
                            >
                                {slot.label}
                                {selectedCloths[slot.id] && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Cloth Grid */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-900/50">
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileUpload}
                        />

                        {loadingCloths ? (
                            <div className="flex items-center justify-center h-full text-gray-500">Loading wardrobe...</div>
                        ) : (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                {/* Upload New Item Button */}
                                <div 
                                    onClick={handleUploadClick}
                                    className="aspect-square rounded-xl border-2 border-dashed border-gray-700 hover:border-indigo-500 hover:bg-gray-800 transition-all cursor-pointer flex flex-col items-center justify-center text-gray-500 hover:text-indigo-400 gap-2 group"
                                >
                                    {uploading ? (
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
                                    ) : (
                                        <>
                                            <div className="p-3 rounded-full bg-gray-800 group-hover:bg-indigo-500/20 transition-colors">
                                                <Plus className="h-6 w-6" />
                                            </div>
                                            <span className="text-xs font-medium">Add {CLOTH_SLOTS.find(s => s.id === activeSlot)?.label}</span>
                                        </>
                                    )}
                                </div>

                                {filteredCloths.map(cloth => (
                                    <div 
                                        key={cloth.id}
                                        onClick={() => handleClothSelect(cloth)}
                                        className={`group relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                                            selectedCloths[activeSlot]?.id === cloth.id
                                            ? 'border-indigo-500 ring-2 ring-indigo-500/30'
                                            : 'border-gray-700 hover:border-gray-500'
                                        }`}
                                    >
                                        {cloth.image_url ? (
                                            <img src={cloth.image_url} alt={cloth.name} className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-600">
                                                <Shirt className="h-8 w-8" />
                                            </div>
                                        )}
                                        <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm p-2">
                                            <p className="text-xs text-white font-medium truncate">{cloth.name}</p>
                                        </div>
                                        
                                        {selectedCloths[activeSlot]?.id === cloth.id && (
                                            <div className="absolute top-2 right-2 bg-indigo-500 text-white p-1 rounded-full shadow-lg">
                                                <Wand2 className="h-3 w-3" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        
                        {/* Empty State message if no cloths and not loading (but upload button is always there) */}
                        {!loadingCloths && filteredCloths.length === 0 && (
                            <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                                <p>No existing items found for {CLOTH_SLOTS.find(s => s.id === activeSlot)?.label}</p>
                                <p className="text-xs mt-1">Added items will appear above.</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-800 bg-gray-900 flex justify-between items-center bg-gray-900">
                        <div className="text-sm text-gray-400">
                            <span className="text-white font-bold">{Object.keys(selectedCloths).filter(k => selectedCloths[k]).length}</span> items selected
                        </div>
                        <button
                            onClick={handleSave}
                            disabled={saving || generating || uploading}
                            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Outfit
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
