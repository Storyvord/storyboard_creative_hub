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
    Trash2,
    Shirt,
    Film,
    Plus,
    MapPin,
    Clock,
} from "lucide-react";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import ModelSelector from "@/components/creative-hub/ModelSelector";
import PrevizHistorySection from "@/components/creative-hub/PrevizHistorySection";
import SceneCharacterBuildSheet from "@/components/creative-hub/SceneCharacterBuildSheet";
import CompactHistoryStrip from "@/components/creative-hub/CompactHistoryStrip";

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

interface SceneMeta {
    scene_name?: string;
    int_ext?: string | null;
    location?: string | null;
    environment?: string | null;
    time?: string | null;
    order?: number | null;
}

export default function SceneCharacterDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const sceneCharacterId = Number(params.sceneCharacterId);

    const [sc, setSc] = useState<SceneCharacterDetail | null>(null);
    const [sceneMeta, setSceneMeta] = useState<SceneMeta | null>(null);
    const [loading, setLoading] = useState(true);

    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [notes, setNotes] = useState("");

    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [genStep, setGenStep] = useState<GenStep | null>(null);
    const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
    const [isModelOpen, setIsModelOpen] = useState(false);
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);
    const [activeTab, setActiveTab] = useState<"build" | "wardrobe" | "library">("build");

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
                        setSceneMeta({
                            scene_name: scene.scene_name,
                            int_ext: scene.int_ext ?? null,
                            location: scene.location ?? null,
                            environment: scene.environment ?? null,
                            time: (scene as { time?: string | null }).time ?? null,
                            order: scene.order ?? null,
                        });
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

            {/* Title bar — full width above the working grid */}
            <div className="flex items-end justify-between flex-wrap gap-3">
                <div className="min-w-0">
                    <h1 className="text-lg font-black text-[var(--text-primary)] tracking-tight">
                        Scene Look — <span className="text-emerald-400">{baseName}</span>
                        {sceneMeta?.scene_name && (
                            <span className="text-[var(--text-muted)] font-semibold"> · {sceneMeta.scene_name}</span>
                        )}
                    </h1>
                    {/* Scene-context strip — INT/EXT, location, environment pills.
                         Mirrors the SceneLookEditor header on the Character page so
                         the artist sees the same scene anchors on either surface. */}
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {(sceneMeta?.order != null || sc.scene !== undefined) && (
                            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1 font-mono">
                                <Film className="h-3 w-3 text-emerald-500" />
                                SC {String(sceneMeta?.order ?? sc.scene ?? 0).padStart(2, "0")}
                            </span>
                        )}
                        {sceneMeta?.int_ext && (
                            <span className="text-[9px] bg-[var(--surface)] border border-[var(--border)] text-[var(--text-muted)] uppercase font-mono px-1.5 py-0.5 rounded tracking-wider">
                                {sceneMeta.int_ext}
                            </span>
                        )}
                        {sceneMeta?.location && (
                            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                <MapPin className="h-3 w-3" />{sceneMeta.location}
                            </span>
                        )}
                        {sceneMeta?.environment && (
                            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                <Clock className="h-3 w-3" />{sceneMeta.environment}
                            </span>
                        )}
                        <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                            <Shirt className="h-3 w-3 text-indigo-400" />
                            {outfitCount} item{outfitCount === 1 ? "" : "s"} in outfit
                        </span>
                        {sc.character?.id && (
                            <button
                                onClick={() =>
                                    router.push(
                                        `/projects/${projectId}/creative-hub/characters/${sc.character?.id}`,
                                    )
                                }
                                className="text-[10px] text-emerald-400 hover:text-emerald-300 underline-offset-2 hover:underline flex items-center gap-1"
                            >
                                <UserIcon className="h-3 w-3" /> Open {baseName}&apos;s page →
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Two-column working grid: fixed-width hero rail (280px) + stylist tools.
                 Mirrors the Character page's `lg:grid-cols-[260px_1fr]` rail so artists
                 working on either page have a consistent layout — wider here because
                 the SceneCharacter rail also hosts the compact history strip. */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                {/* Left rail: hero + generate + compact history */}
                <div className="space-y-4">
                    {/* Image — `aspect-[2/3]` portrait orientation matches the
                         Character page so the same artist sees consistent framing. */}
                    <div
                        className="aspect-[2/3] bg-[var(--background)] rounded-xl border border-[var(--border)] overflow-hidden relative cursor-pointer group"
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

                    {/* Compact history — drawn from the parent character pool
                         so it includes both base portraits and every sibling
                         scene-look. Click a thumbnail to apply it as the
                         active look for THIS scene. */}
                    {sc.character?.id && (
                        <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-3">
                            <CompactHistoryStrip
                                kind="character"
                                subjectId={sc.character.id}
                                activePrevizId={sc.active_previz ?? null}
                                refreshKey={historyRefreshKey}
                                onApply={async (previzId) => {
                                    await setActiveSubjectPreviz(
                                        "scene_character",
                                        sceneCharacterId,
                                        previzId,
                                    );
                                    toast.success("Applied to this scene");
                                    await fetchScene();
                                    setHistoryRefreshKey((k) => k + 1);
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => setActiveTab("library")}
                                className="mt-2 w-full text-[9px] font-medium text-emerald-400 hover:text-emerald-300 py-1.5 border border-dashed border-[var(--border)] rounded transition-colors"
                            >
                                View full library →
                            </button>
                        </div>
                    )}
                </div>

                {/* Right: stylist tools tabbed area */}
                <div className="min-w-0">
                    <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] overflow-hidden">
                        {/* Tab bar */}
                        <div className="flex border-b border-[var(--border)] bg-[var(--surface)]">
                            {(
                                [
                                    { key: "build", label: "Build Sheet", icon: Wand2 },
                                    { key: "wardrobe", label: "Wardrobe", icon: Shirt },
                                    { key: "library", label: "Library", icon: UserIcon },
                                ] as const
                            ).map((t) => {
                                const Icon = t.icon;
                                const active = activeTab === t.key;
                                return (
                                    <button
                                        key={t.key}
                                        type="button"
                                        onClick={() => setActiveTab(t.key)}
                                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[10px] font-medium uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                                            active
                                                ? "border-emerald-500 text-emerald-400 bg-[var(--surface-raised)]"
                                                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                                        }`}
                                    >
                                        <Icon className="h-3 w-3" />
                                        {t.label}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Tab content */}
                        {activeTab === "build" && (
                            <SceneCharacterBuildSheet
                                initialNotes={sc.notes}
                                saving={saving}
                                onSave={async (composed) => {
                                    setSaving(true);
                                    try {
                                        await updateSceneCharacter(sceneCharacterId, { notes: composed });
                                        setNotes(composed);
                                        toast.success("Build sheet saved");
                                        await fetchScene();
                                    } catch (err) {
                                        toast.error(extractApiError(err, "Failed to save build sheet"));
                                    } finally {
                                        setSaving(false);
                                    }
                                }}
                            />
                        )}

                        {activeTab === "wardrobe" && (
                            <div className="overflow-hidden">
                                <div className="p-4 border-b border-[var(--border)]">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                                            <Shirt className="h-3 w-3 text-indigo-400" />
                                            Outfit slots
                                        </h3>
                                        <span className="text-[9px] text-[var(--text-muted)]">
                                            <span className="text-[var(--text-primary)] font-bold">{selectedCount}</span>{" "}
                                            selected
                                        </span>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {CLOTH_SLOTS.map((slot) => (
                                            <button
                                                key={slot.id}
                                                type="button"
                                                onClick={() => setActiveSlot(slot.id)}
                                                className={`px-3 py-1.5 rounded text-[10px] font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
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
                                <div className="p-4">
                                    <input
                                        ref={clothFileRef}
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleClothUpload}
                                    />
                                    {loadingCloths ? (
                                        <div className="text-[10px] text-[var(--text-muted)] py-6 text-center">
                                            Loading wardrobe…
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                            <button
                                                type="button"
                                                onClick={() => clothFileRef.current?.click()}
                                                disabled={uploadingCloth}
                                                className="aspect-square rounded-md border-2 border-dashed border-[var(--border)] hover:border-emerald-500 hover:bg-[var(--surface-hover)] transition-all cursor-pointer flex flex-col items-center justify-center text-[var(--text-muted)] hover:text-emerald-400 gap-1"
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
                                        <p className="text-[9px] text-[var(--text-muted)] italic mt-3 text-center">
                                            No items for {CLOTH_SLOTS.find((s) => s.id === activeSlot)?.label} yet.
                                        </p>
                                    )}
                                </div>
                                <div className="p-4 border-t border-[var(--border)]">
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
                        )}

                        {activeTab === "library" && (
                            <div className="p-4">
                                {sc.character?.id ? (
                                    <PrevizHistorySection
                                        kind="character"
                                        subjectId={sc.character.id}
                                        subjectLabel={`Library — ${baseName}`}
                                        activePrevizId={sc.character.active_previz ?? null}
                                        refreshKey={historyRefreshKey}
                                        onActivePrevizChange={() => {
                                            fetchScene();
                                            setHistoryRefreshKey((k) => k + 1);
                                        }}
                                        secondaryAction={{
                                            label: "Use for this scene",
                                            title: "Apply this image to the current scene character",
                                            onClick: async (previzId) => {
                                                try {
                                                    await setActiveSubjectPreviz(
                                                        "scene_character",
                                                        sceneCharacterId,
                                                        previzId,
                                                    );
                                                    toast.success("Applied to this scene");
                                                    await fetchScene();
                                                    setHistoryRefreshKey((k) => k + 1);
                                                } catch (err) {
                                                    toast.error(
                                                        extractApiError(
                                                            err,
                                                            "Failed to apply.",
                                                        ),
                                                    );
                                                }
                                            },
                                        }}
                                    />
                                ) : (
                                    <p className="text-[10px] text-[var(--text-muted)] italic py-4 text-center">
                                        This scene character is not linked to a global character — no shared library.
                                    </p>
                                )}
                            </div>
                        )}
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
