import { Shot, Scene, Character } from "@/types/creative-hub";
import { X, Film, User, ChevronLeft, ChevronRight, Clock, AlertTriangle, Upload, Pencil, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { uploadPreviz, getShotPreviz, setActivePreviz, getStoryboardData, editPrevizWithPrompt, updateShotDetails, getCameraAngles, CameraAngle, getShotTypes, ShotType } from "@/services/creative-hub";
import CameraAngleSelector from "@/components/creative-hub/CameraAngleSelector";
import ShotTypeSelector from "@/components/creative-hub/ShotTypeSelector";
import PrevizReferenceStrip from "@/components/creative-hub/PrevizReferenceStrip";
import ModelSelector from "@/components/creative-hub/ModelSelector";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import MentionTextarea, { TaggedCharacter, SceneCharacterItem, GlobalCharacterItem } from "@/components/creative-hub/MentionTextarea";


const MOVEMENT_OPTIONS = [
    "Static",
    "Pan",
    "Tilt",
    "Dolly In",
    "Dolly Out",
    "Truck Left",
    "Truck Right",
    "Crane Up",
    "Crane Down",
    "Handheld",
    "Steadicam",
    "Zoom In",
    "Zoom Out",
    "Other",
];

const LIGHTING_OPTIONS = [
    "Natural",
    "Soft",
    "Hard",
    "High Key",
    "Low Key",
    "Backlit",
    "Silhouette",
    "Golden Hour",
    "Night",
    "Neon",
    "Other",
];

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
  onTagsChange?: (shotId: number, tags: TaggedCharacter[]) => void;
  error?: string;
  isGenerating?: boolean;
  globalCharacters?: GlobalCharacterItem[];
}

export default function ShotDetailModal({ 
    shot, scene, isOpen, onClose, onPrev, onNext, 
    onGeneratePreviz, showGenerateButton, onRefresh, onUpdateShot, onTagsChange, error, isGenerating,
    globalCharacters = []
}: ShotDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'shot' | 'script'>('shot');
  const [previzHistory, setPrevizHistory] = useState<any[]>([]);
  const [scriptPreviz, setScriptPreviz] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [settingActive, setSettingActive] = useState(false);
    const [savingDetails, setSavingDetails] = useState(false);
    const [detailsForm, setDetailsForm] = useState({
        description: "",
        type: "Wide Shot",
        movement: "",
        camera_angle: "",
        lighting: "",
    });
  const [editPrompt, setEditPrompt] = useState('');
  const [isEditingPreviz, setIsEditingPreviz] = useState(false);
  const [taggedCharacterIds, setTaggedCharacterIds] = useState<TaggedCharacter[]>([]);
  const [cameraAngles, setCameraAngles] = useState<CameraAngle[]>([]);
  const [shotTypes, setShotTypes] = useState<ShotType[]>([]);
  const [activeTextTab, setActiveTextTab] = useState<'description' | 'edit'>('description');
  const [showEditModelSelector, setShowEditModelSelector] = useState(false);

  useEffect(() => {
    getCameraAngles().then(setCameraAngles).catch(() => {});
    getShotTypes().then(setShotTypes).catch(() => {});
  }, []);

  const hasActivePrevizImage = !!shot?.image_url;
    const hasEditPrompt = !!editPrompt.trim();
    const isDetailsDirty = !!shot && (
        detailsForm.description !== (shot.description || "") ||
        detailsForm.type !== (shot.type || "Wide Shot") ||
        detailsForm.movement !== (shot.movement || "") ||
        detailsForm.camera_angle !== (shot.camera_angle || "") ||
        detailsForm.lighting !== (shot.lighting || "")
    );

    const disableDetails = hasEditPrompt;
    const disableEditPrompt = isDetailsDirty && !hasEditPrompt;

  useEffect(() => {
    if (shot?.id) {
        fetchPrevizHistory();
                setDetailsForm({
                        description: shot.description || "",
                        type: shot.type || "Wide Shot",
                        movement: shot.movement || "",
                        camera_angle: shot.camera_angle || "",
                        lighting: shot.lighting || "",
                });
                setEditPrompt("");
    }
  }, [shot?.id]);
  
  useEffect(() => {
    if (activeTab === 'script' && (scene?.script_id || scene?.script)) {
        fetchScriptPreviz();
    }
  }, [activeTab, scene?.script_id, scene?.script]);

  // When generation finishes (isGenerating flips false→true→false), refresh previz history
  // and update the displayed image from the latest shot prop.
  const prevIsGenerating = useRef<boolean>(false);
  useEffect(() => {
    if (prevIsGenerating.current && !isGenerating) {
      fetchPrevizHistory();
    }
    prevIsGenerating.current = !!isGenerating;
  }, [isGenerating]);

  const fetchPrevizHistory = async () => {
      if (!shot) return;
      setLoadingHistory(true);
      try {
          const history = await getShotPreviz(shot.id);
          const sortedHistory = [...history].sort((a: any, b: any) => {
              const aTime = a?.assignment_date || a?.created_at || 0;
              const bTime = b?.assignment_date || b?.created_at || 0;
              const aDate = aTime ? new Date(aTime).getTime() : 0;
              const bDate = bTime ? new Date(bTime).getTime() : 0;
              if (aDate !== bDate) return bDate - aDate;
              return (b?.id || 0) - (a?.id || 0);
          });
          setPrevizHistory(sortedHistory);
      }
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
              const list = Array.isArray(data) ? data : data.results || [];
              const sortedList = [...list].sort((a: any, b: any) => {
                  const aTime = a?.created_at || 0;
                  const bTime = b?.created_at || 0;
                  const aDate = aTime ? new Date(aTime).getTime() : 0;
                  const bDate = bTime ? new Date(bTime).getTime() : 0;
                  if (aDate !== bDate) return bDate - aDate;
                  return (b?.id || 0) - (a?.id || 0);
              });
              setScriptPreviz(sortedList);
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
          toast.error(extractApiError(error, "Failed to update active previz."));
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
      } catch (error) { console.error("Failed to upload previz", error); toast.error(extractApiError(error, "Failed to upload previz.")); }
      finally { setUploading(false); e.target.value = ''; }
  };

  const handleEditPromptSubmit = async (model?: string, provider?: string) => {
      if (!shot || !editPrompt.trim() || !shot.image_url) return;
      setIsEditingPreviz(true);
      try {
          await editPrevizWithPrompt(
              shot.id,
              shot.image_url,
              editPrompt.trim(),
              scene?.id,
              (scene?.script_id || scene?.script) as number | undefined,
              model,
              provider,
          );

          // Immediately reflect new active previz in parent state
          const refreshedHistory = await getShotPreviz(shot.id);
          const sortedHistory = [...refreshedHistory].sort((a: any, b: any) => {
              const aTime = a?.assignment_date || a?.created_at || 0;
              const bTime = b?.assignment_date || b?.created_at || 0;
              const aDate = aTime ? new Date(aTime).getTime() : 0;
              const bDate = bTime ? new Date(bTime).getTime() : 0;
              if (aDate !== bDate) return bDate - aDate;
              return (b?.id || 0) - (a?.id || 0);
          });
          setPrevizHistory(sortedHistory);

          const latestPreviz = sortedHistory[0];
          if (latestPreviz && onUpdateShot) {
              onUpdateShot(shot.id, 'active_previz', latestPreviz.id);
              onUpdateShot(shot.id, 'image_url', latestPreviz.image_url);
              onUpdateShot(shot.id, 'previz', latestPreviz);
          }

          if (activeTab === 'script') {
              fetchScriptPreviz();
          }

          toast.success("Edit prompt applied — new previz created!");
          setEditPrompt('');
          if (onRefresh) onRefresh();
      } catch (error) {
          console.error("Failed to create edited previz", error);
          toast.error(extractApiError(error, "Failed to apply edit prompt."));
      } finally {
          setIsEditingPreviz(false);
      }
  };

  const handleSaveDetails = async () => {
      if (!shot || !isDetailsDirty || hasEditPrompt) return;
      setSavingDetails(true);
      try {
          const payload = {
              description: detailsForm.description,
              type: detailsForm.type,
              movement: detailsForm.movement || null,
              camera_angle: detailsForm.camera_angle || null,
              lighting: detailsForm.lighting || null,
          };

          await updateShotDetails(shot.id, payload as any);

          if (onUpdateShot) {
              onUpdateShot(shot.id, 'description', detailsForm.description);
              onUpdateShot(shot.id, 'type', detailsForm.type);
              onUpdateShot(shot.id, 'movement', detailsForm.movement);
              onUpdateShot(shot.id, 'camera_angle', detailsForm.camera_angle);
              onUpdateShot(shot.id, 'lighting', detailsForm.lighting);
          }

          toast.success('Shot details updated');
          if (onRefresh) onRefresh();
      } catch (error) {
          console.error('Failed to update shot details', error);
          toast.error(extractApiError(error, 'Failed to update shot details.'));
      } finally {
          setSavingDetails(false);
      }
  };

  // Auto-save a single field silently (used by selects on change and description on blur)
  const autoSaveField = async (field: string, value: string | null) => {
      if (!shot) return;
      try {
          await updateShotDetails(shot.id, { [field]: value } as any);
          if (onUpdateShot) onUpdateShot(shot.id, field, value as any);
      } catch (error) {
          console.error(`[autoSaveField] Failed to save ${field}:`, error);
          toast.error(extractApiError(error, 'Failed to save changes.'));
      }
  };

  const handleMainGenerateClick = async () => {
      if (hasEditPrompt) {
          setShowEditModelSelector(true);
          return;
      }
      if (onGeneratePreviz && shot) {
          onGeneratePreviz(shot.id);
      }
  };

  if (!isOpen || !shot) return null;

  const linkedCharacters = scene?.scene_characters || [];

  return (
    <>
    <ModelSelector
      isOpen={showEditModelSelector}
      onClose={() => setShowEditModelSelector(false)}
      onConfirm={(model, provider) => {
        setShowEditModelSelector(false);
        handleEditPromptSubmit(model, provider);
      }}
      itemCount={1}
      title="Select Model for Edit"
      confirmLabel="Apply Edit"
    />
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
          className="bg-[var(--surface)] border border-[var(--border)] rounded-md w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col md:flex-row shadow-2xl relative"
        >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-md text-white z-10 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Left Column: Image */}
            <div className="flex-1 bg-[var(--surface-raised)] flex flex-col relative group">
                <div className="flex-1 flex items-center justify-center p-4">
                    {shot.image_url ? (
                        <img src={shot.image_url} alt={`Shot ${shot.order}`} className="max-h-full max-w-full object-contain" />
                    ) : (
                        <div className="text-[var(--text-muted)] flex flex-col items-center gap-3">
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
            <div className="w-full md:w-96 bg-[var(--surface)] border-l border-[var(--border)] flex flex-col overflow-hidden">
                <div className="p-5 border-b border-[var(--border)]">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2 text-xs font-medium tracking-wider uppercase">
                            <span className="text-emerald-400">Shot {shot.order}</span>
                            <span className="w-1 h-1 bg-[var(--surface-raised)] rounded-full"></span>
                            <span className="text-[var(--text-secondary)]">{shot.type}</span>
                        </div>
                    </div>
                    {scene && (
                        <h2 className="text-[var(--text-muted)] text-xs">
                            Scene {scene.order}: {scene.scene_name}
                        </h2>
                    )}
                    {/* Location image reference strip */}
                    {scene?.location_detail?.image_url && (
                      <div className="mt-2 rounded-md overflow-hidden border border-emerald-500/20 relative">
                        <img
                          src={scene.location_detail.image_url}
                          alt={scene.location_detail.name}
                          className="w-full h-16 object-cover opacity-80"
                        />
                        <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent flex items-center px-2">
                          <span className="text-[10px] text-emerald-300 font-semibold truncate">📍 {scene.location_detail.name}</span>
                        </div>
                      </div>
                    )}
                </div>

                {/* Tabs */}
                <div className="flex border-b border-[var(--border)] px-4">
                    <button 
                        onClick={() => setActiveTab('shot')}
                        className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'shot' ? 'border-emerald-500 text-white' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)]'}`}
                    >
                        Shot Details
                    </button>
                    <button 
                        onClick={() => setActiveTab('script')}
                        className={`px-4 py-3 text-xs font-medium border-b-2 transition-colors ${activeTab === 'script' ? 'border-emerald-500 text-white' : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-secondary)]'}`}
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

                                <section>
                                {/* Chrome-tab design: tabs above, merges into content box */}
                                <div>
                                    {/* Tab row — both tabs identical height; active overlaps box border via -mb-px */}
                                    {(() => {
                                        const boxBorderColor = activeTextTab === 'description' ? 'var(--accent-border)' : 'rgba(168,85,247,0.35)';
                                        return (
                                        <div className="flex">
                                            {/* Description tab */}
                                            <button
                                                onClick={() => setActiveTextTab('description')}
                                                style={activeTextTab === 'description'
                                                    ? { borderColor: 'var(--accent-border)', borderBottomColor: 'var(--surface)' }
                                                    : { borderColor: boxBorderColor, borderBottomColor: boxBorderColor }}
                                                className={`relative px-4 py-1.5 text-[10px] font-semibold rounded-t-md border transition-colors z-10 -mb-px ${
                                                    activeTextTab === 'description'
                                                        ? 'bg-[var(--surface)] text-emerald-400'
                                                        : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                                }`}
                                            >
                                                Description
                                            </button>
                                            {/* Edit Prompt tab */}
                                            <button
                                                onClick={() => setActiveTextTab('edit')}
                                                style={activeTextTab === 'edit'
                                                    ? { borderColor: 'rgba(168,85,247,0.5)', borderBottomColor: 'var(--surface)' }
                                                    : { borderColor: boxBorderColor, borderBottomColor: boxBorderColor }}
                                                className={`relative px-4 py-1.5 text-[10px] font-semibold rounded-t-md border transition-colors z-10 -mb-px flex items-center gap-1 ${
                                                    activeTextTab === 'edit'
                                                        ? 'bg-[var(--surface)] text-purple-400'
                                                        : 'bg-[var(--surface-raised)] text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                                                }`}
                                            >
                                                <Pencil className="w-2.5 h-2.5" />
                                                Edit Prompt
                                            </button>
                                        </div>
                                        );
                                    })()}

                                    {/* Content box — fixed height, border color animates with active tab */}
                                    <motion.div
                                        animate={{
                                            borderColor: activeTextTab === 'description' ? 'var(--accent-border)' : 'rgba(168,85,247,0.35)',
                                        }}
                                        transition={{ duration: 0.2 }}
                                        className="rounded-b-md rounded-tr-md border bg-[var(--surface)] relative"
                                        style={{ minHeight: 104 }}
                                    >
                                        {/* Both panels always mounted, opacity toggled — no height shift */}
                                        <div style={{ opacity: activeTextTab === 'description' ? 1 : 0, pointerEvents: activeTextTab === 'description' ? 'auto' : 'none', position: activeTextTab === 'description' ? 'relative' : 'absolute', inset: 0, transition: 'opacity 0.15s' }}>
                                            <MentionTextarea
                                                value={detailsForm.description}
                                                onChange={(val) => setDetailsForm((prev) => ({ ...prev, description: val }))}
                                                onTagsChange={(tags) => {
                                                    setTaggedCharacterIds(tags);
                                                    if (onTagsChange && shot) onTagsChange(shot.id, tags);
                                                }}
                                                sceneCharacters={(scene?.scene_characters || []).map((sc: any) => ({
                                                    id: sc.id,
                                                    character_id: sc.character?.id || sc.character_id,
                                                    character_name: sc.character?.name || sc.character_name || "",
                                                    image_url: sc.image_url,
                                                    character_image_url: sc.character?.image_url,
                                                }))}
                                                globalCharacters={globalCharacters}
                                                className={`w-full leading-relaxed text-sm bg-transparent p-3 resize-none focus:outline-none ${disableDetails ? 'text-[var(--text-muted)] opacity-60 cursor-not-allowed' : 'text-[var(--text-secondary)]'}`}
                                                disabled={disableDetails || savingDetails}
                                                placeholder="Shot description... (type @ to tag characters)"
                                                rows={4}
                                                onBlur={() => {
                                                    if (detailsForm.description !== (shot?.description || "")) {
                                                        autoSaveField('description', detailsForm.description);
                                                    }
                                                }}
                                            />
                                        </div>
                                        <div style={{ opacity: activeTextTab === 'edit' ? 1 : 0, pointerEvents: activeTextTab === 'edit' ? 'auto' : 'none', position: activeTextTab === 'edit' ? 'relative' : 'absolute', inset: 0, transition: 'opacity 0.15s' }} className={disableEditPrompt ? 'opacity-50' : ''}>
                                            <textarea
                                                value={editPrompt}
                                                onChange={(e) => setEditPrompt(e.target.value)}
                                                placeholder={disableEditPrompt ? 'Clear unsaved changes to use edit prompt.' : 'e.g. Change lighting to golden hour, add fog in background...'}
                                                className="w-full bg-transparent text-[var(--text-primary)] text-sm p-3 resize-none focus:outline-none placeholder:text-[var(--text-muted)]"
                                                rows={4}
                                                disabled={isEditingPreviz || disableEditPrompt}
                                            />
                                            {!hasActivePrevizImage && (
                                                <p className="text-[10px] text-[var(--text-muted)] px-3 pb-2">Generate or upload a previz first.</p>
                                            )}
                                        </div>
                                    </motion.div>
                                </div>

                                <div className={`mt-3 space-y-2 ${disableDetails ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Shot Details</h4>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <span className="text-[9px] text-[var(--text-muted)] uppercase block mb-1">Shot Type</span>
                                            <ShotTypeSelector
                                                shotTypes={shotTypes}
                                                value={detailsForm.type}
                                                onChange={(val) => {
                                                    setDetailsForm((prev) => ({ ...prev, type: val }));
                                                    autoSaveField('type', val);
                                                }}
                                                disabled={disableDetails || savingDetails}
                                                size="sm"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-[var(--text-muted)] uppercase block mb-1">Movement</span>
                                            <select
                                                value={detailsForm.movement || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setDetailsForm((prev) => ({ ...prev, movement: val }));
                                                    autoSaveField('movement', val || null);
                                                }}
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md text-xs text-[var(--text-secondary)] px-2 py-2 outline-none focus:border-emerald-500/40"
                                                disabled={disableDetails || savingDetails}
                                            >
                                                <option value="">—</option>
                                                {MOVEMENT_OPTIONS.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-[var(--text-muted)] uppercase block mb-1">Camera Angle</span>
                                            <CameraAngleSelector
                                                angles={cameraAngles}
                                                value={detailsForm.camera_angle || ""}
                                                onChange={(val) => {
                                                    setDetailsForm((prev) => ({ ...prev, camera_angle: val }));
                                                    autoSaveField('camera_angle', val || null);
                                                }}
                                                disabled={disableDetails || savingDetails}
                                                size="sm"
                                            />
                                        </div>
                                        <div>
                                            <span className="text-[9px] text-[var(--text-muted)] uppercase block mb-1">Lighting</span>
                                            <select
                                                value={detailsForm.lighting || ""}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setDetailsForm((prev) => ({ ...prev, lighting: val }));
                                                    autoSaveField('lighting', val || null);
                                                }}
                                                className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md text-xs text-[var(--text-secondary)] px-2 py-2 outline-none focus:border-emerald-500/40"
                                                disabled={disableDetails || savingDetails}
                                            >
                                                <option value="">—</option>
                                                {LIGHTING_OPTIONS.map((opt) => (
                                                    <option key={opt} value={opt}>{opt}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    {savingDetails && (
                                        <p className="text-[9px] text-[var(--text-muted)] text-center animate-pulse">Saving...</p>
                                    )}
                                </div>

                                {/* Generate / Upload Buttons */}
                                {showGenerateButton && onGeneratePreviz && (
                                    <div className="flex gap-2 mt-3">
                                        <button
                                            onClick={handleMainGenerateClick}
                                            disabled={isGenerating || isEditingPreviz || (hasEditPrompt && !hasActivePrevizImage)}
                                            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {(isGenerating || isEditingPreviz) ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white"></div> : (hasEditPrompt ? <Send className="w-3.5 h-3.5" /> : <Film className="w-3.5 h-3.5" />)}
                                            {(isGenerating || isEditingPreviz)
                                                ? (hasEditPrompt ? "Editing..." : "Generating...")
                                                : (hasEditPrompt ? "Edit Previz" : "Generate Previz")}
                                        </button>
                                        <label className={`flex-1 bg-[var(--surface-hover)] text-[var(--text-primary)] py-2 rounded-md text-xs font-medium transition-colors flex items-center justify-center gap-2 border border-[var(--border-hover)] ${hasEditPrompt ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[var(--border)] cursor-pointer'}`}>
                                            {uploading ? <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white/20 border-t-white"></div> : <Upload className="w-3.5 h-3.5" />}
                                            Upload Previz
                                            <input type="file" className="hidden" accept="image/*" onChange={handlePrevizUpload} disabled={uploading || hasEditPrompt} />
                                        </label>
                                    </div>
                                )}
                            </section>

                            {/* Previz Details — driven from v1 history so it stays fresh after generation */}
                            {(() => {
                                // Prefer the history entry matching active_previz; fall back to
                                // shot.previz (stale v2 data) so the section shows before history loads.
                                const activePreviz =
                                    previzHistory.find((p) => p.id === shot.active_previz) ||
                                    previzHistory[0] ||
                                    shot.previz;
                                if (!activePreviz) return null;
                                const refs: any[] = activePreviz.reference_images ?? [];
                                return (
                                    <section>
                                        <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2">Previz Specs</h3>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="bg-[var(--surface)] p-2.5 rounded-md border border-[var(--border)]">
                                                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider block mb-0.5">Aspect Ratio</span>
                                                <span className="text-[var(--text-secondary)] text-xs font-medium">{activePreviz.aspect_ratio || "16:9"}</span>
                                            </div>
                                            <div className="bg-[var(--surface)] p-2.5 rounded-md border border-[var(--border)]">
                                                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider block mb-0.5">Camera</span>
                                                <span className="text-[var(--text-secondary)] text-xs font-medium">{activePreviz.camera_angle || shot.camera_angle || "—"}</span>
                                            </div>
                                            {activePreviz.audio_url && (
                                                <div className="bg-[var(--surface)] p-2.5 rounded-md border border-[var(--border)] col-span-2">
                                                    <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider block mb-0.5">Audio</span>
                                                    <a href={activePreviz.audio_url} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-xs truncate block">
                                                        Open Audio File
                                                    </a>
                                                </div>
                                            )}
                                        </div>

                                        {/* Reference images */}
                                        {loadingHistory ? (
                                            <div className="mt-3 h-12 bg-[var(--surface)] animate-pulse rounded" />
                                        ) : refs.length > 0 ? (
                                            <div className="mt-3">
                                                <h4 className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">Reference Images</h4>
                                                <PrevizReferenceStrip images={refs} size="md" />
                                            </div>
                                        ) : null}
                                    </section>
                                );
                            })()}

                            {/* Linked Characters */}
                            <section>
                                 <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                     <User className="h-3 w-3 text-emerald-500" />
                                     Linked Characters
                                </h3>
                                {linkedCharacters.length > 0 ? (
                                    <div className="space-y-2">
                                        {linkedCharacters.map((char: any, idx: number) => (
                                            <div key={idx} className="flex items-center gap-2.5 bg-[var(--surface)] p-2 rounded-md border border-[var(--border)]">
                                                 <div className="w-7 h-7 bg-[var(--surface-hover)] rounded-full overflow-hidden flex-shrink-0">
                                                     {char.image_url ? (
                                                         <img src={char.image_url} className="w-full h-full object-cover" alt={char.character?.name || char.character_name || "Character"} />
                                                     ) : char.character?.image_url ? (
                                                         <img src={char.character.image_url} className="w-full h-full object-cover opacity-80" alt={char.character.name} />
                                                     ) : (
                                                         <User className="h-3 w-3 m-auto mt-2 text-[var(--text-muted)]" />
                                                     )}
                                                 </div>
                                                 <span className="text-xs text-[var(--text-secondary)]">{char.character_name || char.character?.name || char.name || "Unknown"}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-[var(--text-muted)] italic">No characters linked.</p>
                                )}
                            </section>

                            {/* Previz History */}
                            <section>
                                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-2 flex items-center gap-1.5">
                                     <Clock className="h-3 w-3 text-emerald-500" />
                                     Previz History
                                </h3>
                                {loadingHistory ? (
                                    <div className="text-[10px] text-[var(--text-muted)]">Loading...</div>
                                ) : previzHistory.length > 0 ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        {previzHistory.map((previz: any, idx) => (
                                            <div key={idx} className={`bg-[var(--background)] rounded-md overflow-hidden border ${shot.active_previz === previz.id ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'border-[var(--border)]'} group relative flex flex-col`}>
                                                <div className="aspect-video relative">
                                                    <img src={previz.image_url} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-2">
                                                        <button 
                                                            disabled={settingActive || shot.active_previz === previz.id}
                                                            onClick={() => handleSetActive(previz.id)}
                                                            className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-3 py-1.5 rounded disabled:opacity-50 disabled:bg-[var(--surface-raised)]"
                                                        >
                                                            {shot.active_previz === previz.id ? 'Active' : 'Set Active'}
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="p-2 border-t border-[var(--border)] flex flex-col gap-1">
                                                    {previz.added_by ? (
                                                        <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                                            <User className="w-3 h-3 text-emerald-500/80" />
                                                            <span className="text-[9px] truncate" title={previz.added_by.email}>{previz.added_by.name || previz.added_by.email}</span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                                                            <User className="w-3 h-3" />
                                                            <span className="text-[9px]">API Generated</span>
                                                        </div>
                                                    )}
                                                    {previz.assignment_date && (
                                                        <div className="text-[8px] text-[var(--text-muted)]">
                                                            Linked: {new Date(previz.assignment_date).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-[10px] text-[var(--text-muted)]">No history available.</p>
                                )}
                            </section>
                        </>
                    ) : (
                        <section>
                            <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-4">Script Previz Bank</h3>
                            {loadingHistory ? (
                                <div className="text-[10px] text-[var(--text-muted)]">Loading...</div>
                            ) : scriptPreviz.length > 0 ? (
                                <div className="grid grid-cols-2 gap-3">
                                    {scriptPreviz.map((previz: any, idx) => (
                                        <div key={idx} className="bg-[var(--background)] rounded-md overflow-hidden border border-[var(--border)] group relative flex flex-col">
                                            <div className="aspect-video relative">
                                                <img src={previz.image_url} className="w-full h-full object-cover" />
                                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 gap-2">
                                                    <button
                                                        disabled={settingActive || shot.active_previz === previz.id}
                                                        onClick={() => handleSetActive(previz.id)}
                                                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] px-3 py-1.5 rounded disabled:opacity-50 disabled:bg-[var(--surface-raised)]"
                                                    >
                                                        {shot.active_previz === previz.id ? 'Active' : 'Link to Shot'}
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="p-2 border-t border-[var(--border)] flex flex-col gap-1">
                                                {previz.description && (
                                                    <p className="text-[9px] text-[var(--text-secondary)] line-clamp-2" title={previz.description}>
                                                        "{previz.description}"
                                                    </p>
                                                )}
                                                {previz.added_by ? (
                                                    <div className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                                                        <User className="w-3 h-3 text-emerald-500/80" />
                                                        <span className="text-[9px] truncate" title={previz.added_by.email}>{previz.added_by.name || previz.added_by.email}</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1.5 text-[var(--text-muted)]">
                                                        <User className="w-3 h-3" />
                                                        <span className="text-[9px]">Script Level</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-[10px] text-[var(--text-muted)]">No script-level previz available.</p>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
    </>
  );
}
