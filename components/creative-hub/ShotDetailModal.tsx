import { Shot, Scene, Character } from "@/types/creative-hub";
import { X, Film, User, ChevronLeft, ChevronRight, Clock, AlertTriangle, Upload } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { uploadPreviz, getShotPreviz, setActivePreviz, getStoryboardData } from "@/services/creative-hub";
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
  onUpdateShot?: (shotId: number, field: string, value: any) => void;
  error?: string;
  isGenerating?: boolean;
}

export default function ShotDetailModal({ 
    shot, scene, isOpen, onClose, onPrev, onNext, 
    onGeneratePreviz, showGenerateButton, onRefresh, onUpdateShot, error, isGenerating
}: ShotDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'shot' | 'script'>('shot');
  const [previzHistory, setPrevizHistory] = useState<any[]>([]);
  const [scriptPreviz, setScriptPreviz] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settingActive, setSettingActive] = useState(false);

  useEffect(() => {
    if (shot?.id) {
        fetchPrevizHistory();
    }
  }, [shot?.id]);
  
  useEffect(() => {
    if (activeTab === 'script' && (scene?.script_id || scene?.script)) {
        fetchScriptPreviz();
    }
  }, [activeTab, scene?.script_id, scene?.script]);

  const fetchPrevizHistory = async () => {
      if (!shot) return;
      setLoadingHistory(true);
      try { const history = await getShotPreviz(shot.id); setPrevizHistory(history); }
      catch (error) { console.error("Failed to fetch previz history", error); }
      finally { setLoadingHistory(false); }
  };

  const fetchScriptPreviz = async () => {
      const scriptId = scene?.script_id || scene?.script;
      if (!scriptId) return;
      setLoadingHistory(true);
      try { 
          // getStoryboardData returns scenes and unstructured shots, but we need raw unassigned previz primarily.
          // In a real app we'd want a specific endpoint for script history. For now, since creative space uses createScriptPrevisualization,
          // it likely creates without shot assignment. We will try fetching all previz for the script.
          // Wait, getStoryboardData(scriptId) returns scenes with nested shots.
          // For simplicity, we'll hit `/api/creative_hub/previsualization/list/?script_id=${scriptId}` manually or adjust service.
          // The backend list endpoint supports script_id and returns plain objects if not V2.
          const { default: api } = await import('@/services/api');
          const res = await api.get(`/api/creative_hub/previsualization/list/?script_id=${scriptId}`);
          if (res.status === 200) {
              const data = res.data;
              setScriptPreviz(Array.isArray(data) ? data : data.results || []);
          }
      }
      catch (error) { console.error("Failed to fetch script previz", error); }
      finally { setLoadingHistory(false); }
  };

  const handleSetActive = async (previzId: number) => {
      if (!shot) return;
      setSettingActive(true);
      try {
          await setActivePreviz(shot.id, previzId);
          toast.success("Active previz updated");
          // Immediately update local state in parent
          if (onUpdateShot) {
             onUpdateShot(shot.id, 'active_previz', previzId);
             
             // Try to find the image URL from history or script previz to also update the local preview instantly
             const matchedPreviz = previzHistory.find(p => p.id === previzId) || scriptPreviz.find(p => p.id === previzId);
             if (matchedPreviz) {
                 onUpdateShot(shot.id, 'image_url', matchedPreviz.image_url);
                 // We can also update the whole previz object if we want
                 onUpdateShot(shot.id, 'previz', matchedPreviz);
             }
          }
          if (onRefresh) onRefresh();
      } catch (error) {
          console.error("Failed to set active previz", error);
          toast.error("Failed to update active previz");
      } finally {
          setSettingActive(false);
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
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
                            <span className="text-emerald-400">Shot {shot.order}</span>
                            <span className="w-1 h-1 bg-[#333] rounded-full"></span>
                            <span className="text-[#888]">{shot.type}</span>
                        </div>
                    </div>
                    {scene && (
                        <h2 className="text-[#555] text-xs">
                            Scene {scene.order}: {scene.scene_name}
                        </h2>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[#1a1a1a] px-4">
                    <button 
                        onClick={() => setActiveTab('shot')}
                        className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'shot' ? 'border-emerald-500 text-white' : 'border-transparent text-[#666] hover:text-[#999]'}`}
                    >
                        Shot Details
                    </button>
                    <button 
                        onClick={() => setActiveTab('script')}
                        className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'script' ? 'border-emerald-500 text-white' : 'border-transparent text-[#666] hover:text-[#999]'}`}
                    >
                        Script Previz
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                    {activeTab === 'shot' ? (
                        <>
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
                                            disabled={isGenerating}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isGenerating ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white"></div> : <Film className="w-3.5 h-3.5" />}
                                            {isGenerating ? "Generating..." : "Generate Previz"}
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
                                                     {char.image_url ? (
                                                         <img src={char.image_url} className="w-full h-full object-cover" alt={char.character?.name || char.character_name || "Character"} />
                                                     ) : char.character?.image_url ? (
                                                         <img src={char.character.image_url} className="w-full h-full object-cover opacity-80" alt={char.character.name} />
                                                     ) : (
                                                         <User className="h-3 w-3 m-auto mt-2 text-[#444]" />
                                                     )}
                                                 </div>
                                                 <span className="text-xs text-[#999]">{char.character_name || char.character?.name || char.name || "Unknown"}</span>
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
                                    <div className="grid grid-cols-2 gap-3">
                                        {previzHistory.map((previz: any, idx) => (
                                            <div key={idx} className={`bg-[#0a0a0a] rounded-md overflow-hidden border ${shot.active_previz === previz.id ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'border-[#222]'} group relative flex flex-col`}>
                                                <div className="aspect-video relative">
                                                    <img src={previz.image_url} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-2">
                                                        <button 
                                                            disabled={settingActive || shot.active_previz === previz.id}
                                                            onClick={() => handleSetActive(previz.id)}
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-3 py-1.5 rounded disabled:opacity-50 disabled:bg-[#333]"
                                                        >
                                                            {shot.active_previz === previz.id ? 'Active' : 'Set Active'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="p-2 border-t border-[#1a1a1a] flex flex-col gap-1">
                                                    {previz.added_by ? (
                                                        <div className="flex items-center gap-1.5 text-[#666]">
                                                            <User className="w-3 h-3 text-emerald-500/80" />
                                                            <span className="text-[9px] truncate" title={previz.added_by.email}>{previz.added_by.name || previz.added_by.email}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-[#444]">
                                                            <User className="w-3 h-3" />
                                                            <span className="text-[9px]">API Generated</span>
                                                        </div>
                                                    )}
                                                    {previz.assignment_date && (
                                                        <div className="text-[8px] text-[#444]">
                                                            Linked: {new Date(previz.assignment_date).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-[#444]">No history available.</p>
                                )}
                            </section>
                        </>
                    ) : (
                        <section>
                            <h3 className="text-[10px] font-bold text-[#555] uppercase tracking-widest mb-4">Script Previz Bank</h3>
                            {loadingHistory ? (
                                <div className="text-[10px] text-[#444]">Loading...</div>
                            ) : scriptPreviz.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {scriptPreviz.map((previz: any, idx) => (
                                        <div key={idx} className="bg-[#0a0a0a] rounded-md overflow-hidden border border-[#222] group relative flex flex-col">
                                            <div className="aspect-video relative">
                                                <img src={previz.image_url} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-2">
                                                    <button 
                                                        disabled={settingActive || shot.active_previz === previz.id}
                                                        onClick={() => handleSetActive(previz.id)}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-3 py-1.5 rounded disabled:opacity-50 disabled:bg-[#333]"
                                                    >
                                                        {shot.active_previz === previz.id ? 'Active' : 'Link to Shot'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-2 border-t border-[#1a1a1a] flex flex-col gap-1">
                                                {previz.description && (
                                                    <p className="text-[9px] text-[#666] line-clamp-2" title={previz.description}>
                                                        "{previz.description}"
                                                    </p>
                                                )}
                                                {previz.added_by ? (
                                                    <div className="flex items-center gap-1.5 text-[#666]">
                                                        <User className="w-3 h-3 text-emerald-500/80" />
                                                        <span className="text-[9px] truncate" title={previz.added_by.email}>{previz.added_by.name || previz.added_by.email}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-[#444]">
                                                        <User className="w-3 h-3" />
                                                        <span className="text-[9px]">Script Level</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] text-[#444]">No script-level previz available.</p>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
