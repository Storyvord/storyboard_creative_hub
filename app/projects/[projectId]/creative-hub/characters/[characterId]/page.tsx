"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  getCharacter, updateCharacter, generateCharacterImage,
  getCloths, updateSceneCharacter, generateSceneCharacterImage,
  getCharacterTasks,
} from "@/services/creative-hub";
import { Character, Cloth } from "@/types/creative-hub";
import {
  Loader2, ArrowLeft, Upload, Wand2, Save, Film,
  Shirt, Check, User, ImageOff, MapPin, Clock, Pencil, X,
} from "lucide-react";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import ModelSelector from "@/components/creative-hub/ModelSelector";
import { useGenerationTasks } from "@/hooks/useGenerationTasks";

type GenStep = "saving" | "queued" | "rendering";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SceneAppearance {
  id: number;
  scene: number;
  scene_name: string;
  scene_order: number;
  scene_location: string | null;
  scene_int_ext: string | null;
  scene_environment: string | null;
  image_url: string | null;
  notes: string;
  cloths: { id: number; name: string; cloth_type: string; image_url: string | null }[];
}

interface CharacterDetail extends Character {
  script: number;
  scene_appearances: SceneAppearance[];
}

// ─── Cloth type config ────────────────────────────────────────────────────────

const CLOTH_TYPE_LABELS: Record<string, string> = {
  torso: "Torso",
  legs: "Legs",
  feet: "Feet",
  head: "Head",
  face: "Face",
  hands: "Hands",
  full_body: "Full Body",
  accessories: "Accessories",
};

// ─── Scene Look Editor ────────────────────────────────────────────────────────

function SceneLookEditor({
  appearance,
  availableCloths,
  generating,
  genStep,
  characterPortraitUrl,
  characterName,
  onGenerate,
  onUpdate,
  onClose,
}: {
  appearance: SceneAppearance;
  availableCloths: Cloth[];
  generating: boolean;
  genStep: GenStep | null;
  characterPortraitUrl: string | null;
  characterName: string;
  onGenerate: (model: string, provider: string, notes: string, clothIds: number[], prompt: string) => void;
  onUpdate: () => void;
  onClose: () => void;
}) {
  const [notes, setNotes] = useState(appearance.notes || "");
  const [selectedClothIds, setSelectedClothIds] = useState<number[]>(appearance.cloths.map(c => c.id));
  const [imagePreview, setImagePreview] = useState<string | null>(appearance.image_url || null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (appearance.image_url && appearance.image_url !== imagePreview) {
      setImagePreview(appearance.image_url);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appearance.image_url]);

  const clothsByType = availableCloths.reduce<Record<string, Cloth[]>>((acc, c) => {
    const t = c.cloth_type || "accessories";
    acc[t] = acc[t] ? [...acc[t], c] : [c];
    return acc;
  }, {});
  const tabs = Object.keys(clothsByType);
  const effectiveTab = activeTab && clothsByType[activeTab] ? activeTab : (tabs[0] ?? null);

  const toggleCloth = (id: number) =>
    setSelectedClothIds(p => p.includes(id) ? p.filter(c => c !== id) : [...p, id]);

  const selectedCloths = availableCloths.filter(c => selectedClothIds.includes(c.id));

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSceneCharacter(appearance.id, {
        notes, cloth_ids: selectedClothIds,
        ...(imageFile ? { image_url: imageFile } : {}),
      });
      toast.success("Scene look saved");
      setImageFile(null);
      onUpdate();
    } catch (e) {
      toast.error(extractApiError(e, "Failed to save."));
    } finally {
      setSaving(false);
    }
  };

  const handleModelConfirm = (model: string, provider: string) => {
    setIsModelOpen(false);
    onGenerate(model, provider, notes, selectedClothIds, prompt);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/85 backdrop-blur-md"
      onClick={onClose}
    >
      <div
        className="bg-[#080808] border border-[#1e1e1e] border-b-0 rounded-t-2xl w-full max-w-[1100px] shadow-2xl flex flex-col"
        style={{ height: "90vh" }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div className="px-6 pt-4 pb-3.5 border-b border-[#151515] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="flex-shrink-0 flex flex-col items-center justify-center bg-[var(--surface)] border border-[#1e1e1e] rounded-lg px-3.5 py-2 min-w-[56px]">
              <span className="text-[8px] text-[#3a3a3a] uppercase tracking-widest font-mono">SC</span>
              <span className="text-xl font-black text-[var(--text-primary)] leading-none font-mono tabular-nums">
                {String(appearance.scene_order).padStart(2, "0")}
              </span>
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-[var(--text-primary)] leading-tight truncate">{appearance.scene_name}</h3>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {appearance.scene_int_ext && (
                  <span className="text-[9px] bg-[var(--surface)] border border-[#1e1e1e] text-[#4a4a4a] uppercase font-mono px-1.5 py-0.5 rounded tracking-wider">
                    {appearance.scene_int_ext}
                  </span>
                )}
                {appearance.scene_location && (
                  <span className="text-[10px] text-[#4a4a4a] flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-[var(--text-muted)]" />{appearance.scene_location}
                  </span>
                )}
                {appearance.scene_environment && (
                  <span className="text-[10px] text-[#3a3a3a] flex items-center gap-1">
                    <Clock className="h-3 w-3" />{appearance.scene_environment}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={onClose} className="flex-shrink-0 p-2 rounded-xl hover:bg-[var(--surface)] text-[var(--text-muted)] hover:text-white transition-colors ml-4">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden min-h-0">

          {/* ═══ LEFT PANEL: Character images ═══ */}
          <div className="w-[420px] flex-shrink-0 border-r border-[var(--border)] flex gap-3 p-4 bg-[var(--background)]">

            {/* Character portrait reference */}
            <div className="flex flex-col gap-2 w-[140px] flex-shrink-0">
              <p className="text-[8px] text-[#2e2e2e] uppercase tracking-widest font-semibold">Character Ref</p>
              <div className="aspect-[2/3] rounded-xl bg-[var(--background)] border border-[#191919] overflow-hidden relative">
                {characterPortraitUrl ? (
                  <img
                    src={characterPortraitUrl}
                    alt={characterName}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#1e1e1e]">
                    <User className="h-8 w-8" />
                    <span className="text-[8px] text-[#252525] text-center px-2 leading-tight">{characterName}</span>
                  </div>
                )}
                {/* Character name tag */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <p className="text-[8px] text-[var(--text-secondary)] font-medium truncate">{characterName}</p>
                </div>
              </div>
            </div>

            {/* Scene look — the main canvas */}
            <div className="flex-1 flex flex-col gap-2 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-[8px] text-[#2e2e2e] uppercase tracking-widest font-semibold">Scene Look</p>
                {!generating && (
                  <button
                    onClick={() => fileRef.current?.click()}
                    className="flex items-center gap-1 text-[8px] text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition-colors"
                  >
                    <Upload className="h-2.5 w-2.5" /> Upload
                  </button>
                )}
              </div>

              <div
                className="aspect-[2/3] rounded-xl bg-[var(--background)] border border-[#191919] overflow-hidden relative group cursor-pointer"
                onClick={() => !generating && fileRef.current?.click()}
              >
                {/* Shimmer when generating with no preview */}
                {generating && !imagePreview && (
                  <div className="absolute inset-0 bg-gradient-to-br from-[#0c0c1a] via-[#080808] to-[#0c0c1a] animate-pulse" />
                )}

                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Scene look"
                    className={`w-full h-full object-contain transition-opacity duration-700 ${generating ? "opacity-20" : "opacity-100"}`}
                  />
                ) : (
                  !generating && (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-[#1e1e1e]">
                      <ImageOff className="h-10 w-10" />
                      <div className="text-center">
                        <p className="text-[10px] text-[#2a2a2a] font-medium">No scene look yet</p>
                        <p className="text-[8px] text-[#1e1e1e] mt-0.5">Assign costume and generate</p>
                      </div>
                    </div>
                  )
                )}

                {/* Generation overlay */}
                {generating && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4">
                    <div className="relative">
                      <div className="h-14 w-14 rounded-full border-2 border-indigo-500/15" />
                      <div className="absolute inset-0 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                      <Wand2 className="absolute inset-0 m-auto h-5 w-5 text-indigo-400" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-semibold text-indigo-300">
                        {genStep === "saving" ? "Saving…" : genStep === "queued" ? "In Queue…" : "Rendering…"}
                      </p>
                      <p className="text-[10px] text-[var(--text-muted)] mt-1">
                        {genStep === "saving" ? "Applying wardrobe selection" : genStep === "queued" ? "AI model is starting up" : "Building your character look"}
                      </p>
                    </div>
                    {/* Step dots */}
                    <div className="flex items-center gap-1.5">
                      {(["saving", "queued", "rendering"] as const).map((step, i) => {
                        const stepIdx = ["saving", "queued", "rendering"].indexOf(genStep ?? "");
                        return (
                          <div key={step} className={`h-1 rounded-full transition-all duration-500 ${
                            genStep === step ? "w-6 bg-indigo-400" :
                            stepIdx > i ? "w-1.5 bg-indigo-700" : "w-1.5 bg-[#1e1e1e]"
                          }`} />
                        );
                      })}
                    </div>
                  </div>
                )}

                {!generating && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2">
                    <Upload className="h-5 w-5 text-white/70" />
                    <span className="text-[10px] text-white/50">Upload custom image</span>
                  </div>
                )}

                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} />
              </div>

              {/* Generate button under the scene look */}
              <button
                onClick={() => !generating && setIsModelOpen(true)}
                disabled={generating}
                className="w-full py-3 text-[11px] font-bold bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:bg-[var(--surface)] disabled:text-[#2a2a2a] disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {generating ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {genStep === "queued" ? "In Queue…" : "Rendering…"}</>
                ) : (
                  <><Wand2 className="h-4 w-4" /> Generate Scene Look</>
                )}
              </button>
            </div>
          </div>

          {/* ═══ CENTER PANEL: Wardrobe picker ═══ */}
          <div className="flex-1 flex flex-col overflow-hidden border-r border-[var(--border)] min-w-0">

            {/* Assigned costume rack */}
            <div className={`flex-shrink-0 px-5 pt-4 pb-3 border-b border-[#151515] ${selectedCloths.length === 0 ? "bg-[#080808]" : "bg-[#090909]"}`}>
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-semibold">
                  Assigned Costume
                  {selectedCloths.length > 0 && (
                    <span className="ml-2 text-indigo-500 font-bold">{selectedCloths.length}</span>
                  )}
                </p>
                {selectedClothIds.length > 0 && (
                  <button onClick={() => setSelectedClothIds([])} className="text-[9px] text-[var(--text-muted)] hover:text-red-400 transition-colors">
                    Clear all
                  </button>
                )}
              </div>

              {selectedCloths.length === 0 ? (
                <div className="flex items-center gap-2 text-[#222] py-1">
                  <Shirt className="h-3.5 w-3.5" />
                  <span className="text-[10px]">No items selected — pick from wardrobe below</span>
                </div>
              ) : (
                <div className="flex gap-2.5 overflow-x-auto pb-0.5" style={{ scrollbarWidth: "none" }}>
                  {selectedCloths.map(c => (
                    <div key={c.id} className="flex-shrink-0 relative group/item">
                      <div className="w-14 h-14 rounded-xl bg-[var(--surface)] border border-indigo-500/25 overflow-hidden">
                        {c.image_url ? (
                          <img src={c.image_url} alt={c.name} className="w-full h-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Shirt className="h-5 w-5 text-[#2a2a2a]" />
                          </div>
                        )}
                      </div>
                      <button
                        onClick={() => toggleCloth(c.id)}
                        className="absolute -top-1 -right-1 bg-[var(--surface-hover)] border border-[#2a2a2a] rounded-full p-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity"
                      >
                        <X className="h-2.5 w-2.5 text-[var(--text-secondary)]" />
                      </button>
                      <p className="text-[8px] text-[#3a3a3a] text-center mt-1 truncate max-w-[56px]">{c.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* All wardrobe */}
            <div className="flex-1 overflow-y-auto px-5 pt-4 pb-3">
              <p className="text-[9px] text-[#2a2a2a] uppercase tracking-widest font-semibold mb-3 flex items-center gap-1.5">
                <Shirt className="h-3 w-3 text-[var(--text-muted)]" /> All Wardrobe
              </p>

              {availableCloths.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Shirt className="h-10 w-10 text-[#151515] mb-3" />
                  <p className="text-[11px] text-[var(--text-muted)]">No wardrobe items yet</p>
                  <p className="text-[9px] text-[#222] mt-1">Add items in the Wardrobe section first.</p>
                </div>
              ) : (
                <>
                  {/* Category tabs */}
                  <div className="flex gap-1.5 flex-wrap mb-4">
                    {tabs.map(t => {
                      const selectedInTab = clothsByType[t].filter(c => selectedClothIds.includes(c.id)).length;
                      return (
                        <button
                          key={t}
                          onClick={() => setActiveTab(t)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium border transition-all ${
                            effectiveTab === t
                              ? "bg-[#151515] border-[#2a2a2a] text-white"
                              : "bg-transparent border-[#141414] text-[#3a3a3a] hover:border-[var(--border)] hover:text-[var(--text-muted)]"
                          }`}
                        >
                          <span>{CLOTH_TYPE_LABELS[t] ?? t}</span>
                          {selectedInTab > 0 && (
                            <span className="bg-indigo-500 text-white text-[7px] rounded-full w-3.5 h-3.5 flex items-center justify-center font-bold leading-none">
                              {selectedInTab}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Cloth grid — larger cards so images are clear */}
                  {effectiveTab && (
                    <div className="grid grid-cols-3 gap-3">
                      {clothsByType[effectiveTab].map(c => {
                        const selected = selectedClothIds.includes(c.id);
                        return (
                          <button
                            key={c.id}
                            onClick={() => toggleCloth(c.id)}
                            className={`group relative rounded-xl overflow-hidden border transition-all duration-150 text-left ${
                              selected
                                ? "border-indigo-500/40 ring-1 ring-indigo-500/15 bg-indigo-950/20"
                                : "border-[#151515] bg-[var(--background)] hover:border-[#252525] hover:bg-[var(--surface)]"
                            }`}
                          >
                            <div className="aspect-[3/4] relative overflow-hidden">
                              {c.image_url ? (
                                <img
                                  src={c.image_url}
                                  alt={c.name}
                                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-200"
                                />
                              ) : (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#1e1e1e]">
                                  <Shirt className="h-8 w-8" />
                                  <span className="text-[8px] text-[#252525] uppercase tracking-wider">
                                    {CLOTH_TYPE_LABELS[c.cloth_type] ?? c.cloth_type}
                                  </span>
                                </div>
                              )}
                              {selected && (
                                <div className="absolute top-2 right-2 bg-indigo-500 rounded-full p-1 shadow-lg">
                                  <Check className="h-3 w-3 text-white" />
                                </div>
                              )}
                            </div>
                            <div className="px-2.5 py-2 border-t border-[#111]">
                              <p className="text-[10px] font-medium text-white truncate leading-tight">{c.name}</p>
                              <p className={`text-[8px] mt-0.5 ${selected ? "text-indigo-400/60" : "text-[#2a2a2a]"}`}>
                                {CLOTH_TYPE_LABELS[c.cloth_type] ?? c.cloth_type}
                              </p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* ═══ RIGHT PANEL: Notes + save ═══ */}
          <div className="w-[220px] flex-shrink-0 flex flex-col p-5 gap-4 bg-[#060606]">
            <div className="flex flex-col gap-1.5">
              <p className="text-[8px] text-[#2a2a2a] uppercase tracking-widest font-semibold">Style Direction</p>
              <textarea
                value={prompt}
                onChange={e => setPrompt(e.target.value)}
                rows={4}
                placeholder="Lighting, mood, era, color palette, visual style..."
                className="w-full bg-[#0c0c0c] border border-[#161616] rounded-xl px-3 py-2.5 text-[10px] text-[var(--text-secondary)] focus:outline-none focus:border-[var(--border)] resize-none placeholder:text-[#222] leading-relaxed transition-colors"
              />
            </div>

            <div className="flex-1 flex flex-col gap-1.5">
              <p className="text-[8px] text-[#2a2a2a] uppercase tracking-widest font-semibold">Continuity Notes</p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full flex-1 bg-[#0c0c0c] border border-[#161616] rounded-xl px-3 py-2.5 text-[10px] text-[var(--text-secondary)] leading-relaxed focus:outline-none focus:border-[var(--border)] resize-none placeholder:text-[#222] transition-colors"
                placeholder="Injuries, aging, makeup FX, blood, costume damage, props..."
              />
            </div>

            <div className="flex-shrink-0 flex flex-col gap-2.5 pt-3 border-t border-[#131313]">
              <button
                onClick={handleSave}
                disabled={saving || generating}
                className="w-full py-3 text-[11px] font-bold bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-25 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Look
              </button>
              <p className="text-[8px] text-[#222] text-center">
                {selectedCloths.length} item{selectedCloths.length !== 1 ? "s" : ""} assigned
              </p>
            </div>
          </div>
        </div>
      </div>

      <ModelSelector isOpen={isModelOpen} onClose={() => setIsModelOpen(false)}
        onConfirm={handleModelConfirm} itemCount={1} title="Generate Scene Look" confirmLabel="Generate" />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CharacterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const characterId = Number(params.characterId);

  const [character, setCharacter] = useState<CharacterDetail | null>(null);
  const [availableCloths, setAvailableCloths] = useState<Cloth[]>([]);
  const [loading, setLoading] = useState(true);

  // Portrait / info editing
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [portraitGenStep, setPortraitGenStep] = useState<GenStep | null>(null);
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [editingInfo, setEditingInfo] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // Scene looks
  const [selectedAppearance, setSelectedAppearance] = useState<SceneAppearance | null>(null);
  const [generatingScenes, setGeneratingScenes] = useState<Map<number, GenStep>>(new Map());

  // DB-backed task tracking: taskId → objectId (characterId or sceneCharacterId)
  const [trackedPortraitTasks, setTrackedPortraitTasks] = useState<Record<string, number>>({});
  const [trackedSceneTasks, setTrackedSceneTasks] = useState<Record<string, number>>({});

  const fetchCharacter = useCallback(async (): Promise<CharacterDetail> => {
    const data = await getCharacter(characterId) as CharacterDetail;
    setCharacter(data);
    setName(data.name);
    setDescription(data.description || "");
    setImagePreview(data.image_url || null);
    setImageFile(null);
    setSelectedAppearance(prev => {
      if (!prev) return null;
      return data.scene_appearances.find(a => a.id === prev.id) ?? prev;
    });
    return data;
  }, [characterId]);

  useEffect(() => {
    const init = async () => {
      try {
        const data = await getCharacter(characterId) as CharacterDetail;
        setCharacter(data);
        setName(data.name);
        setDescription(data.description || "");
        setImagePreview(data.image_url || null);
        if (data.script) {
          try {
            const cloths = await getCloths(data.script);
            setAvailableCloths(cloths || []);
          } catch { /* wardrobe non-blocking */ }
        }

        // ── Restore in-progress tasks from DB ──
        try {
          const ACTIVE = new Set(['processing', 'pending', 'retrying', 'started']);
          const MAX_AGE = 60 * 60 * 1000; // 1 hour
          const now = Date.now();
          const tasks = await getCharacterTasks(characterId);

          const newPortrait: Record<string, number> = {};
          for (const t of tasks.portrait) {
            if (ACTIVE.has(t.status) && now - new Date(t.created_at).getTime() < MAX_AGE) {
              newPortrait[t.task_id] = t.object_id;
              setGenerating(true);
              setPortraitGenStep("rendering");
            }
          }
          setTrackedPortraitTasks(newPortrait);

          const newScene: Record<string, number> = {};
          const pendingScenes = new Map<number, GenStep>();
          for (const t of tasks.scene_looks) {
            if (ACTIVE.has(t.status) && now - new Date(t.created_at).getTime() < MAX_AGE) {
              newScene[t.task_id] = t.object_id;
              pendingScenes.set(t.object_id, "rendering");
            }
          }
          setTrackedSceneTasks(newScene);
          setGeneratingScenes(pendingScenes);
        } catch { /* task restore non-blocking */ }
      } catch (e) {
        console.error(e);
        toast.error(extractApiError(e, "Failed to load character."));
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [characterId]);

  const dirty = character && (name !== character.name || description !== (character.description || "") || !!imageFile);

  const handleSave = async () => {
    if (!name.trim()) return toast.error("Name is required");
    setSaving(true);
    try {
      await updateCharacter(characterId, { name, description, ...(imageFile ? { image_url: imageFile } : {}) });
      toast.success("Saved");
      setImageFile(null);
      setEditingInfo(false);
      await fetchCharacter();
    } catch (e) {
      toast.error(extractApiError(e, "Failed to save."));
    } finally {
      setSaving(false);
    }
  };

  const handleModelConfirm = async (model: string, provider: string) => {
    setIsModelOpen(false);
    setGenerating(true);
    setPortraitGenStep("saving");
    try {
      await updateCharacter(characterId, { name, description, ...(imageFile ? { image_url: imageFile } : {}) });
      setImageFile(null);
      setPortraitGenStep("queued");
      const result = await generateCharacterImage(characterId, model, provider);
      setTrackedPortraitTasks(prev => ({ ...prev, [result.task_id]: characterId }));
      setPortraitGenStep("rendering");
      toast.success("Portrait rendering — will update when ready…");
    } catch (e) {
      toast.error(extractApiError(e, "Failed to generate portrait."));
      setGenerating(false);
      setPortraitGenStep(null);
    }
  };

  // ── Scene look generation ──────────────────────────────────────────────────
  const handleSceneGenerate = useCallback(async (
    appearanceId: number,
    model: string,
    provider: string,
    notes: string,
    clothIds: number[],
    prompt: string,
  ) => {
    setGeneratingScenes(prev => new Map(prev).set(appearanceId, "saving"));
    try {
      await updateSceneCharacter(appearanceId, { notes, cloth_ids: clothIds });
      setGeneratingScenes(prev => new Map(prev).set(appearanceId, "queued"));
      const result = await generateSceneCharacterImage(appearanceId, prompt || undefined, model, provider);
      setTrackedSceneTasks(prev => ({ ...prev, [result.task_id]: appearanceId }));
      setGeneratingScenes(prev => new Map(prev).set(appearanceId, "rendering"));
      toast.success("Scene look queued — rendering…");
    } catch (e) {
      toast.error(extractApiError(e, "Failed to generate."));
      setGeneratingScenes(prev => { const m = new Map(prev); m.delete(appearanceId); return m; });
    }
  }, []);

  // ── DB-backed task polling ────────────────────────────────────────────────
  const allTaskIds = [...Object.keys(trackedPortraitTasks), ...Object.keys(trackedSceneTasks)];

  useGenerationTasks({
    taskIds: allTaskIds,
    getObjectId: (taskId) => trackedPortraitTasks[taskId] ?? trackedSceneTasks[taskId] ?? 0,
    onComplete: (taskId) => {
      if (trackedPortraitTasks[taskId] !== undefined) {
        setTrackedPortraitTasks(prev => { const n = { ...prev }; delete n[taskId]; return n; });
        setGenerating(false);
        setPortraitGenStep(null);
        fetchCharacter().then(data => {
          if (data?.image_url) setImagePreview(data.image_url);
        });
        toast.success("Portrait is ready!");
      } else {
        const objectId = trackedSceneTasks[taskId];
        setTrackedSceneTasks(prev => { const n = { ...prev }; delete n[taskId]; return n; });
        setGeneratingScenes(prev => { const m = new Map(prev); m.delete(objectId); return m; });
        fetchCharacter();
        toast.success("Scene look is ready!");
      }
    },
    onError: (taskId, objectId, error) => {
      if (trackedPortraitTasks[taskId] !== undefined) {
        setTrackedPortraitTasks(prev => { const n = { ...prev }; delete n[taskId]; return n; });
        setGenerating(false);
        setPortraitGenStep(null);
        toast.error(`Portrait failed: ${error}`);
      } else {
        setTrackedSceneTasks(prev => { const n = { ...prev }; delete n[taskId]; return n; });
        setGeneratingScenes(prev => { const m = new Map(prev); m.delete(objectId); return m; });
        toast.error(`Scene look failed: ${error}`);
      }
    },
  });

  if (loading) {
    return (
      <div className="min-h-full bg-[#060606]">
        {/* Skeleton header */}
        <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-white/5">
          <div className="h-4 w-24 bg-zinc-800/60 rounded animate-pulse" />
          <div className="h-7 w-16 bg-zinc-800/60 rounded-lg animate-pulse" />
        </div>
        {/* Skeleton body */}
        <div className="px-6 pt-5 pb-10 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Left col */}
          <div className="space-y-3">
            <div className="w-full rounded-2xl bg-zinc-900/60 animate-pulse" style={{ aspectRatio: "2/3" }} />
            <div className="flex gap-2">
              <div className="flex-1 h-8 rounded-lg bg-zinc-900/60 animate-pulse" />
              <div className="flex-1 h-8 rounded-lg bg-zinc-900/60 animate-pulse" />
            </div>
            <div className="h-5 w-2/3 rounded bg-zinc-800/60 animate-pulse" />
            <div className="h-3 w-1/3 rounded bg-zinc-800/40 animate-pulse" />
            <div className="rounded-xl bg-zinc-900/40 border border-white/5 p-4 space-y-2">
              <div className="h-2.5 w-20 rounded bg-zinc-800/60 animate-pulse" />
              <div className="h-3 w-full rounded bg-zinc-800/40 animate-pulse" />
              <div className="h-3 w-4/5 rounded bg-zinc-800/40 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-zinc-900/40 border border-white/5 rounded-xl p-3 space-y-1.5">
                  <div className="h-3.5 w-3.5 rounded bg-zinc-800/60 animate-pulse" />
                  <div className="h-5 w-8 rounded bg-zinc-800/60 animate-pulse" />
                  <div className="h-2.5 w-12 rounded bg-zinc-800/40 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          {/* Right col */}
          <div>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-4 w-36 rounded bg-zinc-800/60 animate-pulse" />
              <div className="h-5 w-12 rounded-full bg-zinc-900 animate-pulse" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-xl overflow-hidden border border-white/5 bg-zinc-900/40">
                  <div className="aspect-[3/4] bg-zinc-900/60 animate-pulse" />
                  <div className="p-2.5 space-y-1">
                    <div className="h-2.5 w-3/4 rounded bg-zinc-800/60 animate-pulse" />
                    <div className="h-2 w-1/2 rounded bg-zinc-800/40 animate-pulse" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!character) {
    return <div className="p-6 text-[var(--text-muted)] text-sm text-center">Character not found.</div>;
  }

  const appearances = character.scene_appearances;
  const uniqueWardrobeCount = new Set(appearances.flatMap(a => a.cloths.map(c => c.id))).size;

  return (
    <div className="min-h-full bg-[#060606]">
      {/* ── Header bar ── */}
      <div className="px-6 pt-5 pb-4 flex items-center justify-between border-b border-white/5">
        <button
          onClick={() => router.push(`/projects/${projectId}/creative-hub/characters`)}
          className="flex items-center gap-2 text-xs text-zinc-500 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Characters
        </button>
        <div className="flex items-center gap-2">
          {dirty && (
            <button onClick={handleSave} disabled={saving}
              className="px-3 py-1.5 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-40">
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
              Save
            </button>
          )}
          <button onClick={() => setEditingInfo(p => !p)}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-500 hover:text-white transition-colors border border-white/5">
            <Pencil className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-6 pt-5 pb-10 grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">

        {/* ── Left: portrait + info ── */}
        <div className="space-y-3">
          {/* Portrait — full character visible */}
          <div className="relative group">
            <div
              className="w-full rounded-2xl overflow-hidden border border-white/5 bg-zinc-900 shadow-xl cursor-pointer"
              style={{ aspectRatio: "2/3" }}
              onClick={() => !generating && fileRef.current?.click()}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt={name}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 gap-2">
                  <span className="text-6xl font-black text-zinc-700">{name.charAt(0)}</span>
                  <span className="text-[9px] text-zinc-700 uppercase tracking-widest">No Portrait</span>
                </div>
              )}
              {generating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 backdrop-blur-sm rounded-2xl gap-3">
                  {/* Shimmer sweep behind */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-900/10 via-transparent to-emerald-900/10 animate-pulse" />
                  {/* Animated ring */}
                  <div className="relative z-10">
                    <div className="h-12 w-12 rounded-full border-2 border-emerald-500/20" />
                    <div className="absolute inset-0 h-12 w-12 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
                    <Wand2 className="absolute inset-0 m-auto h-5 w-5 text-emerald-400" />
                  </div>
                  <div className="text-center z-10">
                    <p className="text-sm font-semibold text-emerald-300 leading-none">
                      {portraitGenStep === "saving" ? "Saving…" : portraitGenStep === "queued" ? "In Queue…" : "Rendering Portrait…"}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-1">
                      {portraitGenStep === "saving" ? "Storing character data" : portraitGenStep === "queued" ? "AI model starting up" : "Building your portrait"}
                    </p>
                  </div>
                  {/* Progress dots */}
                  <div className="flex gap-1 z-10">
                    {(["saving", "queued", "rendering"] as const).map((step, i) => (
                      <div
                        key={step}
                        className={`h-1 rounded-full transition-all duration-500 ${
                          portraitGenStep === step ? "w-5 bg-emerald-400" :
                          (["saving", "queued", "rendering"].indexOf(portraitGenStep ?? "") > i) ? "w-2 bg-emerald-700" :
                          "w-2 bg-[#222]"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
              {!generating && (
                <div className="absolute inset-0 rounded-2xl bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                  <Upload className="h-6 w-6 text-white" />
                  <span className="text-[10px] text-white/80">Upload photo</span>
                </div>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) { setImageFile(f); setImagePreview(URL.createObjectURL(f)); } }} />
          </div>

          {/* Portrait action buttons */}
          <div className="flex gap-2">
            <button
              onClick={() => !generating && fileRef.current?.click()}
              disabled={generating}
              className="flex-1 py-2 text-[10px] font-medium bg-zinc-900/60 hover:bg-zinc-800/60 text-zinc-400 border border-white/5 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-30"
            >
              <Upload className="h-3 w-3" /> Upload
            </button>
            <button
              onClick={() => !generating && setIsModelOpen(true)}
              disabled={generating}
              className="flex-1 py-2 text-[10px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:bg-emerald-900/20 disabled:opacity-70"
            >
              {generating ? (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {portraitGenStep === "saving" ? "Saving…" : portraitGenStep === "queued" ? "Queued…" : "Rendering…"}
                </>
              ) : (
                <><Wand2 className="h-3 w-3" /> AI Generate</>
              )}
            </button>
          </div>

          {/* Character name */}
          <div>
            <h1 className="text-lg font-black text-[var(--text-primary)] tracking-tight">{character.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <Film className="h-3 w-3 text-emerald-500" />{appearances.length} scenes
              </span>
              <span className="text-[10px] text-zinc-600 flex items-center gap-1">
                <Shirt className="h-3 w-3 text-indigo-400" />{uniqueWardrobeCount} wardrobe
              </span>
            </div>
          </div>

          {/* Description */}
          <div className="bg-zinc-900/40 rounded-xl border border-white/5 p-4">
            <p className="text-[9px] text-zinc-600 uppercase tracking-widest font-semibold mb-2">Bio / AI Prompt</p>
            {editingInfo ? (
              <div className="space-y-3">
                <div>
                  <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Name</label>
                  <input type="text" value={name} onChange={e => setName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-white text-sm font-semibold focus:outline-none focus:border-emerald-500/40 transition-colors" />
                </div>
                <div>
                  <label className="text-[9px] text-zinc-600 uppercase tracking-widest block mb-1">Description</label>
                  <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4}
                    placeholder="Physical appearance, build, age, scars, personality…"
                    className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-xs text-zinc-300 leading-relaxed focus:outline-none focus:border-emerald-500/40 transition-colors resize-none placeholder:text-zinc-700" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingInfo(false)}
                    className="flex-1 py-2 text-[10px] text-zinc-600 hover:text-white transition-colors bg-zinc-900 rounded-lg border border-white/5">
                    Cancel
                  </button>
                  <button onClick={handleSave} disabled={saving || !dirty}
                    className="flex-1 py-2 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-30">
                    {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-zinc-500 leading-relaxed">
                {character.description || <span className="text-zinc-700 italic">No description yet.</span>}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-3">
              <Film className="h-3.5 w-3.5 text-emerald-500 mb-1.5" />
              <p className="text-lg font-black text-[var(--text-primary)] leading-none">{appearances.length}</p>
              <p className="text-[9px] text-zinc-700 uppercase tracking-wider mt-0.5">Scenes</p>
            </div>
            <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-3">
              <Shirt className="h-3.5 w-3.5 text-indigo-400 mb-1.5" />
              <p className="text-lg font-black text-[var(--text-primary)] leading-none">{uniqueWardrobeCount}</p>
              <p className="text-[9px] text-zinc-700 uppercase tracking-wider mt-0.5">Wardrobe</p>
            </div>
            {appearances.length > 0 && (
              <>
                <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-3">
                  <Clock className="h-3.5 w-3.5 text-amber-500/60 mb-1.5" />
                  <p className="text-sm font-bold text-[var(--text-primary)]">SC {String(appearances[0].scene_order).padStart(2, "0")}</p>
                  <p className="text-[9px] text-zinc-700 uppercase tracking-wider mt-0.5">First</p>
                </div>
                <div className="bg-zinc-900/40 border border-white/5 rounded-xl p-3">
                  <Clock className="h-3.5 w-3.5 text-amber-500/60 mb-1.5" />
                  <p className="text-sm font-bold text-[var(--text-primary)]">SC {String(appearances[appearances.length - 1].scene_order).padStart(2, "0")}</p>
                  <p className="text-[9px] text-zinc-700 uppercase tracking-wider mt-0.5">Last</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Right: scene appearances ── */}
        <div>
          {/* Section header */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-[var(--text-primary)]">Costume Breakdown</h2>
              <p className="text-[10px] text-zinc-600 mt-0.5">
                {appearances.filter(a => a.cloths.length > 0).length} of {appearances.length} scenes have costume assigned
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {/* Progress pill — scene order */}
              <div className="flex items-center gap-1.5 bg-zinc-900/60 border border-white/5 rounded-full px-3 py-1.5">
                {appearances.slice(0, Math.min(appearances.length, 14)).map(a => (
                  <div
                    key={a.id}
                    title={`SC ${String(a.scene_order).padStart(2,"0")} — ${a.scene_name}`}
                    className={`h-1.5 w-1.5 rounded-full transition-colors ${
                      generatingScenes.has(a.id) ? "bg-indigo-400 animate-pulse" :
                      a.image_url ? "bg-emerald-500" :
                      a.cloths.length > 0 ? "bg-zinc-500" : "bg-zinc-800"
                    }`}
                  />
                ))}
                {appearances.length > 14 && <span className="text-[8px] text-zinc-600">+{appearances.length - 14}</span>}
              </div>
              {/* Legend */}
              <div className="flex items-center gap-3 pr-1">
                <span className="flex items-center gap-1 text-[8px] text-zinc-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block" /> Look ready</span>
                <span className="flex items-center gap-1 text-[8px] text-zinc-700"><span className="h-1.5 w-1.5 rounded-full bg-zinc-500 inline-block" /> Costume only</span>
                <span className="flex items-center gap-1 text-[8px] text-zinc-700"><span className="h-1.5 w-1.5 rounded-full bg-zinc-800 inline-block" /> Empty</span>
              </div>
            </div>
          </div>

          {appearances.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 rounded-xl border border-dashed border-zinc-800/60 text-center bg-zinc-900/20">
              <Film className="h-10 w-10 text-zinc-800 mb-4" />
              <p className="text-zinc-600 text-sm font-medium">No scene appearances yet</p>
              <p className="text-[10px] text-zinc-700 mt-1">Generate scenes from your script to populate this character's schedule.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
              {appearances.map(a => {
                const isGenerating = generatingScenes.has(a.id);
                const hasLook = !!a.image_url;
                const hasCostume = a.cloths.length > 0;
                return (
                  <button
                    key={a.id}
                    onClick={() => setSelectedAppearance(a)}
                    className={`group relative rounded-xl overflow-hidden border transition-all duration-200 text-left ${
                      isGenerating ? "border-indigo-500/30 shadow-[0_0_20px_rgba(99,102,241,0.08)]" :
                      "border-white/5 bg-zinc-900/30 hover:border-zinc-700/60 hover:bg-zinc-900/60"
                    }`}
                  >
                    {/* Look thumbnail */}
                    <div className="aspect-[3/4] bg-zinc-900 relative overflow-hidden">
                      {hasLook ? (
                        <img src={a.image_url!} alt="" className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                          {/* Costume thumbnails if assigned but no generated look */}
                          {hasCostume ? (
                            <div className="flex flex-wrap gap-1 justify-center px-3">
                              {a.cloths.slice(0, 4).map(c => (
                                <div key={c.id} className="w-9 h-9 rounded-lg bg-zinc-800/60 border border-white/5 overflow-hidden flex items-center justify-center">
                                  {c.image_url ? (
                                    <img src={c.image_url} alt={c.name} className="w-full h-full object-contain" />
                                  ) : (
                                    <Shirt className="h-4 w-4 text-zinc-700" />
                                  )}
                                </div>
                              ))}
                              {a.cloths.length > 4 && (
                                <div className="w-9 h-9 rounded-lg bg-zinc-800/40 border border-white/5 flex items-center justify-center">
                                  <span className="text-[9px] text-zinc-500 font-bold">+{a.cloths.length - 4}</span>
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 text-zinc-800">
                              <User className="h-7 w-7 opacity-40" />
                              <span className="text-[8px] uppercase tracking-wider text-zinc-700">No Costume</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Gradient overlay */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                      {/* Scene number */}
                      <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-0.5 rounded-md border border-white/5">
                        <span className="text-[8px] font-mono text-zinc-500">SC </span>
                        <span className="text-[10px] font-black text-white font-mono">{String(a.scene_order).padStart(2, "0")}</span>
                      </div>

                      {/* Status badge top-right */}
                      <div className="absolute top-2 right-2">
                        {isGenerating ? (
                          <div className="bg-indigo-500/20 border border-indigo-500/40 rounded-md px-1.5 py-0.5 flex items-center gap-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-indigo-400 animate-pulse" />
                            <span className="text-[8px] text-indigo-300 font-medium">AI</span>
                          </div>
                        ) : hasLook ? (
                          <div className="bg-emerald-500/15 border border-emerald-500/30 rounded-md px-1.5 py-0.5">
                            <Check className="h-2.5 w-2.5 text-emerald-400" />
                          </div>
                        ) : hasCostume ? (
                          <div className="bg-zinc-800/80 border border-white/5 rounded-md px-1.5 py-0.5">
                            <Shirt className="h-2.5 w-2.5 text-zinc-500" />
                          </div>
                        ) : null}
                      </div>

                      {/* Generating overlay */}
                      {isGenerating && (
                        <div className="absolute inset-0 z-10 bg-black/60 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
                          <div className="relative">
                            <div className="h-8 w-8 rounded-full border-2 border-indigo-500/20" />
                            <div className="absolute inset-0 rounded-full border-2 border-indigo-400 border-t-transparent animate-spin" />
                            <Wand2 className="absolute inset-0 m-auto h-3 w-3 text-indigo-400" />
                          </div>
                          <p className="text-[8px] text-indigo-300 font-semibold uppercase tracking-wider">
                            {generatingScenes.get(a.id) === "saving" ? "Saving…" : generatingScenes.get(a.id) === "queued" ? "Queued…" : "Rendering…"}
                          </p>
                        </div>
                      )}

                      {/* Hover CTA */}
                      {!isGenerating && (
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-3">
                          <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-lg px-3 py-1.5 text-[9px] text-white font-semibold flex items-center gap-1.5">
                            <Pencil className="h-2.5 w-2.5" /> Edit Costume
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Card footer */}
                    <div className="px-2.5 py-2">
                      <p className="text-[10px] font-semibold text-white truncate leading-tight">{a.scene_name}</p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {a.scene_int_ext && (
                          <span className="text-[8px] text-zinc-700 uppercase font-mono">{a.scene_int_ext}</span>
                        )}
                        {a.scene_location && (
                          <span className="text-[8px] text-zinc-600 truncate flex items-center gap-0.5">
                            <MapPin className="h-2 w-2 flex-shrink-0" />{a.scene_location}
                          </span>
                        )}
                      </div>
                      {/* Continuity note preview */}
                      {a.notes && (
                        <p className="text-[8px] text-amber-500/50 mt-1 line-clamp-1 italic">{a.notes}</p>
                      )}
                      {/* Cloth count pill */}
                      {hasCostume && !hasLook && !isGenerating && (
                        <div className="mt-1.5 flex items-center gap-1 text-[8px] text-zinc-600">
                          <Shirt className="h-2.5 w-2.5" />
                          {a.cloths.length} item{a.cloths.length !== 1 ? "s" : ""} · no look yet
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Scene Look Editor modal */}
      {selectedAppearance && (
        <SceneLookEditor
          key={selectedAppearance.id}
          appearance={selectedAppearance}
          availableCloths={availableCloths}
          generating={generatingScenes.has(selectedAppearance.id)}
          genStep={generatingScenes.get(selectedAppearance.id) ?? null}
          characterPortraitUrl={imagePreview}
          characterName={name}
          onGenerate={(model, provider, notes, clothIds, prompt) =>
            handleSceneGenerate(selectedAppearance.id, model, provider, notes, clothIds, prompt)
          }
          onUpdate={fetchCharacter}
          onClose={() => setSelectedAppearance(null)}
        />
      )}

      <ModelSelector
        isOpen={isModelOpen}
        onClose={() => setIsModelOpen(false)}
        onConfirm={handleModelConfirm}
        itemCount={1}
        title="Generate Character Portrait"
        confirmLabel="Generate"
      />
    </div>
  );
}
