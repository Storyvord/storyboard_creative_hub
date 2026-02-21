import { Shot, Scene, Character } from "@/types/creative-hub";
import { X, Film, Calendar, MapPin, User, ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";

interface ShotDetailModalProps {
  shot: Shot | null;
  scene: Scene | null;
  isOpen: boolean;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
  onGeneratePreviz?: (shotId: number) => void;
  showGenerateButton?: boolean;
  onRefresh?: () => void;
}

import { uploadPreviz, getShotPreviz } from "@/services/creative-hub";
import { toast } from "react-toastify";
import { Upload } from "lucide-react"; 

export default function ShotDetailModal({ 
    shot, 
    scene, 
    isOpen, 
    onClose, 
    onPrev, 
    onNext, 
    onGeneratePreviz, 
    showGenerateButton,
    onRefresh 
}: ShotDetailModalProps) {
  const [previzHistory, setPrevizHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (shot?.id) {
        fetchPrevizHistory();
    }
  }, [shot?.id]);

  const fetchPrevizHistory = async () => {
      if (!shot) return;
      setLoadingHistory(true);
      try {
          const history = await getShotPreviz(shot.id);
          setPrevizHistory(history);
      } catch (error) {
          console.error("Failed to fetch previz history", error);
      } finally {
          setLoadingHistory(false);
      }
  };

  const handlePrevizUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !shot) return;

      setUploading(true);
      try {
          await uploadPreviz(shot.id, file, scene?.id);
          toast.success("Previz uploaded successfully");
          fetchPrevizHistory();
          if (onRefresh) onRefresh();
      } catch (error) {
          console.error("Failed to upload previz", error);
          toast.error("Failed to upload previz");
      } finally {
          setUploading(false);
          // Reset input logic if needed
          e.target.value = '';
      }
  };

  if (!isOpen || !shot) return null;

  // Extract characters from scene if available, otherwise empty
  // Assuming scene.scene_characters is populated by the serializer
  const linkedCharacters = scene?.scene_characters || [];

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
        >
            <button
              onClick={onClose}
              className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white z-10 backdrop-blur-sm transition-colors"
            >
              <X className="h-6 w-6" />
            </button>

            {/* Left Column: Image & Navigation */}
            <div className="flex-1 bg-black flex flex-col relative group">
                <div className="flex-1 flex items-center justify-center p-4">
                    {shot.image_url ? (
                        <img src={shot.image_url} alt={`Shot ${shot.order}`} className="max-h-full max-w-full object-contain shadow-2xl" />
                    ) : (
                        <div className="text-gray-600 flex flex-col items-center gap-4">
                            <Film className="h-16 w-16 opacity-30" />
                            <span className="text-xl font-medium">No Previz Image Available</span>
                        </div>
                    )}
                </div>
                
                {/* Navigation Overlay */}
                <div className="absolute inset-0 flex items-center justify-between p-4 pointer-events-none">
                    {onPrev && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onPrev(); }}
                            className="p-3 bg-black/50 hover:bg-indigo-600/80 rounded-full text-white pointer-events-auto backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 transform hover:scale-110"
                        >
                            <ChevronLeft className="h-8 w-8" />
                        </button>
                    )}
                    {onNext && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onNext(); }}
                            className="p-3 bg-black/50 hover:bg-indigo-600/80 rounded-full text-white pointer-events-auto backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 transform hover:scale-110 ml-auto"
                        >
                            <ChevronRight className="h-8 w-8" />
                        </button>
                    )}
                </div>
            </div>

            {/* Right Column: Details */}
            <div className="w-full md:w-96 bg-gray-900 border-l border-gray-800 flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center gap-2 mb-2 text-sm text-indigo-400 font-medium tracking-wider uppercase">
                        <span>Shot {shot.order}</span>
                        <span className="w-1 h-1 bg-gray-600 rounded-full"></span>
                        <span>{shot.type}</span>
                    </div>
                    {scene && (
                        <h2 className="text-gray-400 text-sm mb-1">
                            Scene {scene.order}: {scene.scene_name}
                        </h2>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Description */}
                    <section>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                            Description
                        </h3>
                        <p className="text-gray-300 leading-relaxed text-sm bg-gray-800/30 p-3 rounded-lg border border-gray-800">
                            {shot.description}
                        </p>
                        
                           {showGenerateButton && onGeneratePreviz && (
                            <div className="flex gap-2 mt-4">
                                <button
                                    onClick={() => onGeneratePreviz(shot.id)}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-500 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Film className="w-4 h-4" />
                                    Generate Previz
                                </button>
                                
                                <label className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-2 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer border border-gray-600">
                                    {uploading ? <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/20 border-t-white"></div> : <Upload className="w-4 h-4" />}
                                    Upload Previz
                                    <input 
                                        type="file" 
                                        className="hidden" 
                                        accept="image/*"
                                        onChange={handlePrevizUpload}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>
                        )}
                    </section>

                    {/* Technical Details */}
                    <section>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                             Technical Specs
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-800">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Shot Type</span>
                                <span className="text-gray-200 text-sm font-medium">{shot.type || "-"}</span>
                            </div>
                            <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-800">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Movement</span>
                                <span className="text-gray-200 text-sm font-medium">{shot.movement || "-"}</span>
                            </div>
                            <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-800">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Camera Angle</span>
                                <span className="text-gray-200 text-sm font-medium">{shot.camera_angle || "-"}</span>
                            </div>
                             <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-800">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Lighting</span>
                                <span className="text-gray-200 text-sm font-medium">{shot.lighting || "-"}</span>
                            </div>
                        </div>
                         {shot.rationale && (
                             <div className="mt-3 bg-gray-800/50 p-3 rounded-lg border border-gray-800">
                                <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1">Rationale</span>
                                <p className="text-gray-300 text-xs italic">
                                    "{shot.rationale}"
                                </p>
                             </div>
                         )}
                    </section>

                    {/* Previz Details (if available) */}
                    {shot.previz && (
                        <section>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                                Previz Specs
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-800">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Aspect Ratio</span>
                                    <span className="text-gray-200 text-sm font-medium">{shot.previz.aspect_ratio || "16:9"}</span>
                                </div>
                                <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-800">
                                    <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Camera</span>
                                    <span className="text-gray-200 text-sm font-medium">{shot.previz.camera_angle || shot.camera_angle || "-"}</span>
                                </div>
                                {shot.previz.audio_url && (
                                     <div className="bg-gray-800/50 p-2.5 rounded-lg border border-gray-800 col-span-2">
                                        <span className="text-[10px] text-gray-500 uppercase tracking-wider block mb-0.5">Audio</span>
                                        <a href={shot.previz.audio_url} target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:text-indigo-300 text-sm truncate block">
                                            Open Audio File
                                        </a>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Linked Characters */}
                    <section>
                         <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                             <User className="h-4 w-4 text-indigo-500" />
                             Linked Characters
                        </h3>
                        {linkedCharacters.length > 0 ? (
                            <div className="space-y-3">
                                {linkedCharacters.map((char: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-3 bg-gray-800/50 p-2 rounded-lg border border-gray-800">
                                         <div className="w-8 h-8 bg-gray-700 rounded-full overflow-hidden flex-shrink-0">
                                            {/* Assuming scene_character object has character details nested or flattened. 
                                                Adjusting based on typical serializer output. 
                                                If it's just ID, we might need to fetch. 
                                                For now rendering name if available safely. */}
                                             {char.character?.image_url || char.image_url ? (
                                                 <img src={char.character?.image_url || char.image_url} className="w-full h-full object-cover" />
                                             ) : (
                                                 <User className="h-4 w-4 m-auto mt-2 text-gray-500" />
                                             )}
                                         </div>
                                         <span className="text-sm text-gray-300">{char.character_name || char.name || "Unknown Character"}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500 italic">No specific characters linked to this scene.</p>
                        )}
                    </section>

                    {/* Previz History */}
                    <section>
                        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                             <Clock className="h-4 w-4 text-pink-500" />
                             Previz History
                        </h3>
                        {loadingHistory ? (
                            <div className="text-xs text-gray-500">Loading history...</div>
                        ) : previzHistory.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {previzHistory.map((previz: any, idx) => (
                                    <div key={idx} className="aspect-video bg-gray-800 rounded overflow-hidden border border-indigo-500/50 ring-2 ring-indigo-500/20 group relative">
                                        <img src={previz.image_url} className="w-full h-full object-cover opacity-100" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-[10px] text-white">Full Size</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-gray-500">No history available.</p>
                        )}
                    </section>
                </div>
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
