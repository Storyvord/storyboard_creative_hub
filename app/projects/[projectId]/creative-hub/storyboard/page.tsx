"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getScripts, getScenes, getShots, generateShotImage, bulkGenerateShots, bulkGeneratePreviz, generateShots, getStoryboardData, getSceneStoryboardData, getScriptTasks, getShotPreviz, getBulkTaskStatus } from "@/services/creative-hub";
import ModelSelector from "@/components/creative-hub/ModelSelector";
import { Scene, Shot } from "@/types/creative-hub";
import { Loader2, Film, ChevronRight, CheckSquare, Square, Play, Image as ImageIcon, CheckCircle, Circle, AlertTriangle, GripVertical } from "lucide-react";
import { clsx } from "clsx";
import { useParams } from "next/navigation";
import ShotDetailModal from "@/components/creative-hub/ShotDetailModal";
import StoryboardSlideshowModal from "@/components/creative-hub/StoryboardSlideshowModal";
import { toast } from "react-toastify";

// Shot type abbreviation map
const SHOT_TYPE_MAP: Record<string, string> = {
  "Wide Shot": "WS", "Medium Shot": "MS", "Close-Up": "CU", "Close Up": "CU",
  "Extreme Close-Up": "ECU", "Extreme Close Up": "ECU", "Over the Shoulder": "OTS",
  "Extreme Wide Shot": "EWS", "Medium Close-Up": "MCU", "Medium Close Up": "MCU",
  "Insert": "INS", "Two Shot": "2S", "Full Shot": "FS", "Establishing Shot": "EST",
  "POV": "POV", "Aerial": "AER", "Dutch Angle": "DA",
};

const SHOT_TYPES = Object.keys(SHOT_TYPE_MAP);
const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4", "2.35:1", "21:9", "3:2"];

function getAbbrev(type: string): string {
  return SHOT_TYPE_MAP[type] || type?.substring(0, 3)?.toUpperCase() || "—";
}

// ─── Shot Card (horizontal scroll variant) ────────────────────
interface ShotCardProps {
  shot: Shot;
  onClick: () => void;
  isSelected: boolean;
  onToggleSelect: () => void;
  isGenerating: boolean;
  isRetrying: boolean;
  error?: string;
  onUpdateShot: (shotId: number, field: string, value: string) => void;
  // Drag-and-drop
  onDragStart: (e: React.DragEvent, shotId: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetShotId: number) => void;
  isDragTarget: boolean;
}

function ShotCard({ shot, onClick, isSelected, onToggleSelect, isGenerating, isRetrying, error, onUpdateShot, onDragStart, onDragOver, onDrop, isDragTarget }: ShotCardProps) {
  const [desc, setDesc] = useState(shot.description || "");

  useEffect(() => { setDesc(shot.description || ""); }, [shot.description]);

  const handleDescBlur = () => {
    if (desc !== shot.description) onUpdateShot(shot.id, "description", desc);
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, shot.id)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, shot.id)}
      className={clsx(
        "flex-shrink-0 w-56 bg-[#111] border rounded-md overflow-hidden transition-all group flex flex-col",
        isSelected ? "border-emerald-500/40 ring-1 ring-emerald-500/20" : "border-[#222] hover:border-[#333]",
        isDragTarget && "border-emerald-400 border-dashed bg-emerald-500/5"
      )}
    >
      {/* Image */}
      <div className="aspect-video bg-[#0a0a0a] relative cursor-pointer" onClick={onClick}>
        {shot.image_url ? (
          <img src={shot.image_url} alt={`Shot ${shot.order}`} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-[#333]" />
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center z-10">
            <Loader2 className="w-5 h-5 text-emerald-400 animate-spin mb-1" />
            <span className="text-[9px] text-emerald-300 font-medium">{isRetrying ? "Retrying..." : "Generating..."}</span>
          </div>
        )}

        {error && !isGenerating && (
          <div className="absolute bottom-0 inset-x-0 bg-red-900/90 px-2 py-1 z-10">
            <span className="text-[9px] text-red-200 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Failed</span>
          </div>
        )}

        {/* Selection toggle */}
        <button onClick={(e) => { e.stopPropagation(); onToggleSelect(); }}
          className="absolute top-1.5 right-1.5 z-20 p-0.5 rounded bg-black/50 hover:bg-black/80 text-white transition-colors">
          {isSelected ? <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> : <Circle className="w-3.5 h-3.5 opacity-40 group-hover:opacity-80" />}
        </button>

        {/* Drag handle */}
        <div className="absolute top-1.5 left-1.5 z-20 p-0.5 rounded bg-black/50 text-white opacity-0 group-hover:opacity-70 cursor-grab active:cursor-grabbing transition-opacity">
          <GripVertical className="w-3.5 h-3.5" />
        </div>
      </div>

      {/* Metadata row */}
      <div className="px-2.5 pt-2 pb-1 flex items-center gap-2">
        <span className="text-[10px] font-mono text-[#666] font-bold">#{String(shot.order).padStart(2, '0')}</span>
        <span className="text-[9px] font-bold tracking-wider text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{getAbbrev(shot.type)}</span>
        {shot.previz?.aspect_ratio && <span className="text-[9px] text-[#555] font-mono">{shot.previz.aspect_ratio}</span>}
        {(shot.camera_angle || shot.previz?.camera_angle) && (
          <span className="text-[9px] text-[#444] truncate ml-auto">{shot.camera_angle || shot.previz?.camera_angle}</span>
        )}
      </div>

      {/* Inline dropdowns */}
      <div className="px-2.5 pb-1.5 flex items-center gap-1.5">
        <select className="shot-select bg-[#0a0a0a] border border-[#222] rounded text-[9px] text-[#999] px-1.5 py-1 outline-none focus:border-emerald-500/40 transition-colors flex-1 min-w-0"
          value={shot.type || ""} onChange={(e) => onUpdateShot(shot.id, "type", e.target.value)} onClick={(e) => e.stopPropagation()}>
          {SHOT_TYPES.map(t => <option key={t} value={t}>{getAbbrev(t)} — {t}</option>)}
        </select>
        <select className="shot-select bg-[#0a0a0a] border border-[#222] rounded text-[9px] text-[#999] px-1.5 py-1 outline-none focus:border-emerald-500/40 transition-colors w-14"
          value={shot.previz?.aspect_ratio || "16:9"} onChange={(e) => onUpdateShot(shot.id, "aspect_ratio", e.target.value)} onClick={(e) => e.stopPropagation()}>
          {ASPECT_RATIOS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
        </select>
      </div>

      {/* Description */}
      <div className="px-2.5 pb-2.5 flex-1">
        <textarea
          className="w-full bg-transparent text-[11px] text-[#999] leading-[1.4] outline-none resize-none overflow-y-auto focus:text-white transition-colors"
          style={{ minHeight: '3em', maxHeight: '4.2em' }}
          value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={handleDescBlur}
          onClick={(e) => e.stopPropagation()} placeholder="Shot description..."
        />
      </div>
    </div>
  );
}

// ─── Scene Row (horizontal scroll) ───────────────────────────
interface SceneItemProps {
  scene: Scene; shots: Shot[]; isSelected: boolean;
  onToggleSelect: (sceneId: number) => void; onShotClick: (shot: Shot) => void;
  loadingShots: boolean; onGenerateShots: (sceneId: number) => void;
  trackedTasks: Record<number, string>; shotErrors: Record<number, string>;
  selectedShotIds: Set<number>; onToggleSelectShot: (shotId: number) => void;
  retryingTasks: Record<number, boolean>; onUpdateShot: (shotId: number, field: string, value: string) => void;
  onReorderShots: (sceneId: number, fromShotId: number, toShotId: number | null) => void;
}

function SceneItem({ scene, shots, isSelected, onToggleSelect, onShotClick, loadingShots,
  onGenerateShots, trackedTasks, shotErrors, selectedShotIds, onToggleSelectShot,
  retryingTasks, onUpdateShot, onReorderShots }: SceneItemProps) {

  const [dragOverShotId, setDragOverShotId] = useState<number | null>(null);
  const draggedShotIdRef = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent, shotId: number) => {
    draggedShotIdRef.current = shotId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(shotId));
    // Add drag styling with timeout so it doesn't affect the drag image
    setTimeout(() => {
      const el = e.target as HTMLElement;
      el.style.opacity = '0.4';
    }, 0);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragEnter = (e: React.DragEvent, targetShotId: number) => {
    e.preventDefault();
    if (draggedShotIdRef.current !== targetShotId) {
      setDragOverShotId(targetShotId);
    }
  };

  const handleDrop = (e: React.DragEvent, targetShotId: number | null) => {
    e.preventDefault();
    const draggedId = Number(e.dataTransfer.getData('text/plain'));
    if (draggedId && draggedId !== targetShotId) {
      onReorderShots(scene.id, draggedId, targetShotId);
    }
    setDragOverShotId(null);
    draggedShotIdRef.current = null;
    // Reset opacity on all cards
    const cards = document.querySelectorAll('[draggable="true"]');
    cards.forEach(c => (c as HTMLElement).style.opacity = '1');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    (e.target as HTMLElement).style.opacity = '1';
    setDragOverShotId(null);
    draggedShotIdRef.current = null;
  };

  return (
    <div className={clsx(
      "border rounded-md overflow-hidden transition-all mb-5",
      isSelected ? "border-emerald-500/30 bg-[#0d0d0d]" : "border-[#1a1a1a] bg-[#0d0d0d] hover:border-[#282828]"
    )}>
      {/* Scene Header */}
      <div className="px-4 py-3 border-b border-[#1a1a1a] flex items-center gap-3">
        <button onClick={(e) => { e.stopPropagation(); onToggleSelect(scene.id); }}
          className="text-[#444] hover:text-emerald-400 transition-colors flex-shrink-0">
          {isSelected ? <CheckSquare className="w-4 h-4 text-emerald-500" /> : <Square className="w-4 h-4" />}
        </button>

        <span className="flex-shrink-0 text-[10px] font-mono text-[#555] font-bold tracking-wider bg-[#161616] px-2 py-0.5 rounded">
          SC {String(scene.order).padStart(2, '0')}
        </span>

        <h3 className="font-semibold text-sm text-white truncate">{scene.scene_name || "Untitled Scene"}</h3>

        <div className="hidden md:flex items-center gap-2 text-[10px] text-[#444] ml-auto">
          {scene.int_ext && <span className="uppercase tracking-wider">{scene.int_ext}</span>}
          {scene.location && <><span className="text-[#333]">·</span><span className="truncate max-w-[120px]">{scene.location}</span></>}
          {scene.time && <><span className="text-[#333]">·</span><span>{scene.time}</span></>}
        </div>

        <span className="text-[10px] text-[#444] ml-2">{shots.length} shot{shots.length !== 1 ? 's' : ''}</span>

        {shots.length === 0 && !loadingShots && (
          <button onClick={() => onGenerateShots(scene.id)}
            className="ml-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 flex-shrink-0">
            <Film className="w-3 h-3" /> Generate Shots
          </button>
        )}
      </div>

      {/* Shot Horizontal Scroll */}
      <div className="p-4" onDragEnd={handleDragEnd}>
        {loadingShots ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#333]" /></div>
        ) : shots.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto pb-2 scroll-smooth">
            {shots.map((shot) => (
              <ShotCard
                key={shot.id} shot={shot} onClick={() => onShotClick(shot)}
                isSelected={selectedShotIds.has(shot.id)} onToggleSelect={() => onToggleSelectShot(shot.id)}
                isGenerating={!!trackedTasks[shot.id]} isRetrying={!!retryingTasks[shot.id]}
                error={shotErrors[shot.id]} onUpdateShot={onUpdateShot}
                onDragStart={handleDragStart} onDragOver={(e) => handleDragEnter(e, shot.id)}
                onDrop={handleDrop} isDragTarget={dragOverShotId === shot.id}
              />
            ))}
          </div>
        ) : (
          <div 
            className={clsx(
              "py-8 text-center border border-dashed rounded-md transition-colors",
              dragOverShotId === -1 
                ? "border-emerald-500 bg-emerald-500/5" 
                : "border-[#1a1a1a]"
            )}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverShotId(-1); }}
            onDragLeave={() => setDragOverShotId(null)}
            onDrop={(e) => handleDrop(e, null)}
          >
            <p className="text-[#444] text-xs">No shots generated yet. Drag a shot here or generate new ones.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Storyboard Page ──────────────────────────────────────────
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
  const [trackedTasks, setTrackedTasks] = useState<Record<number, string>>({});
  const [trackedShotTasks, setTrackedShotTasks] = useState<Record<number, string>>({});
  const [retryingTasks, setRetryingTasks] = useState<Record<number, boolean>>({});
  const [shotErrors, setShotErrors] = useState<Record<number, string>>({});
  const [initializedScriptId, setInitializedScriptId] = useState<number | null>(null);
  
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [pendingPrevizShotIds, setPendingPrevizShotIds] = useState<number[]>([]);

  // Inline shot update (local)
  const handleUpdateShot = useCallback((shotId: number, field: string, value: string) => {
    setShotsMap(prev => {
      const copy = { ...prev };
      for (const [sceneIdStr, shots] of Object.entries(copy)) {
        const sceneId = parseInt(sceneIdStr, 10);
        const idx = shots.findIndex(s => s.id === shotId);
        if (idx !== -1) {
          copy[sceneId] = [...shots.slice(0, idx), { ...shots[idx], [field]: value }, ...shots.slice(idx + 1)];
          break;
        }
      }
      return copy;
    });
  }, []);

  // Drag-and-drop reorder (supports cross-scene)
  const handleReorderShots = useCallback((targetSceneId: number, fromShotId: number, toShotId: number | null) => {
    setShotsMap(prev => {
      // Find source scene and shot index
      let fromSceneId = -1;
      let fromIdx = -1;
      for (const [sIdStr, shots] of Object.entries(prev)) {
        const sId = parseInt(sIdStr, 10);
        const idx = shots.findIndex(s => s.id === fromShotId);
        if (idx !== -1) {
          fromSceneId = sId;
          fromIdx = idx;
          break;
        }
      }

      console.log('--- REORDER START ---');
      console.log(`From Scene: ${fromSceneId}, To Scene: ${targetSceneId}`);
      console.log(`From Shot ID: ${fromShotId}, To Shot Target ID: ${toShotId}`);

      if (fromSceneId === -1 || fromIdx === -1) {
        console.error('Source shot not found in any scene');
        return prev;
      }

      const sourceShots = [...(prev[fromSceneId] || [])];
      
      // We must figure out toIdx BEFORE mutating sourceShots if moving within same scene
      const originalTargetShots = fromSceneId === targetSceneId ? sourceShots : [...(prev[targetSceneId] || [])];
      let toIdx = toShotId ? originalTargetShots.findIndex(s => s.id === toShotId) : originalTargetShots.length;

      // Remove the dragged shot from source
      const [moved] = sourceShots.splice(fromIdx, 1);
      console.log('Moved Shot:', moved);
      
      // Now assign targetShots
      const targetShots = fromSceneId === targetSceneId ? sourceShots : [...(prev[targetSceneId] || [])];

      // Update its scene property if moving across scenes
      if (fromSceneId !== targetSceneId) {
          moved.scene = targetSceneId;
      } else {
          // If we are in the same scene, and we removed an item BEFORE the target index,
          // the target index shifts left by 1 because the array shrunk.
          if (fromIdx < toIdx) {
              toIdx -= 1;
          }
      }

      console.log(`Inserting at index: ${toIdx} in Target Scene: ${targetSceneId}`);
      // Insert at target position
      targetShots.splice(toIdx, 0, moved);

      // Renumber orders
      const reorderedSource = sourceShots.map((s, i) => ({ ...s, order: i + 1 }));
      const reorderedTarget = fromSceneId === targetSceneId ? reorderedSource : targetShots.map((s, i) => ({ ...s, order: i + 1 }));

      const next = { ...prev };
      next[fromSceneId] = reorderedSource;
      next[targetSceneId] = reorderedTarget;

      // Persist to backend asynchronously
      const dirtyShots = fromSceneId === targetSceneId ? reorderedSource : [...reorderedSource, ...reorderedTarget];
      
      const payload = dirtyShots.map(s => ({ id: s.id, scene_id: s.scene || targetSceneId, order: s.order }));
      console.log('Sending Payload:', payload);

      import("@/services/creative-hub").then(({ reorderShots }) => {
          reorderShots(payload)
            .then(() => toast.success("Shot order updated", { autoClose: 1500 }))
            .catch(e => {
                console.error("Reorder failed", e);
                toast.error("Failed to save new shot order");
            });
      });

      return next;
    });
  }, []);

  // Restore Active Tasks on Mount
  useEffect(() => {
      const initializeActiveTasks = async () => {
          if (!activeScriptId || activeScriptId === initializedScriptId) return;
          if (Object.keys(shotsMap).length === 0) return;
          try {
              const data = await getScriptTasks(activeScriptId);
              const { previs, shots } = data;
              setInitializedScriptId(activeScriptId);
              const now = new Date().getTime();
              const maxAgeMs = 60 * 60 * 1000;

              if (shots && shots.length > 0) {
                  const newLoadingShots: Record<number, boolean> = {};
                  const newTrackedShots: Record<number, string> = {};
                  shots.forEach((task: any) => {
                      const taskAge = now - new Date(task.created_at || new Date()).getTime();
                      if (taskAge < maxAgeMs && ['processing','pending','retrying','started'].includes(task.status)) {
                          newLoadingShots[task.object_id] = true;
                          newTrackedShots[task.object_id] = task.task_id;
                      }
                  });
                  if (Object.keys(newLoadingShots).length > 0) {
                      setLoadingShotsMap(prev => ({ ...prev, ...newLoadingShots }));
                      setTrackedShotTasks(prev => ({ ...prev, ...newTrackedShots }));
                  }
              }
              if (previs && previs.length > 0) {
                  const newTracked: Record<number, string> = {};
                  const newRetrying: Record<number, boolean> = {};
                  previs.forEach((task: any) => {
                      let hasImage = false;
                      for (const sceneShots of Object.values(shotsMap)) {
                          if (sceneShots.find(s => s.id === task.object_id && s.image_url)) { hasImage = true; break; }
                      }
                      const taskAge = now - new Date(task.created_at || new Date()).getTime();
                      if (!hasImage && taskAge < maxAgeMs && ['processing','pending','retrying','started'].includes(task.status)) {
                          newTracked[task.object_id] = task.task_id;
                          if (task.status === 'retrying') newRetrying[task.object_id] = true;
                      }
                  });
                  if (Object.keys(newTracked).length > 0) { setTrackedTasks(newTracked); setRetryingTasks(newRetrying); }
              }
          } catch (e) { console.error("Failed to initialize active tasks", e); }
      };
      initializeActiveTasks();
  }, [activeScriptId, shotsMap, initializedScriptId]);

  // Polling
  useEffect(() => {
    let intervalId: NodeJS.Timeout;
    const fetchTasks = async () => {
        const allTaskIds = [...Object.values(trackedTasks), ...Object.values(trackedShotTasks)];
        if (!activeScriptId || allTaskIds.length === 0) return;
        try {
            const data = await getBulkTaskStatus(allTaskIds);
            const returnedTasks = data?.tasks || [];
            const tasksToComplete: {shotId: number, status: string, error?: string}[] = [];
            Object.entries(trackedTasks).forEach(([shotIdStr, taskId]) => {
                const shotId = Number(shotIdStr);
                const task = returnedTasks.find((t: any) => t.task_id === taskId);
                if (task) {
                    if (['completed','failed','success','failure'].includes(task.status)) tasksToComplete.push({ shotId, status: task.status, error: task.error });
                    else if (task.status === 'retrying') setRetryingTasks(prev => ({ ...prev, [shotId]: true }));
                    else if (['processing','started'].includes(task.status)) setRetryingTasks(prev => { if (!prev[shotId]) return prev; const c = { ...prev }; delete c[shotId]; return c; });
                }
            });
            const shotsToRefresh: number[] = [];
            const newLoadingShots: Record<number, boolean> = {};
            Object.entries(trackedShotTasks).forEach(([sceneIdStr, taskId]) => {
                const sceneId = Number(sceneIdStr);
                const task = returnedTasks.find((t: any) => t.task_id === taskId);
                if (task) {
                    if (['completed','failed','success','failure'].includes(task.status)) { if (loadingShotsMap[sceneId]) shotsToRefresh.push(sceneId); newLoadingShots[sceneId] = false; }
                    else if (['processing','pending','started'].includes(task.status)) newLoadingShots[sceneId] = true;
                }
            });
            if (Object.keys(newLoadingShots).some(id => newLoadingShots[Number(id)] !== loadingShotsMap[Number(id)])) {
                 setLoadingShotsMap(prev => { const c = { ...prev }; Object.entries(newLoadingShots).forEach(([k, v]) => { if (v) c[Number(k)] = true; else delete c[Number(k)]; }); return c; });
                 setTrackedShotTasks(prev => { const c = { ...prev }; shotsToRefresh.forEach(id => delete c[id]); Object.entries(newLoadingShots).forEach(([k, v]) => { if (!v) delete c[Number(k)]; }); return c; });
                 shotsToRefresh.forEach(id => fetchShots(id));
            }
            if (tasksToComplete.length > 0) {
                setTrackedTasks(prev => { const c = { ...prev }; tasksToComplete.forEach(t => delete c[t.shotId]); return c; });
                setRetryingTasks(prev => { const c = { ...prev }; tasksToComplete.forEach(t => delete c[t.shotId]); return c; });
                tasksToComplete.forEach(async t => {
                    if (t.status === 'completed') {
                        try {
                            const shotData = await getShotPreviz(t.shotId);
                            if (shotData && shotData.length > 0) {
                                const last = shotData[shotData.length - 1];
                                setShotErrors(prev => { if (!prev[t.shotId]) return prev; const c = { ...prev }; delete c[t.shotId]; return c; });
                                setShotsMap(prev => { const copy = { ...prev }; for (const [sid, shots] of Object.entries(copy)) { const idx = shots.findIndex(s => s.id === t.shotId); if (idx !== -1) { copy[parseInt(sid,10)] = [...shots.slice(0,idx), { ...shots[idx], image_url: last.image_url, previz: last }, ...shots.slice(idx+1)]; break; } } return copy; });
                            }
                        } catch (err) { console.error(err); }
                    } else if (t.status === 'failed') { toast.error(t.error || "Task failed."); setShotErrors(prev => ({ ...prev, [t.shotId]: t.error || "Unknown Error" })); }
                });
            }
        } catch (e) { console.error("Polling error", e); }
    };
    if (Object.keys(trackedTasks).length > 0 || Object.keys(trackedShotTasks).length > 0) { fetchTasks(); intervalId = setInterval(fetchTasks, 3000); }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [activeScriptId, trackedTasks, trackedShotTasks, scenes, shotsMap]);

  useEffect(() => { if (projectId) fetchScenes(); }, [projectId]);

  const fetchScenes = async () => {
    try {
      setLoadingScenes(true);
      let scriptId: number | null = null;
      try { const scripts = await getScripts(projectId); if (scripts?.length > 0) { scriptId = scripts[0].id; setActiveScriptId(scriptId); } } catch (e) { console.error(e); }
      if (!scriptId) { setLoadingScenes(false); return; }
      const storyboardData = await getStoryboardData(scriptId);
      const parsedScenes: Scene[] = [];
      const parsedShotsMap: Record<number, Shot[]> = {};
      storyboardData.forEach((sceneData: any) => {
          parsedScenes.push({ id: sceneData.id, script_id: scriptId!, scene_name: sceneData.scene_name, description: sceneData.description, order: sceneData.order, location: "", set_number: "", environment: "", int_ext: "", date: "", timeline: [], scene_characters: [], created_at: "", updated_at: "" });
          const shots: Shot[] = (sceneData.shots || []).map((sd: any) => {
              let imageUrl = null;
              if (sd.previz?.length > 0) imageUrl = sd.previz[sd.previz.length - 1].image_url;
              return { id: sd.id, scene: sceneData.id, description: sd.description, type: sd.type || "Wide Shot", order: sd.order, done: false, timeline: {}, movement: "", camera_angle: "", lighting: "", rationale: "", created_at: "", updated_at: "", image_url: imageUrl, previz: sd.previz?.length > 0 ? sd.previz[sd.previz.length - 1] : null } as Shot;
          });
          parsedShotsMap[sceneData.id] = shots.sort((a, b) => a.order - b.order);
      });
      setScenes(parsedScenes.sort((a, b) => a.order - b.order));
      setShotsMap(parsedShotsMap);
    } catch (error) { console.error(error); }
    finally { setLoadingScenes(false); }
  };

  const fetchShots = async (sceneId: number) => {
    setLoadingShotsMap(prev => ({ ...prev, [sceneId]: true }));
    try {
        const sceneData = await getSceneStoryboardData(sceneId);
        if (sceneData?.shots) {
             const shots: Shot[] = sceneData.shots.map((sd: any) => {
                  let imageUrl = null;
                  if (sd.previz?.length > 0) imageUrl = sd.previz[sd.previz.length - 1].image_url;
                  return { id: sd.id, scene: sceneId, description: sd.description, type: sd.type || "Wide Shot", order: sd.order, image_url: imageUrl, previz: sd.previz?.length > 0 ? sd.previz[sd.previz.length - 1] : null } as Shot;
             });
             setShotsMap(prev => ({ ...prev, [sceneId]: shots.sort((a, b) => a.order - b.order) }));
        } else setShotsMap(prev => ({ ...prev, [sceneId]: [] }));
    } catch (error) { console.error(error); }
    finally { setLoadingShotsMap(prev => ({ ...prev, [sceneId]: false })); }
  };

  const handleToggleSelectId = (id: number) => { const s = new Set(selectedSceneIds); s.has(id) ? s.delete(id) : s.add(id); setSelectedSceneIds(s); };
  const handleToggleSelectShotId = (id: number) => { const s = new Set(selectedShotIds); s.has(id) ? s.delete(id) : s.add(id); setSelectedShotIds(s); };
  const handleSelectAll = () => { selectedSceneIds.size === scenes.length ? setSelectedSceneIds(new Set()) : setSelectedSceneIds(new Set(scenes.map(s => s.id))); };

  const handleBulkGenerateShots = async () => {
      if (selectedSceneIds.size === 0) return;
      setIsBulkGenerating(true);
      try {
          const res = await bulkGenerateShots(Array.from(selectedSceneIds));
          if (res?.task_ids) { const newTasks: Record<number, string> = {}; Array.from(selectedSceneIds).forEach((sceneId, idx) => { if (res.task_ids[idx]) newTasks[sceneId] = res.task_ids[idx]; setLoadingShotsMap(prev => ({ ...prev, [sceneId]: true })); }); setTrackedShotTasks(prev => ({ ...prev, ...newTasks })); }
          toast.success("Bulk shot generation started!");
      } catch (error) { console.error(error); toast.error("Failed."); } finally { setIsBulkGenerating(false); }
  };

  const handleBulkGeneratePreviz = async () => {
      if (selectedSceneIds.size === 0 && selectedShotIds.size === 0) return;
      const sceneShotIds = Array.from(selectedSceneIds).flatMap(sceneId => (shotsMap[sceneId] || []).map(s => s.id));
      const combinedShotIds = Array.from(new Set([...sceneShotIds, ...Array.from(selectedShotIds)]));
      if (combinedShotIds.length === 0) { toast.warning("No shots found."); return; }
      setPendingPrevizShotIds(combinedShotIds);
      setIsModelSelectorOpen(true);
  };

  const handleModelConfirm = async (model: string, provider: string) => {
      setIsModelSelectorOpen(false);
      if (pendingPrevizShotIds.length === 0) return;
      setIsBulkGenerating(true);
      try {
          const response = await bulkGeneratePreviz(pendingPrevizShotIds, model, provider);
          if (response?.shot_ids && response?.task_ids) {
              setTrackedTasks(prev => { const c = { ...prev }; response.shot_ids.forEach((sid: number, i: number) => { c[sid] = response.task_ids[i]; }); return c; });
              setShotErrors(prev => { const c = { ...prev }; response.shot_ids.forEach((sid: number) => { delete c[sid]; }); return c; });
          }
          toast.success("Bulk previz generation started!");
      } catch (error) { console.error(error); toast.error("Failed."); } finally { setIsBulkGenerating(false); setPendingPrevizShotIds([]); }
  };

  const handleGenerateShots = async (sceneId: number) => {
      try { toast.info("Generating shots..."); await generateShots(sceneId); fetchShots(sceneId); }
      catch (error) { console.error(error); toast.error("Failed to generate shots."); }
  };

  const getAllShots = useCallback(() => scenes.flatMap(scene => shotsMap[scene.id] || []), [scenes, shotsMap]);
  const handleNextShot = () => { const all = getAllShots(); if (!selectedShot || all.length === 0) return; const i = all.findIndex(s => s.id === selectedShot.id); if (i < all.length - 1) setSelectedShot(all[i + 1]); };
  const handlePrevShot = () => { const all = getAllShots(); if (!selectedShot || all.length === 0) return; const i = all.findIndex(s => s.id === selectedShot.id); if (i > 0) setSelectedShot(all[i - 1]); };
  const refreshPreviz = (sceneId: number) => fetchShots(sceneId);

  const getSlideshowShots = useCallback(() => {
      if (selectedSceneIds.size === 0 && selectedShotIds.size === 0) return getAllShots();
      const sceneShots = Array.from(selectedSceneIds).flatMap(sceneId => shotsMap[sceneId] || []);
      const allAvail = getAllShots();
      const specific = Array.from(selectedShotIds).map(id => allAvail.find(s => s.id === id)).filter(Boolean) as Shot[];
      const combined = [...sceneShots, ...specific];
      const unique = Array.from(new Set(combined.map(s => s.id))).map(id => combined.find(s => s.id === id)!);
      return unique.sort((a, b) => {
          const sA = scenes.find(s => s.id === a.scene); const sB = scenes.find(s => s.id === b.scene);
          if ((sA?.order || 0) !== (sB?.order || 0)) return (sA?.order || 0) - (sB?.order || 0);
          return a.order - b.order;
      });
  }, [selectedSceneIds, selectedShotIds, getAllShots, shotsMap, scenes]);

  if (loadingScenes) return <div className="h-full flex items-center justify-center bg-[#0a0a0a]"><Loader2 className="animate-spin h-6 w-6 text-[#333]" /></div>;

  return (
    <div className="flex h-full bg-[#0a0a0a] overflow-hidden relative">
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Toolbar */}
        <div className="h-14 border-b border-[#1a1a1a] bg-[#0d0d0d] flex items-center justify-between px-5 z-10">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-bold text-white">Storyboard</h1>
            <span className="text-[#333]">|</span>

            {/* Quick Jump */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161616] hover:bg-[#1a1a1a] rounded-md text-[11px] font-medium transition-colors text-[#888] border border-[#222]">
                Jump <ChevronRight className="w-3 h-3 rotate-90" />
              </button>
              <div className="absolute top-full left-0 mt-1.5 w-56 max-h-80 overflow-y-auto bg-[#111] border border-[#222] rounded-md shadow-xl p-1.5 hidden group-hover:block z-50">
                {scenes.map(scene => (
                  <button key={scene.id} onClick={() => document.getElementById(`scene-${scene.id}`)?.scrollIntoView({ behavior: 'smooth' })}
                    className="w-full text-left px-2.5 py-2 rounded text-[11px] text-[#888] hover:bg-[#1a1a1a] hover:text-white truncate transition-colors flex items-center gap-2">
                    <span className="flex-shrink-0 text-[9px] font-mono text-[#555]">{String(scene.order).padStart(2,'0')}</span>
                    <span className="truncate">{scene.scene_name || "Untitled"}</span>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSelectAll}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161616] hover:bg-[#1a1a1a] rounded-md text-[11px] font-medium transition-colors text-[#888] border border-[#222]">
              {selectedSceneIds.size === scenes.length && scenes.length > 0 ? <CheckSquare className="w-3 h-3" /> : <Square className="w-3 h-3" />}
              {selectedSceneIds.size === scenes.length && scenes.length > 0 ? "Deselect" : "Select All"}
            </button>

            {selectedSceneIds.size > 0 && (
              <span className="text-[10px] text-emerald-400 font-medium bg-emerald-500/10 px-2 py-1 rounded-md border border-emerald-500/20">
                {selectedSceneIds.size} selected
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setIsSlideshowOpen(true)} disabled={scenes.length === 0}
              className="bg-[#161616] hover:bg-[#1a1a1a] text-white px-3 py-2 rounded-md text-[11px] font-medium transition-colors disabled:opacity-30 flex items-center gap-1.5 border border-[#222]">
              <Play className="w-3.5 h-3.5 text-emerald-400" /> Slideshow
            </button>

            {(selectedSceneIds.size > 0 || selectedShotIds.size > 0) && (
              <>
                <button disabled={isBulkGenerating || selectedSceneIds.size === 0} onClick={handleBulkGenerateShots}
                  className="bg-[#161616] hover:bg-[#1a1a1a] text-white px-3 py-2 rounded-md text-[11px] font-medium transition-colors disabled:opacity-30 flex items-center gap-1.5 border border-[#222]">
                  {isBulkGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Film className="w-3.5 h-3.5" />} Bulk Shots
                </button>
                <button disabled={isBulkGenerating} onClick={handleBulkGeneratePreviz}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-2 rounded-md text-[11px] font-medium transition-colors disabled:opacity-30 flex items-center gap-1.5">
                  {isBulkGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
                  Bulk Previz {selectedShotIds.size > 0 && selectedSceneIds.size === 0 ? `(${selectedShotIds.size})` : ''}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 scroll-smooth">
          <div className="max-w-[1800px] mx-auto">
            {scenes.length > 0 ? scenes.map(scene => (
              <div id={`scene-${scene.id}`} key={scene.id} className="scroll-mt-6">
                <SceneItem scene={scene} shots={shotsMap[scene.id] || []}
                  isSelected={selectedSceneIds.has(scene.id)} onToggleSelect={handleToggleSelectId}
                  onShotClick={setSelectedShot} loadingShots={loadingShotsMap[scene.id]}
                  onGenerateShots={handleGenerateShots} trackedTasks={trackedTasks} shotErrors={shotErrors}
                  selectedShotIds={selectedShotIds} onToggleSelectShot={handleToggleSelectShotId}
                  retryingTasks={retryingTasks} onUpdateShot={handleUpdateShot} onReorderShots={handleReorderShots}
                />
              </div>
            )) : <div className="text-center py-20"><p className="text-[#444]">No scenes found.</p></div>}
            <div className="h-20" />
          </div>
        </div>
      </div>

      <ShotDetailModal isOpen={!!selectedShot} onClose={() => setSelectedShot(null)} shot={selectedShot}
        error={selectedShot ? shotErrors[selectedShot.id] : undefined}
        scene={selectedShot ? scenes.find(s => shotsMap[s.id]?.some(shot => shot.id === selectedShot.id)) || null : null}
        onPrev={getAllShots().findIndex(s => s.id === selectedShot?.id) > 0 ? handlePrevShot : undefined}
        onNext={getAllShots().findIndex(s => s.id === selectedShot?.id) < getAllShots().length - 1 ? handleNextShot : undefined}
        onGeneratePreviz={(shotId) => { generateShotImage(shotId).then(() => { toast.info("Previz started."); const scene = scenes.find(s => shotsMap[s.id]?.some(shot => shot.id === shotId)); if (scene) refreshPreviz(scene.id); }).catch(e => { console.error(e); toast.error("Failed"); }); }}
        showGenerateButton={true}
      />

      <StoryboardSlideshowModal isOpen={isSlideshowOpen} onClose={() => setIsSlideshowOpen(false)} shots={getSlideshowShots()} />

      <ModelSelector isOpen={isModelSelectorOpen}
        onClose={() => { setIsModelSelectorOpen(false); setPendingPrevizShotIds([]); }}
        onConfirm={handleModelConfirm} itemCount={pendingPrevizShotIds.length}
        title="Select Model for Previz" confirmLabel="Generate Previz"
      />
    </div>
  );
}
