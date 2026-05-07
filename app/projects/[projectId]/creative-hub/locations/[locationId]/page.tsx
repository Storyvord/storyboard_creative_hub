"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    getLocation,
    updateLocation,
    deleteLocation,
    generateLocationImage,
    getScriptTasks,
} from "@/services/creative-hub";
import { Location } from "@/types/creative-hub";
import {
    Loader2,
    ArrowLeft,
    Upload,
    Wand2,
    Save,
    MapPin,
    Pencil,
    Trash2,
    Clock,
} from "lucide-react";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import ModelSelector from "@/components/creative-hub/ModelSelector";
import PrevizHistorySection from "@/components/creative-hub/PrevizHistorySection";
import { useGenerationTasks } from "@/hooks/useGenerationTasks";
import { useRestoreInflightTask } from "@/hooks/useRestoreInflightTask";

type GenStep = "saving" | "queued" | "rendering";

export default function LocationDetailPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.projectId as string;
    const locationId = Number(params.locationId);

    const [location, setLocation] = useState<Location | null>(null);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [time, setTime] = useState("");
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    const [editingInfo, setEditingInfo] = useState(false);
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [genStep, setGenStep] = useState<GenStep | null>(null);
    const [isModelOpen, setIsModelOpen] = useState(false);
    const [trackedTasks, setTrackedTasks] = useState<Record<string, number>>({});
    const [historyRefreshKey, setHistoryRefreshKey] = useState(0);

    const fileRef = useRef<HTMLInputElement>(null);

    const fetchLocation = useCallback(async () => {
        const data = (await getLocation(locationId)) as Location;
        setLocation(data);
        setName(data.name);
        setDescription(data.description || "");
        setTime(data.time || "");
        setImagePreview(data.image_url || null);
        setImageFile(null);
        return data;
    }, [locationId]);

    useEffect(() => {
        const init = async () => {
            try {
                const data = await fetchLocation();

                if (data.script) {
                    try {
                        const ACTIVE = new Set([
                            "processing",
                            "pending",
                            "retrying",
                            "started",
                        ]);
                        const MAX_AGE = 60 * 60 * 1000;
                        const now = Date.now();
                        const tasks = await getScriptTasks(data.script);
                        const newTracked: Record<string, number> = {};
                        for (const t of tasks.locations || []) {
                            if (
                                t.object_id === locationId &&
                                ACTIVE.has(t.status) &&
                                now - new Date(t.created_at).getTime() < MAX_AGE
                            ) {
                                newTracked[t.task_id] = locationId;
                                setGenerating(true);
                                setGenStep("rendering");
                            }
                        }
                        setTrackedTasks(newTracked);
                    } catch {
                        /* non-blocking */
                    }
                }
            } catch (err) {
                console.error("Failed to load location", err);
                toast.error(extractApiError(err, "Failed to load location."));
            } finally {
                setLoading(false);
            }
        };
        if (locationId) init();
    }, [locationId, fetchLocation]);

    useGenerationTasks({
        taskIds: Object.keys(trackedTasks),
        getObjectId: (taskId) => trackedTasks[taskId] ?? 0,
        onComplete: () => {
            setTrackedTasks({});
            setGenerating(false);
            setGenStep(null);
            fetchLocation();
            setHistoryRefreshKey((k) => k + 1);
            toast.success("Location image is ready!");
        },
        onError: () => {
            setTrackedTasks({});
            setGenerating(false);
            setGenStep(null);
            toast.error("Location image generation failed. Please try again.");
        },
    });

    // STO-1073: mount-time recovery via the canonical TaskStatus endpoint.
    // Re-seeds trackedTasks so useGenerationTasks above resumes polling
    // after a reload or a different-device load.
    useRestoreInflightTask({
        contentType: "location",
        objectId: locationId,
        taskType: "location_image_generation",
        onInflight: (taskStatus) => {
            setTrackedTasks((prev) =>
                prev[taskStatus.task_id] !== undefined
                    ? prev
                    : { ...prev, [taskStatus.task_id]: locationId }
            );
            setGenerating(true);
            setGenStep("rendering");
        },
    });

    const dirty =
        !!location &&
        (name !== location.name ||
            description !== (location.description || "") ||
            time !== (location.time || "") ||
            !!imageFile);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Name is required");
            return;
        }
        setSaving(true);
        try {
            await updateLocation(locationId, {
                name,
                description,
                time,
                ...(imageFile ? { image_url: imageFile } : {}),
            });
            toast.success("Location saved");
            await fetchLocation();
            setEditingInfo(false);
        } catch (err) {
            toast.error(extractApiError(err, "Failed to save location."));
        } finally {
            setSaving(false);
        }
    };

    const handleGenerate = () => setIsModelOpen(true);

    const handleModelConfirm = async (model: string, provider: string) => {
        setIsModelOpen(false);
        setGenerating(true);
        setGenStep("saving");
        try {
            if (dirty) {
                await updateLocation(locationId, {
                    name,
                    description,
                    time,
                    ...(imageFile ? { image_url: imageFile } : {}),
                });
            }
            setGenStep("queued");
            const result = await generateLocationImage(locationId, model, provider);
            setTrackedTasks((prev) => ({ ...prev, [result.task_id]: locationId }));
            setGenStep("rendering");
            toast.success("Generation started — will update when ready…");
        } catch (err) {
            toast.error(extractApiError(err, "Failed to start generation."));
            setGenerating(false);
            setGenStep(null);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Delete this location? This cannot be undone.")) return;
        try {
            await deleteLocation(locationId);
            toast.success("Location deleted");
            router.push(`/projects/${projectId}/creative-hub/locations`);
        } catch (err) {
            toast.error(extractApiError(err, "Failed to delete location."));
        }
    };

    if (loading) {
        return (
            <div className="p-6 flex justify-center">
                <Loader2 className="animate-spin h-6 w-6 text-[var(--text-muted)]" />
            </div>
        );
    }

    if (!location) {
        return (
            <div className="p-6 text-center text-[var(--text-muted)]">
                Location not found.{" "}
                <button
                    onClick={() =>
                        router.push(`/projects/${projectId}/creative-hub/locations`)
                    }
                    className="text-emerald-400 hover:underline"
                >
                    Back to list
                </button>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <button
                    onClick={() =>
                        router.push(`/projects/${projectId}/creative-hub/locations`)
                    }
                    className="flex items-center gap-1.5 text-[10px] font-medium text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                >
                    <ArrowLeft className="h-3 w-3" />
                    Back to Locations
                </button>
                <button
                    onClick={handleDelete}
                    className="flex items-center gap-1.5 text-[10px] font-medium text-red-400 hover:text-red-300 transition-colors"
                >
                    <Trash2 className="h-3 w-3" />
                    Delete
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Image + info */}
                <div className="space-y-4">
                    {/* Image */}
                    <div
                        className="aspect-video bg-[var(--background)] rounded-xl border border-[var(--border)] overflow-hidden relative cursor-pointer group"
                        onClick={() => fileRef.current?.click()}
                    >
                        {imagePreview ? (
                            <img
                                src={imagePreview}
                                alt={location.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center text-[var(--text-muted)]">
                                <MapPin className="h-8 w-8 mb-2 opacity-30" />
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

                    {/* Generate */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || saving}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {generating ? (
                            <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                {genStep === "saving"
                                    ? "Saving…"
                                    : genStep === "queued"
                                    ? "Queued…"
                                    : "Rendering…"}
                            </>
                        ) : (
                            <>
                                <Wand2 className="h-3.5 w-3.5" />
                                AI Generate
                            </>
                        )}
                    </button>

                    {/* Name + bio + time */}
                    <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h1 className="text-lg font-black text-[var(--text-primary)] tracking-tight truncate">
                                {location.name}
                            </h1>
                            <button
                                onClick={() => setEditingInfo((v) => !v)}
                                className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                                title={editingInfo ? "Cancel edit" : "Edit details"}
                            >
                                <Pencil className="h-3.5 w-3.5" />
                            </button>
                        </div>
                        {time && !editingInfo && (
                            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
                                <Clock className="h-3 w-3" />
                                {time}
                            </div>
                        )}
                        {editingInfo ? (
                            <div className="space-y-3">
                                <div>
                                    <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest block mb-1">
                                        Name
                                    </label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-3 py-2 text-[var(--text-primary)] text-sm font-semibold focus:outline-none focus:border-emerald-500/40 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest block mb-1">
                                        Time of Day
                                    </label>
                                    <input
                                        type="text"
                                        value={time}
                                        onChange={(e) => setTime(e.target.value)}
                                        placeholder="e.g. Night, Golden Hour"
                                        className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] focus:outline-none focus:border-emerald-500/40 transition-colors placeholder:text-[var(--text-muted)]"
                                    />
                                </div>
                                <div>
                                    <label className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest block mb-1">
                                        Description
                                    </label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        rows={4}
                                        placeholder="Describe the location, mood, lighting, hero details…"
                                        className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg px-3 py-2 text-xs text-[var(--text-secondary)] leading-relaxed focus:outline-none focus:border-emerald-500/40 transition-colors resize-none placeholder:text-[var(--text-muted)]"
                                    />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            setEditingInfo(false);
                                            setName(location.name);
                                            setDescription(location.description || "");
                                            setTime(location.time || "");
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
                                {description || (
                                    <span className="text-[var(--text-muted)] italic">
                                        No description yet.
                                    </span>
                                )}
                            </p>
                        )}
                    </div>
                </div>

                {/* Right: history */}
                <div>
                    <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-4">
                        <PrevizHistorySection
                            kind="location"
                            subjectId={locationId}
                            subjectLabel={`Location: ${location.name}`}
                            activePrevizId={location.active_previz ?? null}
                            refreshKey={historyRefreshKey}
                            onActivePrevizChange={(_id, url) => {
                                if (url) setImagePreview(url);
                                fetchLocation();
                            }}
                        />
                    </div>
                </div>
            </div>

            <ModelSelector
                isOpen={isModelOpen}
                onClose={() => setIsModelOpen(false)}
                onConfirm={handleModelConfirm}
                itemCount={1}
                title="Select Model for Location Image"
                confirmLabel="Generate Image"
            />
        </div>
    );
}
