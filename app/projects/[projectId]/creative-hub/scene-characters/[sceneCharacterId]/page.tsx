"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    getSceneCharacter,
    updateSceneCharacter,
    deleteSceneCharacter,
    generateSceneCharacterImage,
    getBulkTaskStatus,
    getCloths,
    createCloth,
    setActiveSubjectPreviz,
    getScene,
} from "@/services/creative-hub";
import { Cloth } from "@/types/creative-hub";

const CLOTH_SLOTS = [
    { id: "head", label: "Head" },
    { id: "face", label: "Face" },
    { id: "torso", label: "Torso" },
    { id: "legs", label: "Legs" },
    { id: "feet", label: "Feet" },
    { id: "hands", label: "Hands" },
    { id: "full_body", label: "Full Body" },
    { id: "accessories", label: "Accessories" },
];
import {
    Loader2,
    ArrowLeft,
    Upload,
    Wand2,
    Save,
    User as UserIcon,
    Pencil,
    Trash2,
    Shirt,
    Film,
    Plus,
} from "lucide-react";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import ModelSelector from "@/components/creative-hub/ModelSelector";
import PrevizHistorySection from "@/components/creative-hub/PrevizHistorySection";

type GenStep = "saving" | "queued" | "rendering";

interface SceneCharacterDetail {
    id: number;
    scene?: number;
    character?: { id: number; name: string; image_url?: string | null; active_previz?: number | null } | null;
    image_url?: string | null;
    notes?: string | null;
    cloths?: Cloth[];
    active_previz?: number | null;
    [key: string]: unknown;
}

export default function SceneCharacterDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const sceneCharacterId = Number(params.sceneCharacterId);

    const [sc, setSc] = useState<SceneCharacterDetail | null>(null);
    const [loading, setLoading] = useState(true);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [notes, setNotes] = useState("");

    const [editingNotes, setEditingNotes] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [genStep, setGenStep] = useState<GenStep | null>(null);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [isModelOpen, setIsModelOpen] = useState(false);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

    // Wardrobe state — ported from the deprecated SceneCharacterDetailModal so
    // the dedicated detail page is feature-complete and the modal can retire.
    const [activeSlot, setActiveSlot] = useState<string>("torso");
    const [availableCloths, setAvailableCloths] = useState<Cloth[]>([]);
    const [selectedCloths, setSelectedCloths] = useState<Record<string, Cloth | null>>({});
    const [loadingCloths, setLoadingCloths] = useState(false);
    const [savingOutfit, setSavingOutfit] = useState(false);
    const [uploadingCloth, setUploadingCloth] = useState(false);

    const fileRef = useRef<HTMLInputElement>(null);
    const clothFileRef = useRef<HTMLInputElement>(null);

    const fetchScene = useCallback(async () => {
        const data = (await getSceneCharacter(sceneCharacterId)) as SceneCharacterDetail;
        setSc(data);
        setNotes(data.notes || "");
        setImagePreview(data.image_url || null);
        setImageFile(null);

        // Hydrate selected outfit from the persisted cloths array.
        const initialSelection: Record<string, Cloth | null> = {};
        for (const cloth of data.cloths || []) {
            if (cloth?.cloth_type) initialSelection[cloth.cloth_type] = cloth;
        }
        setSelectedCloths(initialSelection);
        return data;
    }, [sceneCharacterId]);

    const fetchClothLibrary = useCallback(async (scriptId: number) => {
        setLoadingCloths(true);
        try {
            const data = await getCloths(scriptId);
            setAvailableCloths(data || []);
        } catch (err) {
            console.error("Failed to fetch wardrobe", err);
            toast.error(extractApiError(err, "Failed to load wardrobe"));
        } finally {
            setLoadingCloths(false);
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                const data = await fetchScene();
                // Discover scriptId via the linked Scene, then warm the
                // wardrobe library so the cloths grid renders without
                // an extra round trip when the user opens it.
                if (data.scene !== undefined && data.scene !== null) {
                    try {
                        const scene = await getScene(Number(data.scene));
                        const scriptId = (scene as { script_id?: number; script?: number }).script_id
                            ?? (scene as { script?: number }).script;
                        if (scriptId) await fetchClothLibrary(Number(scriptId));
                    } catch (err) {
                        console.error("Failed to derive scriptId for wardrobe", err);
                    }
                }
            } catch (err) {
                console.error("Failed to load scene character", err);
                toast.error(extractApiError(err, "Failed to load scene character."));
            } finally {
                setLoading(false);
            }
        };
        if (sceneCharacterId) init();
    }, [sceneCharacterId, fetchScene, fetchClothLibrary]);

    // Poll background generation task (matches SceneCharacterDetailModal pattern).
    useEffect(() => {
        if (!activeTaskId) return;
        let cancelled = false;
        const tick = async () => {
            try {
                const data = await getBulkTaskStatus([activeTaskId]);
                const tasks = data?.tasks || [];
                if (cancelled || tasks.length === 0) return;
                const t = tasks[0];
                const inFlight = ["processing", "pending", "retrying", "started"].includes(t.status);
                if (!inFlight) {
                    setGenerating(false);
                    setGenStep(null);
                    setActiveTaskId(null);
                    if (t.status === "success" || t.status === "completed") {
                        await fetchScene();
                        setHistoryRefreshKey((k) => k + 1);
                        toast.success("New scene look is ready!");
                    } else if (t.status === "failed" || t.status === "failure") {
                        toast.error(t.error || "Generation failed. Please try again.");
                    }
                }
            } catch (err) {
                console.error("Failed to poll scene-character task", err);
            }
        };
        tick();
        const id = window.setInterval(tick, 5000);
        return () => {
            cancelled = true;
            window.clearInterval(id);
        };
    }, [activeTaskId, fetchScene]);

    const dirty = !!sc && (notes !== (sc.notes || "") || !!imageFile);

    // ── Wardrobe handlers ────────────────────────────────────────────────
    const handleClothSelect = (cloth: Cloth) => {
        setSelectedCloths((prev) => ({
            ...prev,
            [activeSlot]: cloth.id === prev[activeSlot]?.id ? null : cloth,
        }));
    };

    const handleClothUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !sc) return;
        // Discover scriptId from current scene context lazily.
        let scriptId: number | undefined;
        try {
            const scene = await getScene(Number(sc.scene));
            const sid = (scene as { script_id?: number; script?: number }).script_id
                ?? (scene as { script?: number }).script;
            if (sid) scriptId = Number(sid);
        } catch {
            /* fallthrough */
        }
        if (!scriptId) {
            toast.error("Could not resolve script for wardrobe.");
            return;
        }
        setUploadingCloth(true);
        try {
            const newCloth = await createCloth(scriptId, {
                name: file.name.split(".")[0],
                cloth_type: activeSlot,
                image: file,
            });
            toast.success("Item added to wardrobe");
            await fetchClothLibrary(scriptId);
            handleClothSelect(newCloth);
        } catch (err) {
            console.error("Failed to upload cloth", err);
            toast.error(extractApiError(err, "Failed to upload item"));
        } finally {
            setUploadingCloth(false);
            if (clothFileRef.current) clothFileRef.current.value = "";
        }
    };

    const handleSaveOutfit = async () => {
        setSavingOutfit(true);
        try {
            const clothIds = Object.values(selectedCloths)
                .filter((c) => c !== null)
                .map((c) => (c as Cloth).id);
            await updateSceneCharacter(sceneCharacterId, {
                cloth_ids: clothIds,
                notes,
            });
            toast.success("Outfit saved");
            await fetchScene();
        } catch (err) {
            toast.error(extractApiError(err, "Failed to save outfit"));
        } finally {
            setSavingOutfit(false);
        }
    };

    const filteredCloths = availableCloths.filter((c) => c.cloth_type === activeSlot);
    const selectedCount = Object.values(selectedCloths).filter((c) => c !== null).length;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const payload: Record<string, unknown> = { notes };
            if (imageFile) payload.image_url = imageFile;
            await updateSceneCharacter(sceneCharacterId, payload);
            toast.success("Saved");
            await fetchScene();
            setEditingNotes(false);
        } catch (err) {
            toast.error(extractApiError(err, "Failed to save."));
        } finally {
            setSaving(false);
        }
    };

    const handleGenerate = () => setIsModelOpen(true);

    const handleModelConfirm = async (
        model: string,
        provider: string,
        quality?: string,
        size?: string,
    ) => {
        setIsModelOpen(false);
        setGenerating(true);
        setGenStep("queued");
        try {
            const res = await generateSceneCharacterImage(
                sceneCharacterId,
                notes,
                model,
                provider,
                quality,
                size,
            );
            if (res?.task_id) {
                setActiveTaskId(res.task_id);
                setGenStep("rendering");
            } else {
                setGenerating(false);
                setGenStep(null);
            }
            toast.success("Generation started — will update when ready…");
        } catch (err) {
            toast.error(extractApiError(err, "Failed to start generation."));
            setGenerating(false);
            setGenStep(null);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Delete this scene character entry? This cannot be undone.")) return;
        try {
            await deleteSceneCharacter(sceneCharacterId);
            toast.success("Scene character deleted");
            router.back();
        } catch (err) {
            toast.error(extractApiError(err, "Failed to delete."));
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex justify-center">
                <Loader2 className="animate-spin h-6 w-6 text-[var(--text-muted)]" />
            </div>
        );
    }

    if (!sc) {
        return (
            <div className="p-6 text-center text-[var(--text-muted)]">
                Scene character not found.{" "}
                <button
                    onClick={() => router.back()}
                    className="text-emerald-400 hover:underline"
                >
                    Back
                </button>
            </div>
        );
    }

    const baseName = sc.character?.name || "—";
    const outfitCount = (sc.cloths || []).filter(Boolean).length;

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() => router.back()}
                    className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ArrowLeft className="h-3 w-3" />
                    Back
                </button>
                <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 text-[10px] font-medium text-red-400 hover:text-red-300 transition-colors"
                >
                    <Trash2 className="h-3 w-3" />
                    Delete
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: image + info + scene-look history */}
                <div className="lg:col-span-2 space-y-4">
                    {/* Title bar */}
                    <div>
                        <h1 className="text-lg font-black text-[var(--text-primary)] tracking-tight">
                            Scene Look — <span className="text-emerald-400">{baseName}</span>
                        </h1>
                        <div className="flex items-center gap-3 mt-1">
                            {sc.scene !== undefined && (
                                <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                    <Film className="h-3 w-3 text-emerald-500" /> Scene #{sc.scene}
                                </span>
                            )}
                            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                <Shirt className="h-3 w-3 text-indigo-400" />
                                {outfitCount} item{outfitCount === 1 ? "" : "s"} in outfit
                            </span>
                        </div>
                    </div>

                    {/* Image */}
                    <div
                        className="aspect-video bg-[var(--background)] rounded-xl border border-[var(--border)] overflow-hidden relative cursor-pointer group"
                        onClick={() => fileRef.current?.click()}
                    >
                        {imagePreview ? (
                            <img
                                src={imagePreview}
                                alt="Scene look"
                                className="w-full h-full object-contain"
                            />
                        ) : sc.character?.image_url ? (
                            <div className="w-full h-full relative">
                                <img
                                    src={sc.character.image_url}
                                    alt="Base character"
                                    className="w-full h-full object-contain opacity-70"
                                />
                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                    <span className="px-3 py-1 bg-black/60 text-white text-xs rounded-md backdrop-blur-md border border-white/10">
                                        Showing base portrait — generate a scene look
                                    </span>
                                </div>
                            </div>
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                                <UserIcon className="h-8 w-8 mb-2 opacity-30" />
                                <span className="text-[10px] uppercase tracking-wider">
                                    No image yet — click to upload
                                </span>
                            </div>
                        )}
                        {generating && (
                            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                                <Loader2 className="h-6 w-6 text-emerald-500 animate-spin mb-1" />
                                <span className="text-[10px] text-emerald-400 font-medium uppercase tracking-wider">
                                    {genStep === "saving"
                                        ? "Saving…"
                                        : genStep === "queued"
                                        ? "Queued…"
                                        : "Rendering…"}
                                </span>
                            </div>
                        )}
                        <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 text-white text-[10px]">
                            <Upload className="h-3 w-3" />
                            Click to replace
                        </div>
                        <input
                            ref={fileRef}
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleFileChange}
                        />
                    </div>

                    {/* Generate button */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || saving}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Generating…
                            </>
                        ) : (
                            <>
                                <Wand2 className="h-3.5 w-3.5" />
                                AI Generate Scene Look
                            </>
                        )}
                    </button>

                    {/* Notes / edit prompt */}
                    <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                Appearance Notes / Prompt
                            </h3>
                            <button
                                onClick={() => setEditingNotes((v) => !v)}
                                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                                title={editingNotes ? "Cancel edit" : "Edit notes"}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        {editingNotes ? (
                            <div className="space-y-3">
                                <textarea
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={4}
                                    placeholder="e.g. wearing a red dress, dirty face, exhausted look…"
                                    className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] leading-relaxed focus:outline-none focus:border-emerald-500/40 transition-colors resize-none placeholder:text-[var(--text-muted)]"
                                />
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingNotes(false);
                                            setNotes(sc.notes || "");
                                        }}
                                        className="flex-1 py-2 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors bg-[var(--surface-raised)] rounded-lg border border-[var(--border)]"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSave}
                                        disabled={saving || !dirty}
                                        className="flex-1 py-2 text-[10px] font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors flex items-center justify-center gap-1.5 disabled:opacity-30"
                                    >
                                        {saving ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                        ) : (
                                            <Save className="h-3 w-3" />
                                        )}
                                        Save
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <p className="text-xs text-[var(--text-muted)] leading-relaxed">
                                {notes || (
                                    <span className="text-[var(--text-muted)] italic">
                                        No appearance notes yet.
                                    </span>
                                )}
                            </p>
                        )}
                    </div>

                    {/* Scene-look history */}
                    <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-4">
                        <PrevizHistorySection
                            kind="scene_character"
                            subjectId={sceneCharacterId}
                            subjectLabel={`Scene Look: ${baseName}`}
                            activePrevizId={sc.active_previz ?? null}
                            refreshKey={historyRefreshKey}
                            onActivePrevizChange={(_id, url) => {
                                if (url) setImagePreview(url);
                                fetchScene();
                            }}
                        />
                    </div>
                </div>

                {/* Right: parent Character history */}
                <div>
                    <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-4 sticky top-4">
                        <div className="mb-3 flex items-center gap-2">
                            <UserIcon className="h-3.5 w-3.5 text-emerald-500" />
                            <div className="flex-1 min-w-0">
                                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                    Parent Character
                                </h3>
                                <p className="text-sm font-bold text-[var(--text-primary)] truncate">
                                    {baseName}
                                </p>
                            </div>
                            {sc.character?.id && (
                                <button
                                    onClick={() =>
                                        router.push(
                                            `/projects/${projectId}/creative-hub/characters/${sc.character?.id}`,
                                        )
                                    }
                                    className="text-[9px] text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline"
                                >
                                    Open page →
                                </button>
                            )}
                        </div>
                        {sc.character?.id ? (
                            <PrevizHistorySection
                                kind="character"
                                subjectId={sc.character.id}
                                subjectLabel={`Character: ${baseName}`}
                                activePrevizId={sc.character.active_previz ?? null}
                                refreshKey={historyRefreshKey}
                                onActivePrevizChange={() => {
                                    fetchScene();
                                    setHistoryRefreshKey((k) => k + 1);
                                }}
                                secondaryAction={{
                                    label: "Use for this scene",
                                    title: "Make this image the active look for the current scene character",
                                    onClick: async (previzId) => {
                                        try {
                                            await setActiveSubjectPreviz(
                                                "scene_character",
                                                sceneCharacterId,
                                                previzId,
                                            );
                                            toast.success("Linked to this scene");
                                            await fetchScene();
                                            setHistoryRefreshKey((k) => k + 1);
                                        } catch (err) {
                                            toast.error(
                                                extractApiError(
                                                    err,
                                                    "Failed to link to this scene.",
                                                ),
                                            );
                                        }
                                    },
                                }}
                            />
                        ) : (
                            <p className="text-[10px] text-[var(--text-muted)] italic">
                                This scene character is not linked to a global character.
                            </p>
                        )}
                    </div>

                    {/* Wardrobe / Fitting Room — ported from the deprecated
                         SceneCharacterDetailModal so the dedicated page is
                         feature-complete. Slot tabs along the top, cloth
                         thumbnails for the active slot below. */}
                    <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] mt-4 overflow-hidden">
                        <div className="p-3 border-b border-[var(--border)]">
                            <div className="flex items-center justify-between mb-2">
                                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                                    <Shirt className="h-3 w-3 text-indigo-400" />
                                    Wardrobe
                                </h3>
                                <span className="text-[9px] text-[var(--text-muted)]">
                                    <span className="text-[var(--text-primary)] font-bold">{selectedCount}</span>{" "}
                                    selected
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1">
                                {CLOTH_SLOTS.map((slot) => (
                                    <button
                                        key={slot.id}
                                        type="button"
                                        onClick={() => setActiveSlot(slot.id)}
                                        className={`px-2.5 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                                            activeSlot === slot.id
                                                ? "bg-emerald-600 text-white"
                                                : "bg-[var(--surface)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                                        }`}
                                    >
                                        {slot.label}
                                        {selectedCloths[slot.id] && (
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="p-3">
                            <input
                                ref={clothFileRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleClothUpload}
                            />
                            {loadingCloths ? (
                                <div className="text-[10px] text-[var(--text-muted)] py-4 text-center">
                                    Loading wardrobe…
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => clothFileRef.current?.click()}
                                        disabled={uploadingCloth}
                                        className="aspect-square rounded-md border-2 border-dashed border-[var(--border)] hover:border-emerald-500 hover:bg-[var(--surface-hover)] transition-all cursor-pointer flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 gap-1 group"
                                    >
                                        {uploadingCloth ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4" />
                                                <span className="text-[8px] uppercase tracking-wider">Add</span>
                                            </>
                                        )}
                                    </button>
                                    {filteredCloths.map((cloth) => {
                                        const isSelected = selectedCloths[activeSlot]?.id === cloth.id;
                                        return (
                                            <button
                                                key={cloth.id}
                                                type="button"
                                                onClick={() => handleClothSelect(cloth)}
                                                className={`group relative aspect-square rounded-md overflow-hidden border-2 cursor-pointer transition-all ${
                                                    isSelected
                                                        ? "border-emerald-500 ring-2 ring-emerald-500/30"
                                                        : "border-[var(--border)] hover:border-[var(--border-hover)]"
                                                }`}
                                            >
                                                {cloth.image_url ? (
                                                    <img
                                                        src={cloth.image_url}
                                                        alt={cloth.name}
                                                        loading="lazy"
                                                        decoding="async"
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-[var(--surface)] text-[var(--text-muted)]">
                                                        <Shirt className="h-5 w-5" />
                                                    </div>
                                                )}
                                                <div className="absolute inset-x-0 bottom-0 bg-black/60 backdrop-blur-sm px-1 py-0.5">
                                                    <p className="text-[8px] text-white font-medium truncate">
                                                        {cloth.name}
                                                    </p>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                            {!loadingCloths && filteredCloths.length === 0 && (
                                <p className="text-[9px] text-[var(--text-muted)] italic mt-2 text-center">
                                    No items for {CLOTH_SLOTS.find((s) => s.id === activeSlot)?.label} yet.
                                </p>
                            )}
                        </div>
                        <div className="p-3 border-t border-[var(--border)]">
                            <button
                                type="button"
                                onClick={handleSaveOutfit}
                                disabled={savingOutfit}
                                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-medium transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                            >
                                {savingOutfit ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                    <Save className="h-3 w-3" />
                                )}
                                Save outfit
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <ModelSelector
                isOpen={isModelOpen}
                onClose={() => setIsModelOpen(false)}
                onConfirm={handleModelConfirm}
                itemCount={1}
                title="Select Model for Scene Look"
                confirmLabel="Generate Look"
            />
        </div>
    );
}
