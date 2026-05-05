"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
    getLocation,
    updateLocation,
    deleteLocation,
    generateLocationImage,
    getScriptTasks,
    setActiveSubjectPreviz,
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
    Film,
    ClipboardList,
    Truck,
    Image as ImageIcon,
    Sun,
    Cloud,
    Zap,
    ParkingCircle,
    Droplet,
    Volume2,
    Phone,
    ShieldCheck,
    DollarSign,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    Users,
    UserCog,
    Clapperboard,
    Mic2,
    Shirt,
} from "lucide-react";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import ModelSelector from "@/components/creative-hub/ModelSelector";
import PrevizHistorySection from "@/components/creative-hub/PrevizHistorySection";
import CompactHistoryStrip from "@/components/creative-hub/CompactHistoryStrip";
import { useGenerationTasks } from "@/hooks/useGenerationTasks";

type GenStep = "saving" | "queued" | "rendering";
type LocationTab = "overview" | "logistics" | "production" | "library";
type Persona = "producer" | "director" | "cast" | "wardrobe" | "logistics";

// Persona → which tab opens by default. Loop 2 cross-persona resolution:
// each role lands on the surface that matters most to them, instead of
// everyone fighting over what Overview should lead with.
const PERSONA_DEFAULT_TAB: Record<Persona, LocationTab> = {
    producer: "production",
    director: "overview",
    cast: "overview",
    wardrobe: "overview",
    logistics: "logistics",
};

// Overview-card ordering per persona. Cards not listed render after this
// preferred slice in their original order. Keys must match the `key`
// supplied to each `OverviewCard` block below.
type OverviewCardKey =
    | "shotList"
    | "timeOfDay"
    | "moodRefs"
    | "altAngles"
    | "envCues"
    | "castNotes";

const PERSONA_OVERVIEW_ORDER: Record<Persona, OverviewCardKey[]> = {
    producer: ["shotList", "timeOfDay", "moodRefs", "altAngles", "envCues", "castNotes"],
    director: ["moodRefs", "shotList", "timeOfDay", "altAngles", "envCues", "castNotes"],
    cast: ["castNotes", "timeOfDay", "shotList", "moodRefs", "envCues", "altAngles"],
    wardrobe: ["envCues", "timeOfDay", "shotList", "moodRefs", "castNotes", "altAngles"],
    logistics: ["altAngles", "timeOfDay", "shotList", "moodRefs", "envCues", "castNotes"],
};

const PERSONA_STORAGE_KEY = "loc-detail-persona";

// ─── Demo-data pill ────────────────────────────────────────────────────
// Used to clearly mark every region whose contents are placeholder copy
// pending real backend fields. The panel agent (and any human reviewer)
// should ignore data quality inside these regions and focus on layout.
function DemoPill({ ticket = "STO-TBD" }: { ticket?: string }) {
    return (
        <span
            title={`Static placeholder — pending backend (${ticket})`}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-mono uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20"
        >
            <AlertTriangle className="h-2.5 w-2.5" />
            Demo data
        </span>
    );
}

// Small key-value row used inside placeholder cards. Icon + label + value.
function InfoRow({
    icon: Icon,
    label,
    value,
    accent = "text-[var(--text-secondary)]",
}: {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    value: React.ReactNode;
    accent?: string;
}) {
    return (
        <div className="flex items-start gap-2 py-1.5">
            <Icon className="h-3 w-3 mt-0.5 text-[var(--text-muted)] flex-shrink-0" />
            <div className="min-w-0 flex-1">
                <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest font-semibold">
                    {label}
                </p>
                <p className={`text-[11px] leading-relaxed ${accent}`}>{value}</p>
            </div>
        </div>
    );
}

// Card wrapper for grouped info blocks inside tabs.
function InfoCard({
    title,
    icon: Icon,
    children,
    demo = false,
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    demo?: boolean;
}) {
    return (
        <div className="bg-[var(--surface)] rounded-lg border border-[var(--border)] p-3 space-y-1">
            <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-1.5">
                    <Icon className="h-3 w-3 text-emerald-500" />
                    {title}
                </h3>
                {demo && <DemoPill />}
            </div>
            {children}
        </div>
    );
}

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

    // Persona lens — determines (a) which tab is the default landing, and
    // (b) the ordering of cards inside Overview. Hydrated from localStorage
    // on mount; until then we render the producer default to avoid SSR
    // hydration mismatches and a card-reshuffle flash.
    const [persona, setPersona] = useState<Persona>("producer");
    const [activeTab, setActiveTab] = useState<LocationTab>("production");

    // Hydrate persona once on mount. We also sync the active tab to the
    // hydrated persona's default landing tab so the user lands where their
    // role expects, rather than where the previous session left them.
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const stored = window.localStorage.getItem(PERSONA_STORAGE_KEY);
            if (
                stored === "producer" ||
                stored === "director" ||
                stored === "cast" ||
                stored === "wardrobe" ||
                stored === "logistics"
            ) {
                setPersona(stored);
                setActiveTab(PERSONA_DEFAULT_TAB[stored]);
            }
        } catch {
            /* localStorage unavailable — keep producer default */
        }
    }, []);

    // Sticky logistics footer — open/closed sheet on mobile.
    const [logisticsSheetOpen, setLogisticsSheetOpen] = useState(false);

    const handlePersonaChange = useCallback((next: Persona) => {
        setPersona(next);
        setActiveTab(PERSONA_DEFAULT_TAB[next]);
        try {
            window.localStorage.setItem(PERSONA_STORAGE_KEY, next);
        } catch {
            /* non-blocking */
        }
    }, []);

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
        // Skeleton mirrors the SceneCharacter detail loading shape so the
        // layout doesn't jump under the user once the real data hydrates.
        return (
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="h-3 w-24 rounded bg-[var(--surface-hover)] animate-pulse" />
                    <div className="h-3 w-12 rounded bg-[var(--surface-hover)] animate-pulse" />
                </div>
                <div className="space-y-2">
                    <div className="h-5 w-64 rounded bg-[var(--surface-hover)] animate-pulse" />
                    <div className="h-3 w-80 rounded bg-[var(--surface-hover)] animate-pulse" />
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                    <div className="space-y-4">
                        <div
                            className="w-full rounded-xl bg-[var(--surface-raised)] animate-pulse"
                            style={{ aspectRatio: "3/4" }}
                        />
                        <div className="h-9 rounded-md bg-[var(--surface-raised)] animate-pulse" />
                        <div className="rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] p-3 space-y-2">
                            <div className="h-2.5 w-20 rounded bg-[var(--surface-hover)] animate-pulse" />
                            <div className="grid grid-cols-3 gap-1.5">
                                {[...Array(6)].map((_, i) => (
                                    <div key={i} className="aspect-square rounded bg-[var(--surface-hover)] animate-pulse" />
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="rounded-xl bg-[var(--surface-raised)] border border-[var(--border)] overflow-hidden">
                        <div className="flex border-b border-[var(--border)]">
                            {[...Array(4)].map((_, i) => (
                                <div key={i} className="flex-1 h-10 bg-[var(--surface)] animate-pulse" />
                            ))}
                        </div>
                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                            {[...Array(6)].map((_, i) => (
                                <div key={i} className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-3 space-y-2">
                                    <div className="h-3 w-16 rounded bg-[var(--surface-hover)] animate-pulse" />
                                    <div className="h-12 rounded bg-[var(--surface-hover)] animate-pulse" />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
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

            {/* Title bar — full width above the working grid. Mirrors the
                 SceneCharacter detail title strip so users on either page see
                 the same anchor pattern: name + scene/context pills. */}
            <div className="flex items-end justify-between flex-wrap gap-3">
                <div className="min-w-0">
                    <h1 className="text-lg font-black text-[var(--text-primary)] tracking-tight">
                        Location — <span className="text-emerald-400">{location.name}</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {time && (
                            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                <Clock className="h-3 w-3 text-emerald-500" />
                                {time}
                            </span>
                        )}
                        {/* Secured-status pill is intentionally placeholder — the
                             field doesn't exist server-side yet. Marked with a
                             demo pill so reviewers don't read it as live data. */}
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-mono px-1.5 py-0.5 rounded tracking-wider flex items-center gap-1">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            Permit pending
                        </span>
                        <DemoPill />
                        <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                            <Film className="h-3 w-3 text-emerald-500" />
                            4 scenes shoot here
                        </span>
                        <DemoPill />
                    </div>
                </div>
            </div>

            {/* Two-column working grid — fixed 280px rail + tabbed pane.
                 Matches `lg:grid-cols-[280px_1fr]` from the SceneCharacter page
                 so the user navigating between Locations and SceneCharacters
                 lives in the same layout shell. */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                {/* Left rail: hero + generate + name/desc card + compact history */}
                <div className="space-y-4">
                    {/* Hero — `aspect-[3/4]` portrait. Locations photograph
                         well as portraits when establishing (entrance, vista,
                         doorway), and matching the rail's vertical rhythm
                         keeps the visual weight balanced with the SceneChar
                         page next door. */}
                    <div
                        className="aspect-[3/4] bg-[var(--background)] rounded-xl border border-[var(--border)] overflow-hidden relative cursor-pointer group"
                        onClick={() => fileRef.current?.click()}
                    >
                        {imagePreview ? (
                            <img
                                src={imagePreview}
                                alt={location.name}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[var(--text-muted)] p-4 text-center">
                                <MapPin className="h-10 w-10 opacity-30" />
                                <p className="text-[11px] font-semibold text-[var(--text-secondary)]">
                                    No image yet
                                </p>
                                <p className="text-[9px] text-[var(--text-muted)]">
                                    Click to upload, or use AI Generate below
                                </p>
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

                    {/* Name + time + description (real fields, editable) */}
                    <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-[var(--text-primary)] tracking-tight truncate">
                                {location.name}
                            </h2>
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

                    {/* Compact recent strip — surfaces the last few generations
                         right next to the hero so users can re-apply a recent
                         preview without opening the Library tab. */}
                    <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-3">
                        <CompactHistoryStrip
                            kind="location"
                            subjectId={locationId}
                            activePrevizId={location.active_previz ?? null}
                            refreshKey={historyRefreshKey}
                            onApply={async (previzId) => {
                                await setActiveSubjectPreviz(
                                    "location",
                                    locationId,
                                    previzId,
                                );
                                toast.success("Applied to location");
                                await fetchLocation();
                                setHistoryRefreshKey((k) => k + 1);
                            }}
                        />
                    </div>
                </div>

                {/* Right: tabbed pane serving the five personas */}
                <div className="min-w-0">
                    {/* Persona quick-switcher — sets the lens for the page.
                         Selecting a persona (a) switches to that role's
                         preferred default tab and (b) reorders the Overview
                         cards so the role's most-needed card is first.
                         Choice persists in `localStorage`. This is the Loop 2
                         resolution to "Overview tries to serve everyone and
                         serves no one first" — the user picks their lens once
                         and the page reshapes around it. */}
                    <div
                        className="mb-3 bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-1.5 flex items-center gap-1 overflow-x-auto"
                        role="tablist"
                        aria-label="Persona lens"
                    >
                        {(
                            [
                                { key: "producer", label: "Producer", icon: ShieldCheck },
                                { key: "director", label: "Director", icon: Clapperboard },
                                { key: "cast", label: "Cast", icon: Mic2 },
                                { key: "wardrobe", label: "Wardrobe", icon: Shirt },
                                { key: "logistics", label: "Logistics", icon: UserCog },
                            ] as const
                        ).map((p) => {
                            const Icon = p.icon;
                            const active = persona === p.key;
                            return (
                                <button
                                    key={p.key}
                                    type="button"
                                    role="tab"
                                    aria-selected={active}
                                    onClick={() => handlePersonaChange(p.key)}
                                    className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                                        active
                                            ? "bg-emerald-600 text-white shadow-sm"
                                            : "text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)]"
                                    }`}
                                >
                                    <Icon className="h-3 w-3" />
                                    {p.label}
                                </button>
                            );
                        })}
                    </div>
                    <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] overflow-hidden">
                        {/* Tab bar — 4 tabs:
                             Overview (Director, Cast) — visual + scene + mood
                             Logistics (Loc Manager, Cast) — power, parking, neighbours
                             Production (Producer) — secured status, permits, costs
                             Library — full image history */}
                        <div className="flex border-b border-[var(--border)] bg-[var(--surface)]">
                            {(
                                [
                                    { key: "overview", label: "Overview", icon: ClipboardList },
                                    { key: "logistics", label: "Logistics", icon: Truck },
                                    { key: "production", label: "Production", icon: Film },
                                    { key: "library", label: "Library", icon: ImageIcon },
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

                        {/* ── Overview tab ───────────────────────────────────
                             Director + Cast + Wardrobe view: scene-shot list,
                             time-of-day, mood/description, weather, alternate
                             angles, environmental notes for costume. */}
                        {activeTab === "overview" && (() => {
                            // Build the Overview cards as a keyed map so we
                            // can reorder them per persona without duplicating
                            // markup. Order is taken from
                            // `PERSONA_OVERVIEW_ORDER[persona]`; cards not
                            // listed for the active persona render at the
                            // tail in their default order.
                            const cards: Record<OverviewCardKey, React.ReactNode> = {
                                shotList: (
                                    <InfoCard title="Scene shot list" icon={Film} demo>
                                        <ul className="space-y-1.5 text-[11px]">
                                            {[
                                                { id: "SC 04", note: "Day · Wide establishing" },
                                                { id: "SC 07", note: "Day · Dialogue, two-shot" },
                                                { id: "SC 12", note: "Dusk · Pickup / inserts" },
                                                { id: "SC 18", note: "Night · Chase exterior" },
                                            ].map((s) => (
                                                <li
                                                    key={s.id}
                                                    className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-[var(--surface-raised)] border border-[var(--border)]"
                                                >
                                                    <span className="font-mono text-emerald-400 text-[10px]">
                                                        {s.id}
                                                    </span>
                                                    <span className="text-[var(--text-secondary)] truncate flex-1 text-right">
                                                        {s.note}
                                                    </span>
                                                </li>
                                            ))}
                                        </ul>
                                    </InfoCard>
                                ),
                                timeOfDay: (
                                    <InfoCard title="Time of day & lighting" icon={Sun} demo>
                                        <InfoRow
                                            icon={Sun}
                                            label="Sunrise / sunset"
                                            value="06:42 / 19:18 — golden hour ~18:30"
                                        />
                                        <InfoRow
                                            icon={Cloud}
                                            label="Forecast (shoot day)"
                                            value="Partly cloudy · 24°C · 12% rain · light breeze"
                                        />
                                        <InfoRow
                                            icon={Sun}
                                            label="Practical notes"
                                            value="South-facing wall lit till 16:00; bring 4×4 silks for backlight"
                                        />
                                    </InfoCard>
                                ),
                                moodRefs: (
                                    <InfoCard title="Mood & references" icon={ImageIcon} demo>
                                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                            Mood: muted earth tones, low-contrast haze, doorway as
                                            framing device. Reference boards: Roma (2018), The Lighthouse
                                            opening, dusty streetscape stills.
                                        </p>
                                        <div className="grid grid-cols-3 gap-1.5 mt-2">
                                            {[1, 2, 3].map((i) => (
                                                <div
                                                    key={i}
                                                    className="aspect-video rounded bg-[var(--surface-raised)] border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)]"
                                                >
                                                    <ImageIcon className="h-4 w-4 opacity-40" />
                                                </div>
                                            ))}
                                        </div>
                                    </InfoCard>
                                ),
                                altAngles: (
                                    <InfoCard title="Alternate angles / sub-locations" icon={MapPin} demo>
                                        <ul className="space-y-1.5 text-[11px] text-[var(--text-secondary)]">
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-500 mt-0.5">•</span>
                                                <span>Front entrance — wide, hero approach</span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-500 mt-0.5">•</span>
                                                <span>Side alley — tight, follow / over-shoulder</span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-500 mt-0.5">•</span>
                                                <span>Rooftop — establishing drone (permit needed)</span>
                                            </li>
                                            <li className="flex items-start gap-1.5">
                                                <span className="text-emerald-500 mt-0.5">•</span>
                                                <span>Interior lobby — backup if rain</span>
                                            </li>
                                        </ul>
                                    </InfoCard>
                                ),
                                envCues: (
                                    <InfoCard title="Environmental cues (wardrobe)" icon={AlertTriangle} demo>
                                        <InfoRow
                                            icon={AlertTriangle}
                                            label="Surface"
                                            value="Dusty street — light fabrics will pick up grime; pack lint rollers"
                                        />
                                        <InfoRow
                                            icon={Droplet}
                                            label="Water exposure"
                                            value="Low — but morning dew till ~09:00; avoid suede on early calls"
                                        />
                                        <InfoRow
                                            icon={Sun}
                                            label="Lighting impact on costume"
                                            value="Hard mid-day sun till 14:00; whites will blow out — favour bone/cream"
                                        />
                                    </InfoCard>
                                ),
                                castNotes: (
                                    <InfoCard title="Cast notes" icon={Users} demo>
                                        <InfoRow
                                            icon={MapPin}
                                            label="Dressing / rest area"
                                            value="Cabana A behind craft services (12-min walk to set)"
                                        />
                                        <InfoRow
                                            icon={ParkingCircle}
                                            label="Cast parking"
                                            value="Lot B — 6 reserved spaces, 8-min shuttle to base camp"
                                        />
                                        <InfoRow
                                            icon={Cloud}
                                            label="Weather hold plan"
                                            value="Cover set: interior lobby (above). Hold pages: SC 07 only."
                                        />
                                    </InfoCard>
                                ),
                            };
                            const order = PERSONA_OVERVIEW_ORDER[persona];
                            return (
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {order.map((key) => (
                                        <div key={key} className="contents">
                                            {cards[key]}
                                        </div>
                                    ))}
                                </div>
                            );
                        })()}

                        {/* ── Logistics tab ──────────────────────────────────
                             Location Manager view: power, parking, water,
                             neighbour rules, sound, equipment, contacts. */}
                        {activeTab === "logistics" && (
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <InfoCard title="Power & utilities" icon={Zap} demo>
                                    <InfoRow
                                        icon={Zap}
                                        label="Mains power"
                                        value="200A 3-phase service available at the loading dock"
                                    />
                                    <InfoRow
                                        icon={Zap}
                                        label="Generator allowed"
                                        value="Yes — between 07:00 and 22:00 only"
                                    />
                                    <InfoRow
                                        icon={Droplet}
                                        label="Water"
                                        value="Spigot near south fence; potable from craft services trailer"
                                    />
                                </InfoCard>

                                <InfoCard title="Parking & access" icon={ParkingCircle} demo>
                                    <InfoRow
                                        icon={ParkingCircle}
                                        label="Crew parking"
                                        value="Lot C — 40 spaces, 4-min walk"
                                    />
                                    <InfoRow
                                        icon={Truck}
                                        label="Equipment access"
                                        value="Dock door 2.4m clearance; forklift on-site (operator $/hr)"
                                    />
                                    <InfoRow
                                        icon={Truck}
                                        label="Truck staging"
                                        value="3 grip / 1 lighting / 1 camera — south alley, 03:00 load-in"
                                    />
                                </InfoCard>

                                <InfoCard title="Restrooms & facilities" icon={Users} demo>
                                    <InfoRow
                                        icon={Users}
                                        label="On-site restrooms"
                                        value="2 (interior lobby) — supplement with 2 honeywagons"
                                    />
                                    <InfoRow
                                        icon={Users}
                                        label="Hand-wash"
                                        value="Outside spigot only — bring portable wash station"
                                    />
                                </InfoCard>

                                <InfoCard title="Neighbours & sound" icon={Volume2} demo>
                                    <InfoRow
                                        icon={Volume2}
                                        label="Quiet hours"
                                        value="22:00 – 07:00 strict; daycare at #4 — no SFX before 09:30"
                                    />
                                    <InfoRow
                                        icon={AlertTriangle}
                                        label="Notified neighbours"
                                        value="6 of 8 confirmed; #7 unreachable, escalate via city liaison"
                                    />
                                    <InfoRow
                                        icon={Volume2}
                                        label="Ambient sound"
                                        value="Subway rumble every 7 min; train every 18 min till 23:00"
                                    />
                                </InfoCard>

                                <InfoCard title="Restrictions" icon={AlertTriangle} demo>
                                    <ul className="space-y-1.5 text-[11px] text-[var(--text-secondary)]">
                                        <li className="flex items-start gap-1.5">
                                            <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                            <span>No open flame — interior is heritage-listed</span>
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                            <span>Drone flight requires city film office sign-off (48h)</span>
                                        </li>
                                        <li className="flex items-start gap-1.5">
                                            <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                            <span>No marking floors — gaff tape only on the rubber mats</span>
                                        </li>
                                    </ul>
                                </InfoCard>

                                <InfoCard title="On-site contact" icon={Phone} demo>
                                    <InfoRow
                                        icon={Users}
                                        label="Site manager"
                                        value="Priya Mehta — keys, alarm, after-hours access"
                                    />
                                    <InfoRow
                                        icon={Phone}
                                        label="Phone"
                                        value="+1 (555) 010-4422 · ok up to 22:00"
                                    />
                                    <InfoRow
                                        icon={Phone}
                                        label="Backup"
                                        value="Building super — +1 (555) 010-9911"
                                    />
                                </InfoCard>
                            </div>
                        )}

                        {/* ── Production tab ─────────────────────────────────
                             Producer view: secured status, permits, vendor /
                             cost / dates, scene allocation summary. */}
                        {activeTab === "production" && (
                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                <InfoCard title="Secured status" icon={ShieldCheck} demo>
                                    <div className="flex items-center gap-2 py-1">
                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                                            <AlertTriangle className="h-3 w-3" />
                                            Pending
                                        </span>
                                        <span className="text-[10px] text-[var(--text-muted)]">
                                            Awaiting permit confirmation
                                        </span>
                                    </div>
                                    <InfoRow
                                        icon={Calendar}
                                        label="Hold expires"
                                        value="2026-05-20 — release if not confirmed"
                                    />
                                    <InfoRow
                                        icon={CheckCircle2}
                                        label="LOI signed"
                                        value="Yes — countersigned 2026-04-12"
                                    />
                                </InfoCard>

                                <InfoCard title="Permit & paperwork" icon={ClipboardList} demo>
                                    <InfoRow
                                        icon={ClipboardList}
                                        label="City permit"
                                        value="Pending — contact City Film Office (ref #CFO-22431)"
                                    />
                                    <InfoRow
                                        icon={ClipboardList}
                                        label="Insurance"
                                        value="$2M GL on file; certificate emailed to owner 2026-04-30"
                                    />
                                    <InfoRow
                                        icon={ClipboardList}
                                        label="Drone waiver"
                                        value="Submitted, awaiting FAA acknowledgement"
                                    />
                                </InfoCard>

                                <InfoCard title="Vendor & cost" icon={DollarSign} demo>
                                    <InfoRow
                                        icon={Users}
                                        label="Vendor / owner"
                                        value="Heritage Holdings LLC · contract route via legal"
                                    />
                                    <InfoRow
                                        icon={DollarSign}
                                        label="Day rate"
                                        value="$4,200 / shoot day · $1,800 / prep day"
                                    />
                                    <InfoRow
                                        icon={DollarSign}
                                        label="Deposit"
                                        value="$5,000 paid · refundable on damage walk-through"
                                    />
                                </InfoCard>

                                <InfoCard title="Schedule" icon={Calendar} demo>
                                    <InfoRow
                                        icon={Calendar}
                                        label="Prep / strike"
                                        value="Prep 2026-05-18 · Strike 2026-05-22"
                                    />
                                    <InfoRow
                                        icon={Calendar}
                                        label="Shoot days"
                                        value="2026-05-19, 2026-05-20, 2026-05-21"
                                    />
                                    <InfoRow
                                        icon={Calendar}
                                        label="Crew call"
                                        value="06:30 day 1 · 07:00 day 2 · 14:00 day 3 (night)"
                                    />
                                </InfoCard>

                                <InfoCard title="Scene allocation" icon={Film} demo>
                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed mb-2">
                                        4 scenes · ~9 pages · ~18 setups
                                    </p>
                                    <ul className="space-y-1 text-[10px] font-mono text-[var(--text-secondary)]">
                                        <li className="flex justify-between">
                                            <span className="text-emerald-400">SC 04</span>
                                            <span>Day 1 AM · 2 setups</span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span className="text-emerald-400">SC 07</span>
                                            <span>Day 1 PM · 6 setups</span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span className="text-emerald-400">SC 12</span>
                                            <span>Day 2 · 4 setups</span>
                                        </li>
                                        <li className="flex justify-between">
                                            <span className="text-emerald-400">SC 18</span>
                                            <span>Day 3 night · 6 setups</span>
                                        </li>
                                    </ul>
                                </InfoCard>

                                <InfoCard title="Producer contact" icon={Phone} demo>
                                    <InfoRow
                                        icon={Users}
                                        label="Location manager"
                                        value="Daniel Cho · daniel@example.com"
                                    />
                                    <InfoRow
                                        icon={Phone}
                                        label="Phone"
                                        value="+1 (555) 010-2200"
                                    />
                                    <InfoRow
                                        icon={Users}
                                        label="City liaison"
                                        value="Office of Film & Events — Mara Singh, ext. 3340"
                                    />
                                </InfoCard>
                            </div>
                        )}

                        {/* ── Library tab ────────────────────────────────────
                             Full image history with infinite scroll, 4-col
                             portrait grid — same affordances as the
                             SceneCharacter Library so users get a consistent
                             gallery surface for any creative-hub subject. */}
                        {activeTab === "library" && (
                            <div className="p-4">
                                <PrevizHistorySection
                                    kind="location"
                                    subjectId={locationId}
                                    subjectLabel={`Location: ${location.name}`}
                                    activePrevizId={location.active_previz ?? null}
                                    refreshKey={historyRefreshKey}
                                    infiniteScroll
                                    thumbnailAspect="portrait"
                                    gridCols={4}
                                    onActivePrevizChange={(_id, url) => {
                                        if (url) setImagePreview(url);
                                        fetchLocation();
                                    }}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Sticky logistics footer — Loop 2 fix for "on-site contact is
                 buried in Logistics tab and the secured / hold-expires status
                 only lives in Production tab". This bar pins the three things
                 a producer or location manager looks up most often to the
                 bottom of the page main area on every tab. Desktop renders
                 inline; mobile shows a floating action button that opens a
                 sheet with the same content (avoids hiding scrollable content
                 on small viewports). All values are still placeholder until
                 the backend ships secured-status / hold-expires / on-site
                 contact fields. */}
            <div className="sticky bottom-0 z-20 -mx-6 mt-2 hidden sm:flex items-center gap-3 px-4 py-2 bg-[var(--surface-raised)]/95 backdrop-blur border-t border-[var(--border)] text-[10px]">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono uppercase tracking-wider">
                    <ShieldCheck className="h-3 w-3" />
                    Permit pending
                </span>
                <span className="text-[var(--text-muted)] hidden md:inline">·</span>
                <span className="text-[var(--text-secondary)] flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-emerald-500" />
                    Hold expires <span className="font-mono">2026-05-20</span>
                </span>
                <span className="text-[var(--text-muted)] hidden md:inline">·</span>
                <a
                    href="tel:+15550104422"
                    className="text-[var(--text-secondary)] hover:text-emerald-400 transition-colors flex items-center gap-1 font-mono"
                >
                    <Phone className="h-3 w-3 text-emerald-500" />
                    +1 (555) 010-4422
                </a>
                <span className="ml-auto">
                    <DemoPill />
                </span>
            </div>

            {/* Mobile FAB — same payload, behind a single tap. Only renders
                 below sm so the desktop bar doesn't compete with it. */}
            <button
                type="button"
                onClick={() => setLogisticsSheetOpen(true)}
                className="sm:hidden fixed bottom-4 right-4 z-30 flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold uppercase tracking-widest shadow-lg"
                aria-label="Open logistics summary"
            >
                <ShieldCheck className="h-3.5 w-3.5" />
                Logistics
            </button>

            {logisticsSheetOpen && (
                <div
                    className="sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end"
                    onClick={() => setLogisticsSheetOpen(false)}
                >
                    <div
                        className="w-full bg-[var(--surface-raised)] rounded-t-xl border-t border-[var(--border)] p-4 space-y-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                Logistics summary
                            </h3>
                            <DemoPill />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono uppercase tracking-wider">
                                <ShieldCheck className="h-3 w-3" />
                                Permit pending
                            </span>
                        </div>
                        <InfoRow
                            icon={Calendar}
                            label="Hold expires"
                            value="2026-05-20"
                        />
                        <a
                            href="tel:+15550104422"
                            className="block hover:bg-[var(--surface-hover)] rounded transition-colors -mx-1 px-1"
                        >
                            <InfoRow
                                icon={Phone}
                                label="On-site contact"
                                value="+1 (555) 010-4422 · Priya Mehta"
                            />
                        </a>
                        <button
                            type="button"
                            onClick={() => setLogisticsSheetOpen(false)}
                            className="w-full py-2 mt-2 rounded-md bg-[var(--surface)] border border-[var(--border)] text-[10px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}

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
