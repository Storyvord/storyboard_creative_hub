"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getScripts, getScenes, getShots, generateShotImage, bulkGenerateShots, bulkGeneratePreviz, generateShots, getStoryboardDataPaginated, getSceneStoryboardData, getScriptTasks, getShotPreviz, getBulkTaskStatus, updateScript, createShot, reorderShots as reorderShotsApi } from "@/services/creative-hub";
import ModelSelector from "@/components/creative-hub/ModelSelector";
import { Scene, Shot, Script } from "@/types/creative-hub";
import { Loader2, Film, ChevronRight, CheckSquare, Square, Play, Image as ImageIcon, CheckCircle, Circle, AlertTriangle, GripVertical, Plus, X } from "lucide-react";
import { clsx } from "clsx";
import { useParams } from "next/navigation";
import ShotDetailModal from "@/components/creative-hub/ShotDetailModal";
import StoryboardSlideshowModal from "@/components/creative-hub/StoryboardSlideshowModal";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";

// Shot type abbreviation map — aligned with backend shot_types choices
const SHOT_TYPE_MAP: Record<string, string> = {
  "Close-Up": "CU",
  "Wide Shot": "WS",
  "Tracking Shot": "TRK",
  "Over-The-Shoulder": "OTS",
  "Medium Shot": "MS",
  "Medium Close-Up": "MCU",
  "Medium Two-Shot": "2S",
  "Other": "OTH",
};

// Camera angle choices — aligned with backend camera_angles choices
export const CAMERA_ANGLES = [
  "Eye Level",
  "High Angle",
  "Low Angle",
  "Dutch Angle",
  "Bird's Eye View",
  "Worm's Eye View",
  "Overhead",
  "Other",
];

const SHOT_TYPES = Object.keys(SHOT_TYPE_MAP);
export const ASPECT_RATIOS = ["16:9", "9:16", "1:1", "4:3", "3:4", "2.35:1", "21:9", "3:2"];

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
  isDragging: boolean;
  onGeneratePreviz?: (shotId: number) => void;
  isGhost?: boolean;
  onDragEnterCard?: (e: React.DragEvent) => void;
}

function ShotCard({ shot, onClick, isSelected, onToggleSelect, isGenerating, isRetrying, error, onUpdateShot, onDragStart, onDragOver, onDrop, isDragging, onGeneratePreviz, isGhost, onDragEnterCard }: ShotCardProps) {
  const [desc, setDesc] = useState(shot.description || "");

  useEffect(() => { setDesc(shot.description || ""); }, [shot.description]);

  const handleDescBlur = () => {
    if (desc !== shot.description) onUpdateShot(shot.id, "description", desc);
  };

  return (
    <div
      draggable={!isGhost}
      onDragStart={(e) => onDragStart(e, shot.id)}
      onDragOver={onDragOver}
      onDragEnter={onDragEnterCard}
      onDrop={(e) => onDrop(e, shot.id)}
      className={clsx(
        "flex-shrink-0 w-56 border rounded-md overflow-hidden flex flex-col",
        "transition-[border-color,box-shadow,background-color,opacity]",
        isGhost
          ? "border-emerald-400/50 border-dashed bg-emerald-950/10 opacity-60 pointer-events-none"
          : isDragging
            ? "border-emerald-400 ring-2 ring-emerald-400/30 bg-emerald-950/20 opacity-50"
            : isSelected
              ? "border-emerald-500/40 ring-1 ring-emerald-500/20 hover:border-emerald-500/60 bg-[#111] group"
              : "border-[#222] hover:border-[#333] bg-[#111] group"
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
          <div className="absolute bottom-0 inset-x-0 bg-red-900/90 px-2 py-1.5 z-10 flex items-center justify-between">
            <span className="text-[9px] text-red-200 font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Failed</span>
            {onGeneratePreviz && (
              <button
                onClick={(e) => { e.stopPropagation(); onGeneratePreviz(shot.id); }}
                className="text-[9px] font-medium text-white bg-emerald-600 hover:bg-emerald-500 px-2 py-0.5 rounded transition-colors flex items-center gap-1"
              >
                <Play className="w-2.5 h-2.5" /> Retry
              </button>
            )}
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

// ─── Insert Zone (hover-to-reveal + button between shots) ────
function InsertZone({ onInsert }: { onInsert: () => void }) {
  return (
    <div className="flex-shrink-0 w-4 flex items-center justify-center self-stretch group/insert relative">
      {/* Thin line always visible */}
      <div className="w-px h-full bg-transparent group-hover/insert:bg-emerald-500/30 transition-colors" />
      {/* + button on hover */}
      <button
        onClick={(e) => { e.stopPropagation(); onInsert(); }}
        className="absolute z-20 opacity-0 group-hover/insert:opacity-100 transition-all duration-150 w-6 h-6 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/40 hover:scale-110"
        title="Insert shot here"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Add Shot card (end of row) ──────────────────────────────
function AddShotCard({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="flex-shrink-0 w-56 min-h-[200px] border border-dashed border-[#222] hover:border-emerald-500/40 rounded-md flex flex-col items-center justify-center gap-2 bg-[#0a0a0a] hover:bg-emerald-500/5 transition-all group/add"
    >
      <div className="w-8 h-8 rounded-full border border-[#333] group-hover/add:border-emerald-500/50 flex items-center justify-center transition-colors">
        <Plus className="w-4 h-4 text-[#555] group-hover/add:text-emerald-400 transition-colors" />
      </div>
      <span className="text-[11px] text-[#555] group-hover/add:text-emerald-400 font-medium transition-colors">Add Shot</span>
    </button>
  );
}

// ─── Add Shot Modal ──────────────────────────────────────────
interface AddShotModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: { description: string; type: string; camera_angle: string; movement: string }) => void;
  insertOrder: number;
  sceneName: string;
  isSubmitting: boolean;
}

function AddShotModal({ isOpen, onClose, onSubmit, insertOrder, sceneName, isSubmitting }: AddShotModalProps) {
  const [description, setDescription] = useState("");
  const [shotType, setShotType] = useState("Wide Shot");
  const [cameraAngle, setCameraAngle] = useState("Eye Level");
  const [movement, setMovement] = useState("");

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;
    onSubmit({ description: description.trim(), type: shotType, camera_angle: cameraAngle, movement: movement.trim() });
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-lg border border-[#2a2a2a] bg-[#101010]">
        <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Add Shot #{insertOrder}</h3>
            <p className="text-[10px] text-[#666] mt-0.5">{sceneName}</p>
          </div>
          <button onClick={onClose} className="text-[#888] hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="text-[10px] text-[#888] uppercase tracking-wider block mb-1">Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-md px-3 py-2 text-xs text-white placeholder-[#444] focus:outline-none focus:border-emerald-500/40 resize-none"
              rows={3}
              placeholder="Describe the shot..."
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-[#888] uppercase tracking-wider block mb-1">Shot Type</label>
              <select
                value={shotType}
                onChange={(e) => setShotType(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-md px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
              >
                {SHOT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-[#888] uppercase tracking-wider block mb-1">Camera Angle</label>
              <select
                value={cameraAngle}
                onChange={(e) => setCameraAngle(e.target.value)}
                className="w-full bg-[#0a0a0a] border border-[#222] rounded-md px-2 py-2 text-xs text-white focus:outline-none focus:border-emerald-500/40"
              >
                {CAMERA_ANGLES.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-[#888] uppercase tracking-wider block mb-1">Camera Movement (optional)</label>
            <input
              value={movement}
              onChange={(e) => setMovement(e.target.value)}
              className="w-full bg-[#0a0a0a] border border-[#222] rounded-md px-3 py-2 text-xs text-white placeholder-[#444] focus:outline-none focus:border-emerald-500/40"
              placeholder="e.g. Pan left, Dolly in..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="px-3 py-1.5 text-xs text-[#888] hover:text-white rounded border border-[#222] hover:bg-[#1a1a1a] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!description.trim() || isSubmitting}
              className="px-4 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white rounded transition-colors disabled:opacity-50 flex items-center gap-1.5">
              {isSubmitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Add Shot
            </button>
          </div>
        </form>
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
  onInsertShot: (sceneId: number, atOrder: number) => void;
  scriptId: number | null;
  onGeneratePreviz: (shotId: number) => void;
  globalDraggingId: number | null;
  onGlobalDragStart: (shotId: number) => void;
  onGlobalDragEnd: () => void;
}

function SceneItem({ scene, shots, isSelected, onToggleSelect, onShotClick, loadingShots,
  onGenerateShots, trackedTasks, shotErrors, selectedShotIds, onToggleSelectShot,
  retryingTasks, onUpdateShot, onReorderShots, onInsertShot, scriptId, onGeneratePreviz,
  globalDraggingId, onGlobalDragStart, onGlobalDragEnd }: SceneItemProps) {

  const [dragOverShotId, setDragOverShotId] = useState<number | null>(null);

  // Is the dragged shot from THIS scene?
  const isDragSource = globalDraggingId ? shots.some(s => s.id === globalDraggingId) : false;

  // Same-scene reorder preview only — no ghost card insertion for cross-scene
  const displayShots = (() => {
    if (!globalDraggingId || !dragOverShotId || globalDraggingId === dragOverShotId) return shots;
    if (!isDragSource) return shots; // cross-scene: don't mutate the array, use indicator line instead
    const fromIdx = shots.findIndex(s => s.id === globalDraggingId);
    const toIdx = shots.findIndex(s => s.id === dragOverShotId);
    if (fromIdx === -1 || toIdx === -1) return shots;
    const reordered = [...shots];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    return reordered;
  })();

  const handleDragStart = (e: React.DragEvent, shotId: number) => {
    onGlobalDragStart(shotId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(shotId));
  };

  const handleContainerDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleShotDragEnter = (e: React.DragEvent, targetShotId: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (globalDraggingId !== targetShotId) {
      setDragOverShotId(targetShotId);
    }
  };

  const handleContainerDragLeave = (e: React.DragEvent) => {
    // Only clear if leaving the container entirely (not entering a child)
    const container = e.currentTarget as HTMLElement;
    const related = e.relatedTarget as HTMLElement | null;
    if (!related || !container.contains(related)) {
      setDragOverShotId(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetShotId: number | null) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedId = Number(e.dataTransfer.getData('text/plain'));
    if (draggedId && draggedId !== targetShotId) {
      onReorderShots(scene.id, draggedId, targetShotId);
    }
    setDragOverShotId(null);
    onGlobalDragEnd();
  };

  const handleDragEnd = () => {
    setDragOverShotId(null);
    onGlobalDragEnd();
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


      </div>

      {/* Shot Horizontal Scroll */}
      <div className="p-4" onDragEnd={handleDragEnd}>
        {loadingShots ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="w-5 h-5 animate-spin text-[#333]" /></div>
        ) : shots.length > 0 ? (
          <div className="flex items-center gap-0 overflow-x-auto pb-2 scroll-smooth"
            onDragOver={handleContainerDragOver}
            onDragLeave={handleContainerDragLeave}
            onDrop={(e) => handleDrop(e, dragOverShotId)}
          >
            {/* Insert zone before first shot */}
            <InsertZone onInsert={() => onInsertShot(scene.id, 1)} />

            {displayShots.map((shot, idx) => {
              // Show a drop indicator line before this shot when cross-scene dragging
              const showDropIndicator = !isDragSource && globalDraggingId && dragOverShotId === shot.id;
              return (
                <div key={shot.id} className="flex items-center flex-shrink-0">
                  {showDropIndicator && (
                    <div className="flex-shrink-0 w-1 self-stretch bg-emerald-400 rounded-full mx-0.5 shadow-[0_0_6px_rgba(52,211,153,0.5)]" />
                  )}
                  <ShotCard
                    shot={shot} onClick={() => onShotClick(shot)}
                    isSelected={selectedShotIds.has(shot.id)} onToggleSelect={() => onToggleSelectShot(shot.id)}
                    isGenerating={!!trackedTasks[shot.id]} isRetrying={!!retryingTasks[shot.id]}
                    error={shotErrors[shot.id]} onUpdateShot={onUpdateShot}
                    onDragStart={handleDragStart}
                    onDragOver={handleContainerDragOver}
                    onDrop={handleDrop}
                    isDragging={globalDraggingId === shot.id}
                    onGeneratePreviz={onGeneratePreviz}
                    onDragEnterCard={(e) => handleShotDragEnter(e, shot.id)}
                  />
                  {/* Insert zone after each shot */}
                  <InsertZone onInsert={() => onInsertShot(scene.id, (displayShots[idx]?.order ?? idx) + 1)} />
                </div>
              );
            })}

            {/* Add Shot card at end */}
            <AddShotCard onAdd={() => onInsertShot(scene.id, shots.length + 1)} />
          </div>
        ) : (
          <div
            className={clsx(
              "flex items-center gap-4 py-4 rounded-md transition-colors",
              globalDraggingId ? "border border-dashed border-[#333] bg-[#0a0a0a]" : ""
            )}
            onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
            onDrop={(e) => handleDrop(e, null)}
          >
            <AddShotCard onAdd={() => onInsertShot(scene.id, 1)} />
            <div className="flex flex-col items-start gap-2">
              <p className="text-[#444] text-xs">{globalDraggingId ? "Drop shot here" : "Add your first shot manually or generate with AI"}</p>
              {!globalDraggingId && (
                <button onClick={() => onGenerateShots(scene.id)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5">
                  <Film className="w-3 h-3" /> Generate Shots
                </button>
              )}
            </div>
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
  const [activeScript, setActiveScript] = useState<Script | null>(null);
  const [trackedTasks, setTrackedTasks] = useState<Record<number, string>>({});
  const [trackedShotTasks, setTrackedShotTasks] = useState<Record<number, string>>({});
  const [retryingTasks, setRetryingTasks] = useState<Record<number, boolean>>({});
  const [shotErrors, setShotErrors] = useState<Record<number, string>>({});
  const [initializedScriptId, setInitializedScriptId] = useState<number | null>(null);
  
  const [isSlideshowOpen, setIsSlideshowOpen] = useState(false);
  const [isModelSelectorOpen, setIsModelSelectorOpen] = useState(false);
  const [pendingPrevizShotIds, setPendingPrevizShotIds] = useState<number[]>([]);
  const [globalDraggingId, setGlobalDraggingId] = useState<number | null>(null);

  // ─── Paginated progressive loading ────────────────────────────
  const [allScenesMeta, setAllScenesMeta] = useState<Scene[]>([]);   // lightweight list for Jump dropdown
  const [nextPage, setNextPage] = useState<number | null>(null);     // next page to fetch (null = all loaded)
  const [totalSceneCount, setTotalSceneCount] = useState(0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  // Helper: parse one page of storyboard data into scenes + shotsMap entries
  const parseStoryboardPage = useCallback((data: any[], scriptId: number) => {
    const parsedScenes: Scene[] = [];
    const parsedShotsMap: Record<number, Shot[]> = {};
    data.forEach((sceneData: any) => {
      parsedScenes.push({ id: sceneData.id, script_id: scriptId, scene_name: sceneData.scene_name, description: sceneData.description, order: sceneData.order, location: "", set_number: "", environment: "", int_ext: "", date: "", timeline: [], scene_characters: sceneData.scene_characters || [], created_at: "", updated_at: "" });
      const shots: Shot[] = (sceneData.shots || []).map((sd: any) => {
        let imageUrl = null;
        let activePreviz = null;
        if (sd.previz?.length > 0) {
          if (sd.active_previz) activePreviz = sd.previz.find((p: any) => p.id === sd.active_previz) || null;
          if (!activePreviz) activePreviz = sd.previz[sd.previz.length - 1];
          imageUrl = activePreviz?.image_url || null;
        }
        return { id: sd.id, scene: sceneData.id, description: sd.description, type: sd.type || "Wide Shot", order: sd.order, done: false, timeline: {}, movement: "", camera_angle: "", lighting: "", rationale: "", created_at: "", updated_at: "", image_url: imageUrl, active_previz: sd.active_previz, previz: activePreviz } as Shot;
      });
      parsedShotsMap[sceneData.id] = shots.sort((a, b) => a.order - b.order);
    });
    return { parsedScenes, parsedShotsMap };
  }, []);

  // Fetch the next page and APPEND to existing state
  const fetchNextPage = useCallback(async () => {
    if (!activeScriptId || nextPage === null || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const { results, next } = await getStoryboardDataPaginated(activeScriptId, nextPage);
      const { parsedScenes, parsedShotsMap } = parseStoryboardPage(results, activeScriptId);
      setScenes(prev => {
        const existingIds = new Set(prev.map(s => s.id));
        const newScenes = parsedScenes.filter(s => !existingIds.has(s.id));
        return [...prev, ...newScenes].sort((a, b) => a.order - b.order);
      });
      setShotsMap(prev => ({ ...prev, ...parsedShotsMap }));
      setNextPage(next ? nextPage + 1 : null);
    } catch (error) {
      console.error("Failed to fetch next storyboard page:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [activeScriptId, nextPage, isLoadingMore, parseStoryboardPage]);

  // IntersectionObserver: when sentinel comes into view, load next API page
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && nextPage !== null && !isLoadingMore) {
          fetchNextPage();
        }
      },
      { rootMargin: "400px" },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [fetchNextPage, nextPage, isLoadingMore]);

  // Jump: fetch all pages up to the one containing the target scene, then scroll
  const handleJumpToScene = useCallback(
    async (sceneId: number) => {
      // If the scene is already loaded, just scroll
      if (scenes.some(s => s.id === sceneId)) {
        document.getElementById(`scene-${sceneId}`)?.scrollIntoView({ behavior: "smooth" });
        return;
      }
      // Otherwise, keep fetching pages until the scene appears
      if (!activeScriptId || nextPage === null) return;
      setIsLoadingMore(true);
      let page: number | null = nextPage;
      try {
        while (page !== null) {
          const { results, next } = await getStoryboardDataPaginated(activeScriptId, page);
          const { parsedScenes, parsedShotsMap } = parseStoryboardPage(results, activeScriptId);
          setScenes(prev => {
            const existingIds = new Set(prev.map(s => s.id));
            const newScenes = parsedScenes.filter(s => !existingIds.has(s.id));
            return [...prev, ...newScenes].sort((a, b) => a.order - b.order);
          });
          setShotsMap(prev => ({ ...prev, ...parsedShotsMap }));
          const found = parsedScenes.some(s => s.id === sceneId);
          page = next ? page + 1 : null;
          setNextPage(page);
          if (found) break;
        }
      } catch (error) {
        console.error("Failed to fetch pages for jump:", error);
      } finally {
        setIsLoadingMore(false);
      }
      // Wait for React to render, then scroll
      requestAnimationFrame(() => {
        setTimeout(() => {
          document.getElementById(`scene-${sceneId}`)?.scrollIntoView({ behavior: "smooth" });
        }, 80);
      });
    },
    [scenes, activeScriptId, nextPage, parseStoryboardPage],
  );

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
                toast.error(extractApiError(e, "Failed to save new shot order."));
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
                  const newErrors: Record<number, string> = {};
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
                      // Restore errors from recently failed tasks so user sees "Failed" + Retry
                      if (!hasImage && taskAge < maxAgeMs && ['failed','failure'].includes(task.status) && task.error) {
                          newErrors[task.object_id] = task.error;
                      }
                  });
                  if (Object.keys(newTracked).length > 0) { setTrackedTasks(newTracked); setRetryingTasks(newRetrying); }
                  if (Object.keys(newErrors).length > 0) { setShotErrors(prev => ({ ...prev, ...newErrors })); }
              }
          } catch (e) { console.error("Failed to initialize active tasks", e); }
      };
      initializeActiveTasks();
  }, [activeScriptId, shotsMap, initializedScriptId]);

  // Polling with Exponential Backoff
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    let consecutivePolls = 0;
    let isCancelled = false;

    const fetchTasks = async () => {
        if (isCancelled) return;
        const allTaskIds = [...Object.values(trackedTasks), ...Object.values(trackedShotTasks)];
        if (!activeScriptId || allTaskIds.length === 0) {
            consecutivePolls = 0;
            return;
        }
        
        try {
            const data = await getBulkTaskStatus(allTaskIds);
            const returnedTasks = data?.tasks || [];
            const tasksToComplete: {shotId: number, status: string, error?: string}[] = [];
            
            const KNOWN_PENDING_STATUSES = ['processing','pending','retrying','started'];
            Object.entries(trackedTasks).forEach(([shotIdStr, taskId]) => {
                const shotId = Number(shotIdStr);
                const task = returnedTasks.find((t: any) => t.task_id === taskId);
                if (!task) {
                    // Task not found in response — backend lost it, treat as failed
                    tasksToComplete.push({ shotId, status: 'failed', error: 'Task not found. It may have expired.' });
                } else if (['completed','success'].includes(task.status)) {
                    tasksToComplete.push({ shotId, status: task.status, error: task.error });
                } else if (['failed','failure','revoked'].includes(task.status)) {
                    tasksToComplete.push({ shotId, status: 'failed', error: task.error || 'Generation failed.' });
                } else if (task.status === 'retrying') {
                    setRetryingTasks(prev => ({ ...prev, [shotId]: true }));
                } else if (KNOWN_PENDING_STATUSES.includes(task.status)) {
                    setRetryingTasks(prev => { if (!prev[shotId]) return prev; const c = { ...prev }; delete c[shotId]; return c; });
                } else {
                    // Unknown status — treat as failed to prevent stuck spinners
                    tasksToComplete.push({ shotId, status: 'failed', error: task.error || `Unexpected status: ${task.status}` });
                }
            });
            
            const shotsToRefresh: number[] = [];
            const newLoadingShots: Record<number, boolean> = {};
            Object.entries(trackedShotTasks).forEach(([sceneIdStr, taskId]) => {
                const sceneId = Number(sceneIdStr);
                const task = returnedTasks.find((t: any) => t.task_id === taskId);
                if (!task) {
                    // Task lost — clear loading
                    if (loadingShotsMap[sceneId]) shotsToRefresh.push(sceneId);
                    newLoadingShots[sceneId] = false;
                } else if (['completed','failed','success','failure','revoked'].includes(task.status)) {
                    if (loadingShotsMap[sceneId]) shotsToRefresh.push(sceneId);
                    newLoadingShots[sceneId] = false;
                    if (['failed','failure','revoked'].includes(task.status)) {
                        toast.error(task.error || 'Shot generation failed.');
                    }
                } else if (KNOWN_PENDING_STATUSES.includes(task.status)) {
                    newLoadingShots[sceneId] = true;
                } else {
                    // Unknown status — clear loading
                    if (loadingShotsMap[sceneId]) shotsToRefresh.push(sceneId);
                    newLoadingShots[sceneId] = false;
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
                                // Automatically update active selected shot if it finished
                                setSelectedShot(prev => prev && prev.id === t.shotId ? { ...prev, image_url: last.image_url, previz: last } : prev);
                            }
                        } catch (err) { console.error(err); }
                    } else if (t.status === 'failed') { 
                        toast.error(t.error || "Task failed."); 
                        setShotErrors(prev => ({ ...prev, [t.shotId]: t.error || "Unknown Error" })); 
                    }
                });
            }
            
            // Schedule the next poll with exponential backoff if there are still tasks
            const remainingTasksCount = allTaskIds.length - tasksToComplete.length - shotsToRefresh.length;
            if (remainingTasksCount > 0 && !isCancelled) {
                consecutivePolls++;
                // Exponential backoff: 3s, 4.5s, 6.75s... max 30s
                const delay = Math.min(3000 * Math.pow(1.5, consecutivePolls), 30000);
                timeoutId = setTimeout(fetchTasks, delay);
            } else {
                consecutivePolls = 0;
            }
            
        } catch (e) {
             console.error("Polling error", e);
             if (!isCancelled) {
                 // Retry after 10s on error
                 timeoutId = setTimeout(fetchTasks, 10000);
             }
        }
    };
    
    if (Object.keys(trackedTasks).length > 0 || Object.keys(trackedShotTasks).length > 0) { 
        fetchTasks(); 
    }
    
    return () => { 
        isCancelled = true;
        if (timeoutId) clearTimeout(timeoutId); 
    };
  }, [activeScriptId, trackedTasks, trackedShotTasks, scenes, shotsMap, loadingShotsMap]);

  useEffect(() => { if (projectId) fetchScenes(); }, [projectId]);

  const fetchScenes = async () => {
    try {
      setLoadingScenes(true);
      let scriptId: number | null = null;
      try { 
        const scripts = await getScripts(projectId); 
        if (scripts?.length > 0) { 
          scriptId = scripts[0].id; 
          setActiveScriptId(scriptId); 
          setActiveScript(scripts[0]);
        } 
      } catch (e) { console.error(e); }
      if (!scriptId) { setLoadingScenes(false); return; }

      // Fetch lightweight scene list (all scenes) for Jump dropdown
      try {
        const allScenes = await getScenes(scriptId);
        setAllScenesMeta(allScenes.sort((a, b) => a.order - b.order));
      } catch (e) { console.error("Failed to fetch scene list:", e); }

      // Fetch page 1 of heavy storyboard data (scenes + shots + previz)
      const { results, count, next } = await getStoryboardDataPaginated(scriptId, 1);
      const { parsedScenes, parsedShotsMap } = parseStoryboardPage(results, scriptId);
      setScenes(parsedScenes.sort((a, b) => a.order - b.order));
      setShotsMap(parsedShotsMap);
      setTotalSceneCount(count);
      setNextPage(next ? 2 : null);
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
                  let activePreviz = null;

                  if (sd.previz?.length > 0) {
                      if (sd.active_previz) {
                          activePreviz = sd.previz.find((p: any) => p.id === sd.active_previz) || null;
                      }
                      if (!activePreviz) {
                          activePreviz = sd.previz[sd.previz.length - 1];
                      }
                      imageUrl = activePreviz?.image_url || null;
                  }

                  return { id: sd.id, scene: sceneId, description: sd.description, type: sd.type || "Wide Shot", order: sd.order, image_url: imageUrl, active_previz: sd.active_previz, previz: activePreviz } as Shot;
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
      } catch (error) { console.error(error); toast.error(extractApiError(error, "Failed to generate shots.")); } finally { setIsBulkGenerating(false); }
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
      } catch (error) { console.error(error); toast.error(extractApiError(error, "Failed to start previz generation.")); } finally { setIsBulkGenerating(false); setPendingPrevizShotIds([]); }
  };

  const handleGenerateShots = async (sceneId: number) => {
      try { toast.info("Generating shots..."); await generateShots(sceneId); fetchShots(sceneId); }
      catch (error) { console.error(error); toast.error(extractApiError(error, "Failed to generate shots.")); }
  };

  // ─── Manual shot insertion ──────────────────────────────
  const [addShotModal, setAddShotModal] = useState<{ sceneId: number; order: number } | null>(null);
  const [isAddingShotSubmitting, setIsAddingShotSubmitting] = useState(false);

  const handleInsertShot = (sceneId: number, atOrder: number) => {
    setAddShotModal({ sceneId, order: atOrder });
  };

  const handleAddShotSubmit = async (data: { description: string; type: string; camera_angle: string; movement: string }) => {
    if (!addShotModal || !activeScriptId) return;
    const { sceneId, order } = addShotModal;
    setIsAddingShotSubmitting(true);

    try {
      // 1. Create the new shot at the target order
      await createShot(activeScriptId, {
        scene: sceneId,
        description: data.description,
        type: data.type,
        order,
        camera_angle: data.camera_angle,
        movement: data.movement,
      });

      // 2. Bump the order of all shots at or after this position (except the new one)
      const existingShots = shotsMap[sceneId] || [];
      const reorderPayload = existingShots
        .filter(s => s.order >= order)
        .map(s => ({ id: s.id, scene_id: sceneId, order: s.order + 1 }));

      if (reorderPayload.length > 0) {
        await reorderShotsApi(reorderPayload);
      }

      toast.success(`Shot #${order} added!`);
      setAddShotModal(null);

      // 3. Refresh shots for this scene
      await fetchShots(sceneId);
    } catch (error) {
      console.error(error);
      toast.error(extractApiError(error, "Failed to add shot."));
    } finally {
      setIsAddingShotSubmitting(false);
    }
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

            {/* Script Aspect Ratio */}
            {activeScript && (
              <div className="flex items-center gap-2 mr-2">
                <span className="text-[11px] font-medium text-[#888]">Aspect Ratio:</span>
                <select 
                  className="bg-[#161616] hover:bg-[#1a1a1a] border border-[#222] rounded-md text-[11px] font-medium transition-colors text-white px-2 py-1.5 outline-none focus:border-emerald-500/40"
                  value={activeScript.aspect_ratio || "16:9"}
                  onChange={async (e) => {
                    const newValue = e.target.value;
                    setActiveScript({ ...activeScript, aspect_ratio: newValue });
                    try {
                      await updateScript(activeScript.id, { aspect_ratio: newValue });
                      toast.success("Default aspect ratio updated.");
                    } catch(err) {
                      toast.error(extractApiError(err, "Failed to update aspect ratio."));
                    }
                  }}
                >
                  {ASPECT_RATIOS.map(ar => <option key={ar} value={ar}>{ar}</option>)}
                </select>
              </div>
            )}

            <span className="text-[#333]">|</span>

            {/* Quick Jump */}
            <div className="relative group">
              <button className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#161616] hover:bg-[#1a1a1a] rounded-md text-[11px] font-medium transition-colors text-[#888] border border-[#222]">
                Jump <ChevronRight className="w-3 h-3 rotate-90" />
              </button>
              <div className="absolute top-full left-0 mt-1.5 w-56 max-h-80 overflow-y-auto bg-[#111] border border-[#222] rounded-md shadow-xl p-1.5 hidden group-hover:block z-50">
                {allScenesMeta.map(scene => {
                  const isLoaded = scenes.some(s => s.id === scene.id);
                  return (
                    <button key={scene.id} onClick={() => handleJumpToScene(scene.id)}
                      className="w-full text-left px-2.5 py-2 rounded text-[11px] text-[#888] hover:bg-[#1a1a1a] hover:text-white truncate transition-colors flex items-center gap-2">
                      <span className="flex-shrink-0 text-[9px] font-mono text-[#555]">{String(scene.order).padStart(2,'0')}</span>
                      <span className="truncate">{scene.scene_name || "Untitled"}</span>
                      {!isLoaded && <span className="ml-auto text-[8px] text-[#444]">⏳</span>}
                    </button>
                  );
                })}
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
            <button
              onClick={() => window.location.href = `/projects/${projectId}/creative-hub/creative-space`}
              className="bg-[#161616] hover:bg-[#1a1a1a] text-white px-3 py-2 rounded-md text-[11px] font-medium transition-colors flex items-center gap-1.5 border border-[#222]"
            >
              <ImageIcon className="w-3.5 h-3.5 text-indigo-400" /> Creative Space
            </button>

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
            {scenes.length > 0 ? (
              <>
                {scenes.map(scene => (
                  <div id={`scene-${scene.id}`} key={scene.id} className="scroll-mt-6">
                    <SceneItem scene={scene} shots={shotsMap[scene.id] || []}
                      isSelected={selectedSceneIds.has(scene.id)} onToggleSelect={handleToggleSelectId}
                      onShotClick={setSelectedShot} loadingShots={loadingShotsMap[scene.id]}
                      onGenerateShots={handleGenerateShots} trackedTasks={trackedTasks} shotErrors={shotErrors}
                      selectedShotIds={selectedShotIds} onToggleSelectShot={handleToggleSelectShotId}
                      retryingTasks={retryingTasks} onUpdateShot={handleUpdateShot} onReorderShots={handleReorderShots}
                      onInsertShot={handleInsertShot} scriptId={activeScriptId}
                      onGeneratePreviz={(shotId) => { setShotErrors(prev => { const c = { ...prev }; delete c[shotId]; return c; }); setPendingPrevizShotIds([shotId]); setIsModelSelectorOpen(true); }}
                      globalDraggingId={globalDraggingId}
                      onGlobalDragStart={(shotId) => setGlobalDraggingId(shotId)}
                      onGlobalDragEnd={() => setGlobalDraggingId(null)}
                    />
                  </div>
                ))}
                {/* Sentinel – triggers fetching the next API page when scrolled near */}
                {nextPage !== null && (
                  <div ref={sentinelRef} className="flex items-center justify-center py-6 text-[11px] text-[#555]">
                    {isLoadingMore ? (
                      <><Loader2 className="w-4 h-4 animate-spin mr-2 text-[#444]" /> Loading more scenes…</>
                    ) : (
                      <span className="text-[#444]">{scenes.length} of {totalSceneCount} scenes loaded</span>
                    )}
                  </div>
                )}
              </>
            ) : <div className="text-center py-20"><p className="text-[#444]">No scenes found.</p></div>}
            <div className="h-20" />
          </div>
        </div>
      </div>

      <ShotDetailModal isOpen={!!selectedShot} onClose={() => setSelectedShot(null)} shot={selectedShot}
        error={selectedShot ? shotErrors[selectedShot.id] : undefined}
        isGenerating={selectedShot ? !!trackedTasks[selectedShot.id] : false}
        scene={selectedShot ? scenes.find(s => shotsMap[s.id]?.some(shot => shot.id === selectedShot.id)) || null : null}
        onPrev={getAllShots().findIndex(s => s.id === selectedShot?.id) > 0 ? handlePrevShot : undefined}
        onNext={getAllShots().findIndex(s => s.id === selectedShot?.id) < getAllShots().length - 1 ? handleNextShot : undefined}
        onGeneratePreviz={(shotId) => { 
            setPendingPrevizShotIds([shotId]); 
            setIsModelSelectorOpen(true); 
        }}
        showGenerateButton={true}
        onUpdateShot={(shotId, field, value) => {
           handleUpdateShot(shotId, field, value);
           if (selectedShot && selectedShot.id === shotId) {
               setSelectedShot(prev => prev ? { ...prev, [field]: value } : null);
           }
        }}
      />

      <StoryboardSlideshowModal isOpen={isSlideshowOpen} onClose={() => setIsSlideshowOpen(false)} shots={getSlideshowShots()} />

      <ModelSelector isOpen={isModelSelectorOpen}
        onClose={() => { setIsModelSelectorOpen(false); setPendingPrevizShotIds([]); }}
        onConfirm={handleModelConfirm} itemCount={pendingPrevizShotIds.length}
        title="Select Model for Previz" confirmLabel="Generate Previz"
      />

      <AddShotModal
        isOpen={!!addShotModal}
        onClose={() => setAddShotModal(null)}
        onSubmit={handleAddShotSubmit}
        insertOrder={addShotModal?.order ?? 1}
        sceneName={scenes.find(s => s.id === addShotModal?.sceneId)?.scene_name || "Scene"}
        isSubmitting={isAddingShotSubmitting}
      />

      {/* Modal deprecated in favor of route */}
    </div>
  );
}
