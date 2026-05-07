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
    Mail,
    ShieldCheck,
    DollarSign,
    Calendar,
    AlertTriangle,
    CheckCircle2,
    Users,
    Shirt,
    MoreVertical,
    RectangleHorizontal,
    RectangleVertical,
    Wind,
    Compass,
} from "lucide-react";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import ModelSelector from "@/components/creative-hub/ModelSelector";
import PrevizHistorySection from "@/components/creative-hub/PrevizHistorySection";
import CompactHistoryStrip from "@/components/creative-hub/CompactHistoryStrip";
import { useGenerationTasks } from "@/hooks/useGenerationTasks";

type GenStep = "saving" | "queued" | "rendering";

// ─── Demo-data pill ────────────────────────────────────────────────────
// Used to clearly mark every region whose contents are placeholder copy
// pending real backend fields. Reviewers should treat data quality inside
// these regions as illustrative — the layout is what's load-bearing.
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

// Small key-value row used inside cards. Icon + label + value.
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

// Card wrapper for grouped info blocks.
function InfoCard({
    title,
    icon: Icon,
    children,
    demo = false,
    className = "",
}: {
    title: string;
    icon: React.ComponentType<{ className?: string }>;
    children: React.ReactNode;
    demo?: boolean;
    className?: string;
}) {
    return (
        <div
            className={`bg-[var(--surface)] rounded-lg border border-[var(--border)] p-3 space-y-1 ${className}`}
        >
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

// Section heading — divides the long single-page binder into scannable
// horizontal bands so the reader can lock onto a region quickly.
function SectionHeader({
    icon: Icon,
    title,
    subtitle,
}: {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    subtitle?: string;
}) {
    return (
        <div className="flex items-end justify-between gap-3 mb-3 pb-1.5 border-b border-[var(--border)]">
            <div className="flex items-center gap-2">
                <Icon className="h-3.5 w-3.5 text-emerald-500" />
                <h2 className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest">
                    {title}
                </h2>
            </div>
            {subtitle && (
                <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest">
                    {subtitle}
                </span>
            )}
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

    // Sticky on-site footer — open/closed sheet on mobile.
    const [onSiteSheetOpen, setOnSiteSheetOpen] = useState(false);

    // Mobile kebab — Generate / Edit / Delete collapse here below md.
    const [kebabOpen, setKebabOpen] = useState(false);

    // Time-of-day filter chips on the scene shot list. Clicking a Day /
    // Dusk / Night chip dims unrelated rows in the lighting card so the
    // reader can scan only what's relevant for the selected window. Local
    // state, no backend.
    const [timeFilter, setTimeFilter] = useState<"day" | "dusk" | "night" | null>(null);

    // Hero aspect ratio — portrait (3/4) is the default for establishing
    // shots; landscape (16/9) is better for wide vistas / panoramic
    // references. Local state, no persistence.
    const [heroLandscape, setHeroLandscape] = useState(false);

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

    // Placeholder secured-status guard. When the backend ships
    // secured / contract fields, this should read from `location` and
    // block Delete on contracted-and-secured locations. Today the field
    // doesn't exist so we always allow.
    const isContractLocked = false;

    const handleDelete = async () => {
        if (isContractLocked) {
            toast.error("This location is locked — a contract is on file.");
            return;
        }
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
                    </div>
                    <div className="space-y-3">
                        {[...Array(6)].map((_, i) => (
                            <div
                                key={i}
                                className="rounded-lg bg-[var(--surface)] border border-[var(--border)] p-3 space-y-2"
                            >
                                <div className="h-3 w-16 rounded bg-[var(--surface-hover)] animate-pulse" />
                                <div className="h-12 rounded bg-[var(--surface-hover)] animate-pulse" />
                            </div>
                        ))}
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
            {/* ── Header ─────────────────────────────────────────────────
                 Back nav + destructive / AI actions. Mobile collapses
                 Generate / Edit / Delete into a labelled kebab so the
                 narrow header stays uncluttered. */}
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
                    className="hidden md:flex items-center gap-1.5 text-[10px] font-medium text-red-400 hover:text-red-300 transition-colors"
                >
                    <Trash2 className="h-3 w-3" />
                    Delete
                </button>
                <div className="md:hidden relative">
                    <button
                        type="button"
                        onClick={() => setKebabOpen((v) => !v)}
                        className="flex items-center gap-1 px-1.5 py-1 rounded-md text-[10px] font-semibold uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                        aria-label="Actions"
                        aria-expanded={kebabOpen}
                    >
                        <MoreVertical className="h-4 w-4" />
                        <span>Actions</span>
                    </button>
                    {kebabOpen && (
                        <>
                            <div
                                className="fixed inset-0 z-40"
                                onClick={() => setKebabOpen(false)}
                                aria-hidden
                            />
                            <div className="absolute right-0 mt-1 w-44 z-50 bg-[var(--surface-raised)] border border-[var(--border)] rounded-lg shadow-xl overflow-hidden">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setKebabOpen(false);
                                        handleGenerate();
                                    }}
                                    disabled={generating || saving}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] disabled:opacity-50 transition-colors"
                                >
                                    <Wand2 className="h-3.5 w-3.5 text-emerald-500" />
                                    AI Generate
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setKebabOpen(false);
                                        setEditingInfo(true);
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                                >
                                    <Pencil className="h-3.5 w-3.5 text-emerald-500" />
                                    Edit details
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setKebabOpen(false);
                                        handleDelete();
                                    }}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-[11px] text-red-400 hover:bg-red-500/10 transition-colors border-t border-[var(--border)]"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Delete
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* ── Title row — identity + status pills ────────────────────
                 Always shows the full pill set: time, secured/permit,
                 day-rate, hold expiry, scene count. Single comprehensive
                 view — no role-conditional pills. */}
            <div className="flex items-end justify-between flex-wrap gap-3">
                <div className="min-w-0">
                    <h1 className="text-lg font-black text-[var(--text-primary)] tracking-tight">
                        Location — <span className="text-emerald-400">{location.name}</span>
                    </h1>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[9px] bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)] uppercase font-mono px-1.5 py-0.5 rounded tracking-wider flex items-center gap-1">
                            <MapPin className="h-2.5 w-2.5 text-emerald-500" />
                            Exterior · Urban Street
                        </span>
                        {time && (
                            <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                <Clock className="h-3 w-3 text-emerald-500" />
                                {time}
                            </span>
                        )}
                        <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-mono px-1.5 py-0.5 rounded tracking-wider flex items-center gap-1">
                            <ShieldCheck className="h-2.5 w-2.5" />
                            Hold confirmed
                        </span>
                        <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-mono px-1.5 py-0.5 rounded tracking-wider flex items-center gap-1">
                            <DollarSign className="h-2.5 w-2.5" />
                            $4,200/day
                        </span>
                        <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase font-mono px-1.5 py-0.5 rounded tracking-wider flex items-center gap-1">
                            <Calendar className="h-2.5 w-2.5" />
                            Hold ends 2026-05-20
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                            <Film className="h-3 w-3 text-emerald-500" />
                            4 scenes · ~9 pages
                        </span>
                        <DemoPill />
                    </div>
                </div>
            </div>

            {/* ── Working grid: rail (hero/edit/recent) + main column ───
                 Desktop: 280px rail on the left carries the hero, the
                 editable identity card, and the recent-looks strip.
                 Right column: the comprehensive single-page binder.
                 Mobile: rail moves below the binder so production-side
                 cards lead the scroll. */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                {/* Left rail */}
                <div className="space-y-4 order-2 lg:order-1">
                    {/* Hero — toggleable portrait / landscape */}
                    <div
                        className={`${
                            heroLandscape ? "aspect-video" : "aspect-[3/4]"
                        } bg-[var(--background)] rounded-xl border border-[var(--border)] overflow-hidden relative cursor-pointer group transition-[aspect-ratio]`}
                        onClick={() => fileRef.current?.click()}
                    >
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                setHeroLandscape((v) => !v);
                            }}
                            className="absolute top-2 right-2 z-10 p-1.5 rounded-md bg-black/50 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/70 transition-colors"
                            aria-label={
                                heroLandscape ? "Switch to portrait" : "Switch to landscape"
                            }
                            title={
                                heroLandscape ? "Switch to portrait" : "Switch to landscape"
                            }
                        >
                            {heroLandscape ? (
                                <RectangleVertical className="h-3.5 w-3.5" />
                            ) : (
                                <RectangleHorizontal className="h-3.5 w-3.5" />
                            )}
                        </button>
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

                    {/* Generate — hidden below md (kebab covers it). */}
                    <button
                        onClick={handleGenerate}
                        disabled={generating || saving}
                        className="hidden md:flex w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-all items-center justify-center gap-2 disabled:opacity-50"
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

                    {/* Editable identity — name / time / description.
                         These three are the ONLY backend-persisted fields
                         on this page. Everything else is dummy demo data. */}
                    <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-4 space-y-3">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-bold text-[var(--text-primary)] tracking-tight truncate">
                                {location.name}
                            </h2>
                            <button
                                onClick={() => setEditingInfo((v) => !v)}
                                className="hidden md:block p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
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

                    {/* Recent looks strip — surfaces the last few generations
                         next to the hero so users can re-apply a recent
                         preview without scrolling to the Library section. */}
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

                {/* ── Right column: single comprehensive binder ─────────
                     One scrollable surface with clear horizontal section
                     bands. Order: description → scenes → time/light →
                     weather → wardrobe → cast facilities → logistics →
                     permits → contacts → library. */}
                <div className="min-w-0 order-1 lg:order-2 space-y-6">
                    {/* ── 1. Description / Mood ─────────────────────── */}
                    <section>
                        <SectionHeader
                            icon={ImageIcon}
                            title="Description & mood"
                            subtitle="Narrative · references"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-[1.2fr_1fr] gap-3">
                            <InfoCard title="Narrative description" icon={ClipboardList} demo>
                                <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                    {description ||
                                        "A weather-worn brick exterior on a quiet uptown block — late-afternoon sun rakes the south wall, casting long shadows from the wrought-iron lamp posts. The doorway is the visual anchor: tall, oak, slightly ajar."}
                                </p>
                                <div className="border-t border-[var(--border)] mt-2 pt-2">
                                    <p className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1">
                                        Mood
                                    </p>
                                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                        Muted earth tones, low-contrast haze, doorway as framing
                                        device. References: <em>Roma</em> (2018), <em>The
                                        Lighthouse</em> opening, dusty streetscape stills from the
                                        Magnum archive.
                                    </p>
                                </div>
                            </InfoCard>

                            <InfoCard title="Reference tile strip" icon={ImageIcon} demo>
                                {/* Mood swatch row — gradient washes give the
                                     strip visual rhythm so it reads as a mood
                                     swatch row, not a broken image grid. */}
                                <div className="grid grid-cols-3 gap-1.5">
                                    {(
                                        [
                                            { from: "from-emerald-500/20", to: "to-emerald-500/40" },
                                            { from: "from-indigo-500/20", to: "to-indigo-500/40" },
                                            { from: "from-amber-500/20", to: "to-amber-500/40" },
                                            { from: "from-sky-500/20", to: "to-sky-500/40" },
                                            { from: "from-rose-500/20", to: "to-rose-500/40" },
                                            { from: "from-fuchsia-500/20", to: "to-fuchsia-500/40" },
                                        ] as const
                                    ).map((s, i) => (
                                        <div
                                            key={i}
                                            className={`aspect-video rounded border border-[var(--border)] bg-gradient-to-br ${s.from} ${s.to}`}
                                            aria-hidden
                                        />
                                    ))}
                                </div>
                                <p className="text-[9px] text-[var(--text-muted)] mt-2 leading-relaxed">
                                    Mood board: warm dusk · cool indigo night · golden hour
                                    accents · sky overcast · rose neon · fuchsia signage
                                </p>
                            </InfoCard>
                        </div>
                    </section>

                    {/* ── 2. Scene allocation ───────────────────────── */}
                    <section>
                        <SectionHeader
                            icon={Film}
                            title="Scene allocation"
                            subtitle="4 scenes · ~9 pages · ~18 setups"
                        />
                        <InfoCard title="Scenes shooting here" icon={Film} demo>
                            <p className="text-[10px] text-[var(--text-muted)] mb-2">
                                Tap a Day / Dusk / Night chip to filter the lighting card
                                below.
                            </p>
                            <ul className="space-y-1.5 text-[11px]">
                                {[
                                    {
                                        id: "SC 04",
                                        tod: "day" as const,
                                        note: "Wide establishing",
                                        date: "2026-05-19 AM",
                                        setups: 2,
                                    },
                                    {
                                        id: "SC 07",
                                        tod: "day" as const,
                                        note: "Dialogue, two-shot",
                                        date: "2026-05-19 PM",
                                        setups: 6,
                                    },
                                    {
                                        id: "SC 12",
                                        tod: "dusk" as const,
                                        note: "Pickup / inserts",
                                        date: "2026-05-20",
                                        setups: 4,
                                    },
                                    {
                                        id: "SC 18",
                                        tod: "night" as const,
                                        note: "Chase exterior",
                                        date: "2026-05-21 night",
                                        setups: 6,
                                    },
                                ].map((s) => {
                                    const todLabel =
                                        s.tod === "day"
                                            ? "Day"
                                            : s.tod === "dusk"
                                            ? "Dusk"
                                            : "Night";
                                    const chipActive = timeFilter === s.tod;
                                    return (
                                        <li
                                            key={s.id}
                                            className="grid grid-cols-[auto_auto_1fr_auto] items-center gap-2 px-2 py-1.5 rounded bg-[var(--surface-raised)] border border-[var(--border)]"
                                        >
                                            <span className="font-mono text-emerald-400 text-[10px]">
                                                {s.id}
                                            </span>
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setTimeFilter((cur) =>
                                                        cur === s.tod ? null : s.tod,
                                                    )
                                                }
                                                className={`px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-wider border transition-colors ${
                                                    chipActive
                                                        ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                                        : "bg-[var(--surface)] text-[var(--text-muted)] border-[var(--border)] hover:text-[var(--text-primary)] hover:border-emerald-500/30"
                                                }`}
                                                title={`Filter lighting card by ${todLabel}`}
                                            >
                                                {todLabel}
                                            </button>
                                            <span className="text-[var(--text-secondary)] truncate">
                                                {s.note}
                                            </span>
                                            <span className="text-[9px] text-[var(--text-muted)] font-mono whitespace-nowrap">
                                                {s.date} · {s.setups} setups
                                            </span>
                                        </li>
                                    );
                                })}
                            </ul>
                        </InfoCard>
                    </section>

                    {/* ── 3. Time-of-day, lighting & weather ───────── */}
                    <section>
                        <SectionHeader
                            icon={Sun}
                            title="Time of day, lighting & environment"
                            subtitle={
                                timeFilter
                                    ? `Filtered: ${
                                          timeFilter.charAt(0).toUpperCase() +
                                          timeFilter.slice(1)
                                      }`
                                    : "Sun · weather · ambient"
                            }
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(() => {
                                const rows: Array<{
                                    tod: "day" | "dusk" | "night" | "all";
                                    icon: React.ComponentType<{ className?: string }>;
                                    label: string;
                                    value: string;
                                }> = [
                                    {
                                        tod: "all",
                                        icon: Sun,
                                        label: "Sunrise / sunset",
                                        value: "06:42 / 19:18 — golden hour 18:14–18:48",
                                    },
                                    {
                                        tod: "all",
                                        icon: Compass,
                                        label: "Sun direction",
                                        value: "Rises ENE, sets WNW; south wall lit till 16:00",
                                    },
                                    {
                                        tod: "day",
                                        icon: Sun,
                                        label: "Day · light direction",
                                        value: "Hard mid-day sun 11:00–14:00 — whites blow out, favour bone/cream",
                                    },
                                    {
                                        tod: "day",
                                        icon: AlertTriangle,
                                        label: "Day · blow-out warning",
                                        value: "South wall 11:00–14:00; recommend ND 0.6 + bounce on faces",
                                    },
                                    {
                                        tod: "dusk",
                                        icon: Sun,
                                        label: "Dusk · golden window",
                                        value: "18:14–18:48 magic hour; warm key fades fast at 19:00",
                                    },
                                    {
                                        tod: "night",
                                        icon: Cloud,
                                        label: "Night · ambient",
                                        value: "Streetlamps tungsten 3200K; subway rumble every 7 min",
                                    },
                                ];
                                return (
                                    <InfoCard
                                        title="Lighting windows"
                                        icon={Sun}
                                        demo
                                        className="md:col-span-1"
                                    >
                                        {timeFilter && (
                                            <div className="flex items-center justify-between mb-1.5 -mt-1">
                                                <span className="text-[9px] uppercase tracking-widest text-emerald-400">
                                                    Filtered:{" "}
                                                    {timeFilter.charAt(0).toUpperCase() +
                                                        timeFilter.slice(1)}
                                                </span>
                                                <button
                                                    type="button"
                                                    onClick={() => setTimeFilter(null)}
                                                    className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                                                >
                                                    Clear
                                                </button>
                                            </div>
                                        )}
                                        {rows.map((r, i) => {
                                            const dim =
                                                timeFilter !== null &&
                                                r.tod !== "all" &&
                                                r.tod !== timeFilter;
                                            return (
                                                <div
                                                    key={i}
                                                    className={
                                                        dim
                                                            ? "opacity-30 transition-opacity"
                                                            : "transition-opacity"
                                                    }
                                                >
                                                    <InfoRow
                                                        icon={r.icon}
                                                        label={r.label}
                                                        value={r.value}
                                                    />
                                                </div>
                                            );
                                        })}
                                    </InfoCard>
                                );
                            })()}

                            <InfoCard title="Recommended call times" icon={Clock} demo>
                                <InfoRow
                                    icon={Clock}
                                    label="Day 1 (SC 04 / 07)"
                                    value="Crew call 06:30 · first shot 08:15 · wrap by 19:30"
                                />
                                <InfoRow
                                    icon={Clock}
                                    label="Day 2 (SC 12 dusk)"
                                    value="Crew call 14:00 · golden window 18:14–18:48 · wrap 21:00"
                                />
                                <InfoRow
                                    icon={Clock}
                                    label="Day 3 (SC 18 night)"
                                    value="Crew call 16:00 · first shot 20:00 · wrap 03:30"
                                />
                            </InfoCard>

                            <InfoCard title="Weather forecast" icon={Cloud} demo>
                                <InfoRow
                                    icon={Cloud}
                                    label="2026-05-19 (Day 1)"
                                    value="72°F · 8mph SW wind · 0% precip · partly cloudy"
                                />
                                <InfoRow
                                    icon={Cloud}
                                    label="2026-05-20 (Day 2)"
                                    value="68°F · 12mph W wind · 15% precip late · clear dusk"
                                />
                                <InfoRow
                                    icon={Cloud}
                                    label="2026-05-21 (Day 3 night)"
                                    value="58°F · 6mph N wind · 0% precip · clear sky"
                                />
                            </InfoCard>

                            <InfoCard title="Surface & risk conditions" icon={AlertTriangle} demo>
                                <InfoRow
                                    icon={AlertTriangle}
                                    label="Surface"
                                    value="Dry asphalt · dusty sidewalks · loose gravel near fence"
                                />
                                <InfoRow
                                    icon={Droplet}
                                    label="Water / mud risk"
                                    value="Low — but morning dew till ~09:00; storm drain at NE corner backs up in rain"
                                />
                                <InfoRow
                                    icon={Wind}
                                    label="Dust / debris"
                                    value="Light dust 11:00–14:00 from south breeze; sandbags recommended"
                                />
                            </InfoCard>
                        </div>
                    </section>

                    {/* ── 4. Wardrobe & costume considerations ─────── */}
                    <section>
                        <SectionHeader
                            icon={Shirt}
                            title="Wardrobe & costume"
                            subtitle="Fabric · formality · environmental hazards"
                        />
                        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-2.5 flex items-center gap-2 flex-wrap mb-3">
                            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                                <Shirt className="h-3 w-3" />
                                Wardrobe-impacting
                            </span>
                            {(
                                [
                                    { label: "Sun blow-out 11–14h", severity: "warn" },
                                    { label: "Surface dust", severity: "warn" },
                                    { label: "Whites blow out", severity: "warn" },
                                    { label: "Mud risk · low", severity: "info" },
                                    { label: "Formality · casual modern", severity: "info" },
                                    { label: "Dressing · 12-min walk", severity: "info" },
                                ] as const
                            ).map((p) => (
                                <span
                                    key={p.label}
                                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                        p.severity === "warn"
                                            ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                                            : "bg-[var(--surface)] text-[var(--text-secondary)] border-[var(--border)]"
                                    }`}
                                >
                                    {p.label}
                                </span>
                            ))}
                            <span className="ml-auto">
                                <DemoPill />
                            </span>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <InfoCard title="Fabric & lighting impact" icon={Sun} demo>
                                <InfoRow
                                    icon={Sun}
                                    label="Mid-day sun"
                                    value="Hard sun 11:00–14:00 — whites blow out, favour bone/cream/oat"
                                />
                                <InfoRow
                                    icon={Cloud}
                                    label="Dusk warmth"
                                    value="Golden hour pushes warm tones — cool blues read clean"
                                />
                                <InfoRow
                                    icon={AlertTriangle}
                                    label="Night sodium spill"
                                    value="Streetlamps push warm cast; whites read yellow on camera"
                                />
                            </InfoCard>

                            <InfoCard title="Environmental hazards" icon={AlertTriangle} demo>
                                <InfoRow
                                    icon={AlertTriangle}
                                    label="Dust"
                                    value="Light fabrics gray after take 3 — pack lint rollers, double-up changes"
                                />
                                <InfoRow
                                    icon={Droplet}
                                    label="Morning dew"
                                    value="Till ~09:00 — avoid suede / unsealed leather on early calls"
                                />
                                <InfoRow
                                    icon={Wind}
                                    label="Wind"
                                    value="6–12mph crosswind — light scarves / loose hems will fly; pin down"
                                />
                            </InfoCard>

                            <InfoCard title="Formality & period" icon={Shirt} demo>
                                <InfoRow
                                    icon={Users}
                                    label="Formality"
                                    value="Casual modern · everyday street wear · no period rigging"
                                />
                                <InfoRow
                                    icon={Shirt}
                                    label="Recommended palette"
                                    value="Earth tones · oat · charcoal · rust · muted indigo"
                                />
                                <InfoRow
                                    icon={AlertTriangle}
                                    label="Avoid"
                                    value="Stark white · saturated red (clashes with brick) · narrow stripes (moiré)"
                                />
                            </InfoCard>

                            <InfoCard title="Costume turnaround" icon={Clock} demo>
                                <InfoRow
                                    icon={MapPin}
                                    label="Wardrobe trailer"
                                    value="Lot B base camp — 8-min walk, golf-cart shuttle on 10-min loop"
                                />
                                <InfoRow
                                    icon={Clock}
                                    label="Quick-change tent"
                                    value="On-set NE corner — 90-second walk; mirrors + steamer + iron"
                                />
                                <InfoRow
                                    icon={Users}
                                    label="On-set wardrobe"
                                    value="2 dressers · 1 standby seamstress · steamer + lint rollers"
                                />
                            </InfoCard>
                        </div>
                    </section>

                    {/* ── 5. Cast facilities ─────────────────────────── */}
                    <section>
                        <SectionHeader
                            icon={Users}
                            title="Cast facilities"
                            subtitle="Dressing · rest · parking · walks"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <InfoCard title="Dressing & rest areas" icon={Users} demo>
                                <InfoRow
                                    icon={MapPin}
                                    label="Lead dressing rooms"
                                    value="Cabana A (talent 1) · Cabana B (talent 2) — behind craft services"
                                />
                                <InfoRow
                                    icon={MapPin}
                                    label="Background holding"
                                    value="Tent at Lot B — 24 chairs, heaters for night shoot"
                                />
                                <InfoRow
                                    icon={MapPin}
                                    label="Walk to set"
                                    value="Cabana → set 12-min walk · golf-cart shuttle every 10 min"
                                />
                            </InfoCard>

                            <InfoCard title="Restrooms & catering" icon={Users} demo>
                                <InfoRow
                                    icon={Users}
                                    label="On-site restrooms"
                                    value="2 (interior lobby) + 2 honeywagon trailers at Lot B"
                                />
                                <InfoRow
                                    icon={Droplet}
                                    label="Hand-wash"
                                    value="Outside spigot only — bring portable wash station"
                                />
                                <InfoRow
                                    icon={Users}
                                    label="Craft services"
                                    value="Tent at NE corner of base camp · hot meals 12:00 / 18:00 / 02:00"
                                />
                            </InfoCard>

                            <InfoCard title="Cast parking & transport" icon={ParkingCircle} demo>
                                <InfoRow
                                    icon={ParkingCircle}
                                    label="Talent lot"
                                    value="Lot A — 6 reserved spaces, 4-min walk to cabanas"
                                />
                                <InfoRow
                                    icon={Truck}
                                    label="Driver pickup"
                                    value="Curb at SE entrance · 2 SUVs on standby for principals"
                                />
                                <InfoRow
                                    icon={Clock}
                                    label="Shuttle window"
                                    value="Continuous loop crew call → wrap +30 min"
                                />
                            </InfoCard>

                            <InfoCard title="Weather hold plan" icon={Cloud} demo>
                                <InfoRow
                                    icon={Cloud}
                                    label="Cover set"
                                    value="Interior lobby — adjacent building, prepped & lit by 06:30"
                                />
                                <InfoRow
                                    icon={ClipboardList}
                                    label="Hold pages"
                                    value="SC 07 only (interior-friendly dialogue) — others move to weather day"
                                />
                                <InfoRow
                                    icon={Phone}
                                    label="Decision call"
                                    value="06:00 day-of via 1st AD · text chain to all HODs"
                                />
                            </InfoCard>
                        </div>
                    </section>

                    {/* ── 6. Logistics & access ─────────────────────── */}
                    <section>
                        <SectionHeader
                            icon={Truck}
                            title="Logistics & access"
                            subtitle="Power · trucks · sound · neighbours"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <InfoCard title="Power & utilities" icon={Zap} demo>
                                <InfoRow
                                    icon={Zap}
                                    label="Mains service"
                                    value="200A 3-phase at the loading dock · 4× 50A drops on site"
                                />
                                <InfoRow
                                    icon={Zap}
                                    label="Generator"
                                    value="East lot parking · permitted 07:00–22:00 · 30m cable run to set"
                                />
                                <InfoRow
                                    icon={Droplet}
                                    label="Water"
                                    value="Spigot at south fence · potable from craft services trailer"
                                />
                            </InfoCard>

                            <InfoCard title="Vehicle access & dock" icon={Truck} demo>
                                <InfoRow
                                    icon={Truck}
                                    label="Equipment dock"
                                    value="Door 2.4m × 3.2m · clears 2× 28' production trucks · forklift on-site"
                                />
                                <InfoRow
                                    icon={Truck}
                                    label="Truck staging"
                                    value="3 grip · 1 lighting · 1 camera — south alley, 03:00 load-in"
                                />
                                <InfoRow
                                    icon={ParkingCircle}
                                    label="Parking"
                                    value="Crew lot (24 spots) · talent lot (6) · production trucks (2× 28')"
                                />
                            </InfoCard>

                            <InfoCard title="Sound & neighbours" icon={Volume2} demo>
                                <InfoRow
                                    icon={Volume2}
                                    label="Quiet hours"
                                    value="22:00–06:00 strict · daycare at #4 — no SFX before 09:30"
                                />
                                <InfoRow
                                    icon={AlertTriangle}
                                    label="Neighbour rules"
                                    value="No helicopter · sandbag light stands within 6m of property line · no marking floors"
                                />
                                <InfoRow
                                    icon={Volume2}
                                    label="Ambient noise"
                                    value="Subway rumble every 7 min · train every 18 min till 23:00"
                                />
                                <InfoRow
                                    icon={CheckCircle2}
                                    label="Notified neighbours"
                                    value="6 of 8 confirmed · #7 unreachable · escalate via city liaison"
                                />
                            </InfoCard>

                            <InfoCard title="On-site restrictions" icon={AlertTriangle} demo>
                                <ul className="space-y-1.5 text-[11px] text-[var(--text-secondary)]">
                                    <li className="flex items-start gap-1.5">
                                        <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                        <span>No open flame — interior is heritage-listed</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                        <span>Drone flight requires city film office sign-off (48h notice)</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                        <span>No marking floors — gaff tape only on rubber mats</span>
                                    </li>
                                    <li className="flex items-start gap-1.5">
                                        <AlertTriangle className="h-3 w-3 text-amber-400 mt-0.5 flex-shrink-0" />
                                        <span>No tripods on the lawn — only on the paved walk</span>
                                    </li>
                                </ul>
                            </InfoCard>

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
                                        <span>Interior lobby — backup if rain (cover set)</span>
                                    </li>
                                </ul>
                            </InfoCard>
                        </div>
                    </section>

                    {/* ── 7. Permits & paperwork ─────────────────────── */}
                    <section>
                        <SectionHeader
                            icon={ShieldCheck}
                            title="Permits & paperwork"
                            subtitle="Filings · insurance · vendor lock-in"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <InfoCard title="Secured status" icon={ShieldCheck} demo>
                                <div className="flex items-center gap-2 py-1">
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                                        <CheckCircle2 className="h-3 w-3" />
                                        Hold confirmed
                                    </span>
                                    <span className="text-[10px] text-[var(--text-muted)]">
                                        expires 2026-05-20
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
                                <InfoRow
                                    icon={ClipboardList}
                                    label="Contract status"
                                    value="In legal review · expected return 2026-05-08"
                                />
                            </InfoCard>

                            <InfoCard title="Permits & filings" icon={ClipboardList} demo>
                                <InfoRow
                                    icon={ClipboardList}
                                    label="City permit #"
                                    value="LA-FB-2026-0418"
                                />
                                <InfoRow
                                    icon={ClipboardList}
                                    label="City film office ref"
                                    value="CFO-22431 · pending sign-off"
                                />
                                <InfoRow
                                    icon={ClipboardList}
                                    label="Drone waiver"
                                    value="Submitted 2026-04-26 · awaiting FAA"
                                />
                                <InfoRow
                                    icon={ShieldCheck}
                                    label="Insurance"
                                    value="$2M GL on file · cert sent 2026-04-30 · $5M umbrella for stunt work"
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
                                <InfoRow
                                    icon={Phone}
                                    label="City film office contact"
                                    value="Renee Park · +1 (213) 555-0142"
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
                                    value="2026-05-19 · 2026-05-20 · 2026-05-21"
                                />
                                <InfoRow
                                    icon={Calendar}
                                    label="Crew call"
                                    value="06:30 day 1 · 14:00 day 2 (dusk) · 16:00 day 3 (night)"
                                />
                            </InfoCard>
                        </div>
                    </section>

                    {/* ── 8. On-site contacts ────────────────────────── */}
                    <section>
                        <SectionHeader
                            icon={Phone}
                            title="On-site contacts"
                            subtitle="Roles · phone · email"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <InfoCard title="Location manager" icon={Users} demo>
                                <InfoRow
                                    icon={Users}
                                    label="Marcus Lee"
                                    value="Location Manager · keys, alarm, after-hours access"
                                />
                                <InfoRow
                                    icon={Phone}
                                    label="Phone"
                                    value={
                                        <a
                                            href="tel:+12135550188"
                                            className="hover:text-emerald-400 font-mono"
                                        >
                                            +1 (213) 555-0188
                                        </a>
                                    }
                                />
                                <InfoRow
                                    icon={Mail}
                                    label="Email"
                                    value={
                                        <a
                                            href="mailto:marcus.lee@example.com"
                                            className="hover:text-emerald-400"
                                        >
                                            marcus.lee@example.com
                                        </a>
                                    }
                                />
                            </InfoCard>

                            <InfoCard title="Site & building" icon={Users} demo>
                                <InfoRow
                                    icon={Users}
                                    label="Priya Mehta"
                                    value="Site manager · ok to call up to 22:00"
                                />
                                <InfoRow
                                    icon={Phone}
                                    label="Site phone"
                                    value={
                                        <a
                                            href="tel:+15550104422"
                                            className="hover:text-emerald-400 font-mono"
                                        >
                                            +1 (555) 010-4422
                                        </a>
                                    }
                                />
                                <InfoRow
                                    icon={Phone}
                                    label="Building super (backup)"
                                    value={
                                        <a
                                            href="tel:+15550109911"
                                            className="hover:text-emerald-400 font-mono"
                                        >
                                            +1 (555) 010-9911
                                        </a>
                                    }
                                />
                            </InfoCard>

                            <InfoCard title="City & vendor" icon={Phone} demo>
                                <InfoRow
                                    icon={Users}
                                    label="Renee Park"
                                    value="City Film Office · permit liaison"
                                />
                                <InfoRow
                                    icon={Phone}
                                    label="Phone"
                                    value={
                                        <a
                                            href="tel:+12135550142"
                                            className="hover:text-emerald-400 font-mono"
                                        >
                                            +1 (213) 555-0142
                                        </a>
                                    }
                                />
                                <InfoRow
                                    icon={Users}
                                    label="Mara Singh"
                                    value="Office of Film & Events · ext. 3340"
                                />
                            </InfoCard>

                            <InfoCard title="Production-side" icon={Phone} demo>
                                <InfoRow
                                    icon={Users}
                                    label="Daniel Cho"
                                    value="UPM · production-side escalation"
                                />
                                <InfoRow
                                    icon={Phone}
                                    label="Phone"
                                    value={
                                        <a
                                            href="tel:+15550102200"
                                            className="hover:text-emerald-400 font-mono"
                                        >
                                            +1 (555) 010-2200
                                        </a>
                                    }
                                />
                                <InfoRow
                                    icon={Mail}
                                    label="Email"
                                    value={
                                        <a
                                            href="mailto:daniel@example.com"
                                            className="hover:text-emerald-400"
                                        >
                                            daniel@example.com
                                        </a>
                                    }
                                />
                            </InfoCard>
                        </div>
                    </section>

                    {/* ── 9. Library / image history ─────────────────── */}
                    <section>
                        <SectionHeader
                            icon={ImageIcon}
                            title="Library"
                            subtitle="Generated previews · upload history"
                        />
                        <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-3">
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
                    </section>
                </div>
            </div>

            {/* ── Sticky on-site footer ──────────────────────────────────
                 Pins the three things any production role looks up most
                 often (secured status, hold expiry, on-site phone) to the
                 bottom of the page. Desktop renders inline; mobile shows
                 a floating action button that opens a sheet. */}
            <div className="sticky bottom-0 z-20 -mx-6 mt-2 hidden sm:flex items-center gap-3 px-4 py-2 bg-[var(--surface-raised)]/95 backdrop-blur border-t border-[var(--border)] text-[10px]">
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono uppercase tracking-wider">
                    <ShieldCheck className="h-3 w-3" />
                    Hold confirmed
                </span>
                <span className="text-[var(--text-muted)] hidden md:inline">·</span>
                <span className="text-[var(--text-secondary)] flex items-center gap-1">
                    <Calendar className="h-3 w-3 text-emerald-500" />
                    Hold expires <span className="font-mono">2026-05-20</span>
                </span>
                <span className="text-[var(--text-muted)] hidden md:inline">·</span>
                <a
                    href="tel:+12135550188"
                    className="text-[var(--text-secondary)] hover:text-emerald-400 transition-colors flex items-center gap-1 font-mono"
                >
                    <Phone className="h-3 w-3 text-emerald-500" />
                    +1 (213) 555-0188 · Marcus
                </a>
                <span className="ml-auto">
                    <DemoPill />
                </span>
            </div>

            {/* Mobile FAB — opens an on-site summary sheet. Same payload
                 as the desktop footer, behind a single tap. */}
            <button
                type="button"
                onClick={() => setOnSiteSheetOpen(true)}
                className="sm:hidden fixed bottom-4 right-4 z-30 flex items-center gap-1.5 px-3 py-2.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-semibold uppercase tracking-widest shadow-lg"
                aria-label="Open on-site summary"
            >
                <ShieldCheck className="h-3.5 w-3.5" />
                On-site
            </button>

            {onSiteSheetOpen && (
                <div
                    className="sm:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm flex items-end"
                    onClick={() => setOnSiteSheetOpen(false)}
                >
                    <div
                        className="w-full bg-[var(--surface-raised)] rounded-t-xl border-t border-[var(--border)] p-4 space-y-3"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                                On-site summary
                            </h3>
                            <DemoPill />
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 font-mono uppercase tracking-wider">
                                <ShieldCheck className="h-3 w-3" />
                                Hold confirmed
                            </span>
                        </div>
                        <InfoRow
                            icon={Calendar}
                            label="Hold expires"
                            value="2026-05-20"
                        />
                        <a
                            href="tel:+12135550188"
                            className="block hover:bg-[var(--surface-hover)] rounded transition-colors -mx-1 px-1"
                        >
                            <InfoRow
                                icon={Phone}
                                label="Location manager"
                                value="+1 (213) 555-0188 · Marcus Lee"
                            />
                        </a>
                        <a
                            href="tel:+15550104422"
                            className="block hover:bg-[var(--surface-hover)] rounded transition-colors -mx-1 px-1"
                        >
                            <InfoRow
                                icon={Phone}
                                label="Site manager"
                                value="+1 (555) 010-4422 · Priya Mehta"
                            />
                        </a>
                        <button
                            type="button"
                            onClick={() => setOnSiteSheetOpen(false)}
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
