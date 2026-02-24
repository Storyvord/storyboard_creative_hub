import { Shot, Scene, Character } from "@/types/creative-hub";
import { X, Film, User, ChevronLeft, ChevronRight, Clock, AlertTriangle, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { uploadPreviz, getShotPreviz } from "@/services/creative-hub";
import { toast } from "react-toastify";

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
  error?: string;
}

export default function ShotDetailModal({ 
    shot, scene, isOpen, onClose, onPrev, onNext, 
    onGeneratePreviz, showGenerateButton, onRefresh, error
}: ShotDetailModalProps) {
  const [previzHistory, setPrevizHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (shot?.id) fetchPrevizHistory();
  }, [shot?.id]);

  const fetchPrevizHistory = async () => {
      if (!shot) return;
      setLoadingHistory(true);
      try { const history = await getShotPreviz(shot.id); setPrevizHistory(history); }
      catch (error) { console.error("Failed to fetch previz history", error); }
      finally { setLoadingHistory(false); }
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
      } catch (error) { console.error("Failed to upload previz", error); toast.error("Failed to upload previz"); }
      finally { setUploading(false); e.target.value = ''; }
  };

  if (!isOpen || !shot) return null;

  const linkedCharacters = scene?.scene_characters || [];

  return (
    <AnimatePresence>
      <motion.div
        key="shot-detail-overlay"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.97, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-md w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
        >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-md text-white z-10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Left Column: Image */}
            <div className="flex-1 bg-black flex flex-col relative group">
                <div className="flex-1 flex items-center justify-center p-4">
                    {shot.image_url ? (
                        <img src={shot.image_url} alt={`Shot ${shot.order}`} className="max-h-full max-w-full object-contain" />
                    ) : (
                        <div className="text-[#333] flex flex-col items-center gap-3">
                            <Film className="h-12 w-12 opacity-30" />
                            <span className="text-sm font-medium">No Previz Available</span>
                        </div>
                    )}
                </div>
                
                {/* Navigation */}
                <div className="absolute inset-0 flex items-center justify-between p-4 pointer-events-none">
                    {onPrev && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onPrev(); }}
                            className="p-2.5 bg-black/60 hover:bg-emerald-600/80 rounded-md text-white pointer-events-auto transition-all opacity-0 group-hover:opacity-100"
                        >
                            <ChevronLeft className="h-6 w-6" />
                        </button>
                    )}
                    {onNext && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onNext(); }}
                            className="p-2.5 bg-black/60 hover:bg-emerald-600/80 rounded-md text-white pointer-events-auto transition-all opacity-0 group-hover:opacity-100 ml-auto"
                        >
                            <ChevronRight className="h-6 w-6" />
                        </button>
                    )}
                </div>
            </div>

            {/* Right Column: Details */}
            <div className="w-full md:w-96 bg-[#0d0d0d] border-l border-[#1a1a1a] flex flex-col overflow-hidden">
                <div className="p-5 border-b border-[#1a1a1a]">
                    <div className="flex items-center gap-2 mb-1 text-xs font-medium tracking-wider uppercase">
                        <span className="text-emerald-400">Shot {shot.order}</span>
                        <span className="w-1 h-1 bg-[#333] rounded-full"></span>
                        <span className="text-[#888]">{shot.type}</span>
                    </div>
                    {scene && (
                        <h2 className="text-[#555] text-xs">
                            Scene {scene.order}: {scene.scene_name}
                        </h2>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {/* Error */}
                    {error && (
                        <div className="bg-red-950/40 border border-red-900/50 rounded-md p-3 flex gap-2.5 items-start">
                             <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                             <div>
                                 <h4 className="text-red-400 text-xs font-bold mb-0.5">Generation Failed</h4>
                                 <p className="text-red-300/70 text-[10px] leading-relaxed whitespace-pre-wrap">{error}</p>
                             </div>
                        </div>
                    )}

                    {/* Description */}
                    <section>
                        <h3 className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2">Description</h3>
                        <p className="text-[#999] leading-relaxed text-sm bg-[#111] p-3 rounded-md border border-[#1a1a1a]">
                            {shot.description}
                        </p>
                        
                        {showGenerateButton && onGeneratePreviz && (
                            <div className="flex gap-2 mt-3">
                                <button
                                    onClick={() => onGeneratePreviz(shot.id)}
                                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2"
                                >
                                    <Film className="w-3.5 h-3.5" />
                                    Generate Previz
                                </button>
                                <label className="flex-1 bg-[#1a1a1a] hover:bg-[#222] text-white py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2 cursor-pointer border border-[#333]">
                                    {uploading ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white"></div> : <Upload className="w-3.5 h-3.5" />}
                                    Upload Previz
                                    <input type="file" className="hidden" accept="image/*" onChange={handlePrevizUpload} disabled={uploading} />
                                </label>
                            </div>
                        )}
                    </section>

                    {/* Technical Details */}
                    <section>
                        <h3 className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2">Technical Specs</h3>
                        <div className="grid grid-cols-2 gap-2">
                            <div className="bg-[#111] p-2.5 rounded-md border border-[#1a1a1a]">
                                <span className="text-[9px] text-[#444] uppercase tracking-wider block mb-0.5">Shot Type</span>
                                <span className="text-[#ccc] text-xs font-medium">{shot.type || "—"}</span>
                            </div>
                            <div className="bg-[#111] p-2.5 rounded-md border border-[#1a1a1a]">
                                <span className="text-[9px] text-[#444] uppercase tracking-wider block mb-0.5">Movement</span>
                                <span className="text-[#ccc] text-xs font-medium">{shot.movement || "—"}</span>
                            </div>
                            <div className="bg-[#111] p-2.5 rounded-md border border-[#1a1a1a]">
                                <span className="text-[9px] text-[#444] uppercase tracking-wider block mb-0.5">Camera Angle</span>
                                <span className="text-[#ccc] text-xs font-medium">{shot.camera_angle || "—"}</span>
                            </div>
                             <div className="bg-[#111] p-2.5 rounded-md border border-[#1a1a1a]">
                                <span className="text-[9px] text-[#444] uppercase tracking-wider block mb-0.5">Lighting</span>
                                <span className="text-[#ccc] text-xs font-medium">{shot.lighting || "—"}</span>
                            </div>
                        </div>
                         {shot.rationale && (
                             <div className="mt-2 bg-[#111] p-3 rounded-md border border-[#1a1a1a]">
                                <span className="text-[9px] text-[#444] uppercase tracking-wider block mb-1">Rationale</span>
                                <p className="text-[#888] text-xs italic">"{shot.rationale}"</p>
                             </div>
                         )}
                    </section>

                    {/* Previz Details */}
                    {shot.previz && (
                        <section>
                            <h3 className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2">Previz Specs</h3>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="bg-[#111] p-2.5 rounded-md border border-[#1a1a1a]">
                                    <span className="text-[9px] text-[#444] uppercase tracking-wider block mb-0.5">Aspect Ratio</span>
                                    <span className="text-[#ccc] text-xs font-medium">{shot.previz.aspect_ratio || "16:9"}</span>
                                </div>
                                <div className="bg-[#111] p-2.5 rounded-md border border-[#1a1a1a]">
                                    <span className="text-[9px] text-[#444] uppercase tracking-wider block mb-0.5">Camera</span>
                                    <span className="text-[#ccc] text-xs font-medium">{shot.previz.camera_angle || shot.camera_angle || "—"}</span>
                                </div>
                                {shot.previz.audio_url && (
                                     <div className="bg-[#111] p-2.5 rounded-md border border-[#1a1a1a] col-span-2">
                                        <span className="text-[9px] text-[#444] uppercase tracking-wider block mb-0.5">Audio</span>
                                        <a href={shot.previz.audio_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs truncate block">
                                            Open Audio File
                                        </a>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {/* Linked Characters */}
                    <section>
                         <h3 className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                             <User className="h-3 w-3 text-emerald-500" />
                             Linked Characters
                        </h3>
                        {linkedCharacters.length > 0 ? (
                            <div className="space-y-2">
                                {linkedCharacters.map((char: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-2.5 bg-[#111] p-2 rounded-md border border-[#1a1a1a]">
                                         <div className="w-7 h-7 bg-[#1a1a1a] rounded-full overflow-hidden flex-shrink-0">
                                             {char.character?.image_url || char.image_url ? (
                                                 <img src={char.character?.image_url || char.image_url} className="w-full h-full object-cover" />
                                             ) : (
                                                 <User className="h-3 w-3 m-auto mt-2 text-[#444]" />
                                             )}
                                         </div>
                                         <span className="text-xs text-[#999]">{char.character_name || char.name || "Unknown"}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-[#444] italic">No characters linked.</p>
                        )}
                    </section>

                    {/* Previz History */}
                    <section>
                        <h3 className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                             <Clock className="h-3 w-3 text-emerald-500" />
                             Previz History
                        </h3>
                        {loadingHistory ? (
                            <div className="text-[10px] text-[#444]">Loading...</div>
                        ) : previzHistory.length > 0 ? (
                            <div className="grid grid-cols-3 gap-2">
                                {previzHistory.map((previz: any, idx) => (
                                    <div key={idx} className="aspect-video bg-[#0a0a0a] rounded-md overflow-hidden border border-[#222] group relative">
                                        <img src={previz.image_url} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <span className="text-[9px] text-white">View</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] text-[#444]">No history available.</p>
                        )}
                    </section>
                </div>
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
