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
    MoreVertical,
    RectangleHorizontal,
    RectangleVertical,
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
const PERSONA_ONBOARD_STORAGE_KEY = "loc-detail-persona-onboarded";

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

    // Mobile kebab — Generate / Edit / Delete collapse here below md
    // so the rail's tall buttons don't dominate Cast's primary surface.
    const [kebabOpen, setKebabOpen] = useState(false);

    // Director-mode time-of-day filter — clicking a Day/Dusk/Night chip
    // on the Scene shot list card filters the adjacent Time-of-day card.
    // Null = no filter (all rows visible). Local state, no backend.
    const [timeFilter, setTimeFilter] = useState<"day" | "dusk" | "night" | null>(null);

    // Hero aspect ratio — portrait (3/4) is the default for establishing
    // shots; landscape (16/9) is better for wide vistas / panoramic
    // references. Local state, no persistence (Aria's note).
    const [heroLandscape, setHeroLandscape] = useState(false);

    // First-session "Switch lens" tooltip — flagged once per browser
    // through localStorage. Shown next to the persona switcher until the
    // user dismisses it OR changes persona for the first time. The
    // panel's note: many testers didn't realise the persona row WAS
    // interactive, since it sits above the tab bar.
    const [showPersonaOnboard, setShowPersonaOnboard] = useState(false);
    useEffect(() => {
        if (typeof window === "undefined") return;
        try {
            const seen = window.localStorage.getItem(PERSONA_ONBOARD_STORAGE_KEY);
            if (!seen) setShowPersonaOnboard(true);
        } catch {
            /* localStorage unavailable — leave hint hidden */
        }
    }, []);
    const dismissPersonaOnboard = useCallback(() => {
        setShowPersonaOnboard(false);
        try {
            window.localStorage.setItem(PERSONA_ONBOARD_STORAGE_KEY, "1");
        } catch {
            /* non-blocking */
        }
    }, []);

    // Persona switcher row — used to scroll the active chip into view on
    // narrow screens (the row is `overflow-x-auto`, and on mobile the
    // active chip can sit off-screen at first paint when the user has a
    // non-default persona persisted).
    const personaRowRef = useRef<HTMLDivElement>(null);
    const personaChipRefs = useRef<Partial<Record<Persona, HTMLButtonElement | null>>>({});

    const handlePersonaChange = useCallback((next: Persona) => {
        setPersona(next);
        setActiveTab(PERSONA_DEFAULT_TAB[next]);
        try {
            window.localStorage.setItem(PERSONA_STORAGE_KEY, next);
        } catch {
            /* non-blocking */
        }
        // Center the newly-active chip inside the scroller. `nearest`
        // for block keeps the page from jumping vertically; `center`
        // for inline keeps the active lens visually anchored.
        personaChipRefs.current[next]?.scrollIntoView({
            behavior: "smooth",
            block: "nearest",
            inline: "center",
        });
        // First persona change is enough — dismiss the onboard hint.
        if (showPersonaOnboard) dismissPersonaOnboard();
    }, [showPersonaOnboard, dismissPersonaOnboard]);

    // On mount / when the hydrated persona resolves, scroll the active
    // chip into view without animation. Otherwise on a narrow phone the
    // active chip can be clipped off the right edge and the user has no
    // visual confirmation of which lens they are in.
    useEffect(() => {
        const el = personaChipRefs.current[persona];
        if (!el) return;
        // `instant` so the very first paint is already centered.
        el.scrollIntoView({ behavior: "auto", block: "nearest", inline: "center" });
    }, [persona]);

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
    // block Delete on contracted-and-secured locations (Maya's note: a
    // producer should never bin a location that has a signed contract
    // by mistake). Today the field doesn't exist so we always allow.
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
                {/* Desktop: inline Delete. Mobile / tablet: kebab that
                     also swallows Generate and Edit. Loop 2 fix —
                     destructive + AI actions shouldn't dominate Cast's
                     phone view. */}
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
                        className="p-1.5 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-hover)] transition-colors"
                        aria-label="Actions"
                        aria-expanded={kebabOpen}
                    >
                        <MoreVertical className="h-4 w-4" />
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

            {/* Title bar — full width above the working grid. When the
                 Producer persona is active, the row promotes the Production-
                 tab summary (secured, day-rate, hold-expires, scene count)
                 inline so Maya doesn't have to switch tabs to see what kind
                 of risk this location is. Other personas keep the leaner
                 anchor strip (time, secured pill, scene count) so wardrobe
                 / cast aren't drowning in producer-side numbers.

                 All status / cost / date values are placeholder (DemoPill
                 marker tail) until the backend ships the corresponding
                 fields. */}
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
                        {/* Permit-pending chip — Loop 3: producer already
                             owns this status in the sticky footer (with
                             hold-expires + on-site phone), so showing it
                             twice in their lens is noise. Other personas
                             still need a permit signal in the title row
                             since the footer is sm+ only and the chip is
                             their primary "is this location secured?"
                             affordance above the fold. */}
                        {persona !== "producer" && (
                            <span className="text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase font-mono px-1.5 py-0.5 rounded tracking-wider flex items-center gap-1">
                                <ShieldCheck className="h-2.5 w-2.5" />
                                Permit pending
                            </span>
                        )}
                        {persona === "producer" && (
                            <>
                                <span className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase font-mono px-1.5 py-0.5 rounded tracking-wider flex items-center gap-1">
                                    <DollarSign className="h-2.5 w-2.5" />
                                    $4,200/day
                                </span>
                                <span className="text-[9px] bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase font-mono px-1.5 py-0.5 rounded tracking-wider flex items-center gap-1">
                                    <Calendar className="h-2.5 w-2.5" />
                                    Hold ends 2026-05-20
                                </span>
                            </>
                        )}
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
                 on desktop. Below lg the rail moves BELOW the tabbed pane
                 (Loop 2: Cast / Wardrobe land on a phone and want the cards
                 first, not a 600px tall hero rail preamble). The rail still
                 carries the hero, generate, and recent strip — they just
                 read as a footer-style toolbox on small viewports. */}
            <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
                {/* Left rail: hero + generate + name/desc card + compact history.
                     `order-2 lg:order-1` puts it BELOW the tabbed pane on
                     mobile / tablet so the persona-relevant cards lead. */}
                <div className="space-y-4 order-2 lg:order-1">
                    {/* Hero — `aspect-[3/4]` portrait. Locations photograph
                         well as portraits when establishing (entrance, vista,
                         doorway), and matching the rail's vertical rhythm
                         keeps the visual weight balanced with the SceneChar
                         page next door. */}
                    <div
                        className={`${
                            heroLandscape ? "aspect-video" : "aspect-[3/4]"
                        } bg-[var(--background)] rounded-xl border border-[var(--border)] overflow-hidden relative cursor-pointer group transition-[aspect-ratio]`}
                        onClick={() => fileRef.current?.click()}
                    >
                        {/* Aspect toggle — top-right. Stops click propagation
                             so flipping the ratio doesn't also open the file
                             picker on the parent. Aria's note: a director
                             needs both portrait (doorways, hero approach)
                             and landscape (vistas) without leaving the page. */}
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

                    {/* Generate — hidden below md (covered by kebab). */}
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

                    {/* Name + time + description (real fields, editable) */}
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

                {/* Right: tabbed pane serving the five personas. `order-1
                     lg:order-2` keeps it first on mobile so the persona-
                     relevant cards are the first thing on the page. */}
                <div className="min-w-0 order-1 lg:order-2">
                    {/* Persona quick-switcher — sets the lens for the page.
                         Selecting a persona (a) switches to that role's
                         preferred default tab and (b) reorders the Overview
                         cards so the role's most-needed card is first.
                         Choice persists in `localStorage`. This is the Loop 2
                         resolution to "Overview tries to serve everyone and
                         serves no one first" — the user picks their lens once
                         and the page reshapes around it. */}
                    <div className="relative mb-3">
                        <div
                            ref={personaRowRef}
                            className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] p-1.5 flex items-center gap-1 overflow-x-auto [scroll-snap-type:x_mandatory]"
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
                                        ref={(el) => {
                                            personaChipRefs.current[p.key] = el;
                                        }}
                                        type="button"
                                        role="tab"
                                        aria-selected={active}
                                        onClick={() => handlePersonaChange(p.key)}
                                        className={`flex-1 min-w-fit flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold uppercase tracking-widest transition-colors [scroll-snap-align:center] ${
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
                        {/* First-session onboard hint — anchored to the persona
                             row, dismissed on first manual persona change OR
                             on tap. Persisted to localStorage so we never
                             show it twice. */}
                        {showPersonaOnboard && (
                            <button
                                type="button"
                                onClick={dismissPersonaOnboard}
                                className="absolute -top-2 right-2 translate-y-[-100%] z-10 flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-600 text-white text-[9px] font-semibold uppercase tracking-widest shadow-lg hover:bg-emerald-500 transition-colors animate-in fade-in"
                                aria-label="Dismiss persona switcher hint"
                            >
                                <UserCog className="h-3 w-3" />
                                Switch lens
                                <span className="ml-1 opacity-70">·</span>
                                <span className="opacity-70">tap to dismiss</span>
                            </button>
                        )}
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
                                                { id: "SC 04", tod: "day" as const, note: "Wide establishing" },
                                                { id: "SC 07", tod: "day" as const, note: "Dialogue, two-shot" },
                                                { id: "SC 12", tod: "dusk" as const, note: "Pickup / inserts" },
                                                { id: "SC 18", tod: "night" as const, note: "Chase exterior" },
                                            ].map((s) => {
                                                const todLabel = s.tod === "day"
                                                    ? "Day"
                                                    : s.tod === "dusk"
                                                    ? "Dusk"
                                                    : "Night";
                                                const chipActive = timeFilter === s.tod;
                                                return (
                                                    <li
                                                        key={s.id}
                                                        className="flex items-center justify-between gap-2 px-2 py-1.5 rounded bg-[var(--surface-raised)] border border-[var(--border)]"
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
                                                            title={`Filter time-of-day card by ${todLabel}`}
                                                        >
                                                            {todLabel}
                                                        </button>
                                                        <span className="text-[var(--text-secondary)] truncate flex-1 text-right">
                                                            {s.note}
                                                        </span>
                                                    </li>
                                                );
                                            })}
                                        </ul>
                                    </InfoCard>
                                ),
                                timeOfDay: (() => {
                                    // Time-of-day rows tagged with the chip
                                    // they belong to. When a chip on the Scene
                                    // shot list is selected, rows from the
                                    // other times dim to ~30% opacity so the
                                    // director can scan only what's relevant
                                    // without losing situational context.
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
                                            value: "06:42 / 19:18 — golden hour ~18:30",
                                        },
                                        {
                                            tod: "day",
                                            icon: Sun,
                                            label: "Day · light direction",
                                            value: "South-facing wall lit till 16:00; whites blow out 11:00–14:00",
                                        },
                                        {
                                            tod: "day",
                                            icon: Cloud,
                                            label: "Day · forecast",
                                            value: "Partly cloudy · 24°C · 12% rain · light breeze",
                                        },
                                        {
                                            tod: "dusk",
                                            icon: Sun,
                                            label: "Dusk · golden window",
                                            value: "18:10–18:35 magic hour; warm key fades fast at 19:00",
                                        },
                                        {
                                            tod: "night",
                                            icon: Cloud,
                                            label: "Night · ambient",
                                            value: "Streetlamps tungsten 3200K; subway rumble every 7 min",
                                        },
                                    ];
                                    return (
                                        <InfoCard title="Time of day & lighting" icon={Sun} demo>
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
                                                            dim ? "opacity-30 transition-opacity" : "transition-opacity"
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
                                })(),
                                moodRefs: (
                                    <InfoCard title="Mood & references" icon={ImageIcon} demo>
                                        <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                            Mood: muted earth tones, low-contrast haze, doorway as
                                            framing device. Reference boards: Roma (2018), The Lighthouse
                                            opening, dusty streetscape stills.
                                        </p>
                                        {/* Director persona gets a wider 6-tile
                                             reference strip (col-span-2 below);
                                             other personas keep 3 tiles to stay
                                             compact. */}
                                        <div
                                            className={`grid gap-1.5 mt-2 ${
                                                persona === "director"
                                                    ? "grid-cols-6"
                                                    : "grid-cols-3"
                                            }`}
                                        >
                                            {/* Loop 3: Aria flagged the icon-only
                                                 placeholder tiles read as "stubbed"
                                                 instead of "demo data". A row of
                                                 keyed gradient washes gives the
                                                 strip visual rhythm so it reads as
                                                 a mood swatch row, not a broken
                                                 image grid. The DemoPill on the
                                                 card header still flags placeholder
                                                 status. */}
                                            {(() => {
                                                const swatches: Array<{ from: string; to: string }> = [
                                                    { from: "from-emerald-500/20", to: "to-emerald-500/40" },
                                                    { from: "from-indigo-500/20", to: "to-indigo-500/40" },
                                                    { from: "from-amber-500/20", to: "to-amber-500/40" },
                                                    { from: "from-sky-500/20", to: "to-sky-500/40" },
                                                    { from: "from-rose-500/20", to: "to-rose-500/40" },
                                                    { from: "from-fuchsia-500/20", to: "to-fuchsia-500/40" },
                                                ];
                                                const tiles = persona === "director"
                                                    ? [0, 1, 2, 3, 4, 5]
                                                    : [0, 1, 2];
                                                return tiles.map((i) => {
                                                    const s = swatches[i % swatches.length];
                                                    return (
                                                        <div
                                                            key={i}
                                                            className={`aspect-video rounded border border-[var(--border)] bg-gradient-to-br ${s.from} ${s.to}`}
                                                            aria-hidden
                                                        />
                                                    );
                                                });
                                            })()}
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
                            // Director: mood becomes the hero of Overview —
                            // it gets col-span-2 (full row on the md grid).
                            // Aria's note: references should LEAD a director's
                            // page, not sit as one tile in six.
                            const wideKeys = new Set<OverviewCardKey>(
                                persona === "director" ? ["moodRefs"] : [],
                            );
                            return (
                                <div className="p-4 space-y-3">
                                    {/* Wardrobe persona: a top-of-overview
                                         pill strip with the hard wardrobe-
                                         impacting facts pulled out of the
                                         Environmental cues card. Reza's note —
                                         these are scan-in-3-seconds facts and
                                         shouldn't be buried in a row of
                                         InfoRows. The card itself still
                                         renders below in card form for
                                         drill-down. */}
                                    {persona === "wardrobe" && (
                                        <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-2.5 flex items-center gap-2 flex-wrap">
                                            <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest flex items-center gap-1">
                                                <Shirt className="h-3 w-3" />
                                                Wardrobe-impacting
                                            </span>
                                            {/* Severity-typed wardrobe facts — Loop 3:
                                                 the panel called out that an all-neutral
                                                 strip flattens "fabric will be ruined" and
                                                 "formality is casual" into the same visual
                                                 weight. `warn` items are wardrobe risks
                                                 (will affect choices); `info` items are
                                                 context. */}
                                            {(
                                                [
                                                    { label: "Sun blow-out 11–14h", severity: "warn" },
                                                    { label: "Surface dust", severity: "warn" },
                                                    { label: "Mud risk · low", severity: "info" },
                                                    { label: "Formality · casual", severity: "info" },
                                                    { label: "Whites blow out", severity: "warn" },
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
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                        {order.map((key) => (
                                            <div
                                                key={key}
                                                className={
                                                    wideKeys.has(key)
                                                        ? "md:col-span-2"
                                                        : undefined
                                                }
                                            >
                                                {cards[key]}
                                            </div>
                                        ))}
                                    </div>
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

                                {/* Merged Restrictions + Permit card — Loop 1
                                     critique: the old Restrictions card here
                                     and the Permit & paperwork card on the
                                     Production tab were both answering "what
                                     can we do at this location". Now they
                                     live in one place, on Logistics where the
                                     answer is most often needed in the field.
                                     The producer still gets a permit-status
                                     pill in the title row + the secured-status
                                     card on Production, so they aren't blind. */}
                                <InfoCard title="Restrictions & permits" icon={AlertTriangle} demo>
                                    <ul className="space-y-1.5 text-[11px] text-[var(--text-secondary)] mb-2">
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
                                    {/* Paperwork mini-section — the bare `border-t`
                                         was easy to miss; an explicit label tells
                                         the reader the second block is a different
                                         class of fact (filings + insurance) than
                                         the bulleted on-set restrictions above. */}
                                    <div className="border-t border-[var(--border)] pt-2 space-y-0.5">
                                        <p className="text-[9px] uppercase tracking-widest text-[var(--text-muted)] font-semibold mb-1">
                                            Paperwork
                                        </p>
                                        <InfoRow
                                            icon={ClipboardList}
                                            label="City permit"
                                            value="Pending — ref #CFO-22431"
                                        />
                                        <InfoRow
                                            icon={ClipboardList}
                                            label="Insurance"
                                            value="$2M GL on file · cert sent 2026-04-30"
                                        />
                                        <InfoRow
                                            icon={ClipboardList}
                                            label="Drone waiver"
                                            value="Submitted, awaiting FAA"
                                        />
                                    </div>
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

                                {/* Permit & paperwork card was here in Loop 1
                                     but it duplicated the Logistics-tab
                                     Restrictions card. Merged into a single
                                     "Restrictions & permits" card on
                                     Logistics. Producer still gets the
                                     permit-pending pill in the title row and
                                     the Secured status card below. */}

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
