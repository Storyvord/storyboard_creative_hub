"use client";

import { useState, useEffect, useRef, useMemo, useCallback, memo, forwardRef } from "react";
import {
  uploadScript,
  getScripts,
  getScenes,
  getCharacters,
  updateScript,
  getScriptConversionReview,
  confirmScriptConversion,
  deleteScript,
  getTaskStatus,
  createScript,
  generateScriptFromPrompt,
  getLatestTaskStatus,
  isTaskBackfillRow,
  MAX_GENERATED_SCENES,
  MAX_INSTRUCTION_CHARACTERS,
  type ScriptGenerationInstruction,
} from "@/services/creative-hub";
import { Script, Scene, Character } from "@/types/creative-hub";
import {
  Upload,
  Loader2,
  CheckCircle,
  BarChart2,
  Save,
  Keyboard,
  X,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Trash2,
  Sparkles,
  Plus,
  PenLine,
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import { useParams } from "next/navigation";
import { ScriptEditor, ScreenplayElementType } from "../../../../../components/creative-hub/ScriptEditor";

/* ───────────────────────── Types ───────────────────────── */

type ScreenplayElement = ScreenplayElementType;

/* ───────────────────────── Constants ───────────────────── */

const ELEMENT_CYCLE: ScreenplayElement[] = [
  "scene_heading",
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
  "shot",
];

/* Structured options for the AI generation form. Values are the canonical
   keys the backend prompt builder expands into rich guidance; anything typed
   free-form (genre/tone) is passed through verbatim. */
const SCRIPT_PURPOSES = [
  { value: "short_film", label: "Short Film" },
  { value: "feature_film", label: "Feature Film" },
  { value: "ad", label: "Ad / Commercial" },
  { value: "series_episode", label: "Series Episode" },
  { value: "documentary", label: "Documentary" },
  { value: "music_video", label: "Music Video" },
];

const NARRATION_STYLES = [
  { value: "", label: "Auto — let the AI decide" },
  { value: "first_person", label: "First person" },
  { value: "voiceover", label: "Voiceover" },
  { value: "dialogue_heavy", label: "Dialogue heavy" },
  { value: "minimal_dialogue", label: "Minimal dialogue" },
];

const GENRE_SUGGESTIONS = [
  "Thriller", "Drama", "Comedy", "Horror", "Sci-Fi",
  "Romance", "Action", "Mystery", "Fantasy",
];

const TONE_SUGGESTIONS = [
  "Dark", "Lighthearted", "Satirical", "Gritty",
  "Whimsical", "Suspenseful", "Hopeful", "Melancholic",
];

const SCRIPT_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "ja", label: "Japanese" },
];

const CHARACTER_ROLES = ["hero", "villain", "supporting"];

interface GenCharacter {
  name: string;
  role: string;
  description: string;
}

const EMPTY_GEN_FORM = {
  raw_text: "",
  purpose: "short_film",
  genre: "",
  tone: "",
  narration_style: "",
  setting: "",
  language: "en",
  additional_notes: "",
};

const SCENE_HEADING_RE = /^(?:INT|EXT|INT\/EXT|I\/E)\.?\b/i;
const TRANSITION_RE = /(?:TO:|FADE OUT\.?|FADE IN\.?|CUT TO BLACK\.?|DISSOLVE TO:?)$/i;
const SHOT_RE = /^(?:SHOT|ANGLE ON|CLOSE ON|POV|INSERT|WIDE SHOT|CLOSE UP|CU|ECU)[:\s-]/i;

type LineType = "blank" | "scene_heading" | "action" | "character" | "parenthetical" | "dialogue" | "transition" | "shot";

/** Classify a single line based on its content and context */
function classifyLine(trimmed: string, prevType: LineType | null): LineType {
  if (!trimmed) return "blank";
  if (SCENE_HEADING_RE.test(trimmed)) return "scene_heading";
  if (TRANSITION_RE.test(trimmed) || trimmed.endsWith(":")) return "transition";
  if (SHOT_RE.test(trimmed)) return "shot";
  if (trimmed.startsWith("(") && trimmed.endsWith(")")) return "parenthetical";

  const isUpper = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  const shortEnough = trimmed.length <= 40;
  const noEndPunct = !/[.!?]$/.test(trimmed);
  if (isUpper && shortEnough && noEndPunct && (!prevType || prevType === "blank" || prevType === "action" || prevType === "scene_heading")) {
    return "character";
  }

  if (prevType === "character" || prevType === "parenthetical" || prevType === "dialogue") {
    return "dialogue";
  }

  return "action";
}

/* ───────────────────── Utility helpers ─────────────────── */

/** Detect whether raw content is FDX XML */
function isFdxXml(content: string): boolean {
  const c = (content || "").trim();
  return (
    c.startsWith("<?xml") ||
    c.includes("<FinalDraft") ||
    c.includes("<Paragraph")
  );
}

/** Convert FDX XML → plain screenplay text */
function fdxToText(xml: string): string {
  try {
    const doc = new DOMParser().parseFromString(xml, "application/xml");
    if (doc.querySelector("parsererror")) return xml;

    const paragraphs = Array.from(doc.querySelectorAll("Paragraph"));
    const out: string[] = [];

    for (const p of paragraphs) {
      const type = p.getAttribute("Type") || "Action";
      const text = Array.from(p.querySelectorAll("Text"))
        .map((t) => t.textContent || "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      if (!text) continue;

      switch (type) {
        case "Scene Heading":
          out.push(text.toUpperCase(), "");
          break;
        case "Character":
          out.push(text.toUpperCase());
          break;
        case "Transition":
          out.push(text.toUpperCase(), "");
          break;
        case "Parenthetical":
          out.push(text.startsWith("(") ? text : `(${text})`);
          break;
        default:
          out.push(text);
          if (type === "Dialogue" || type === "Action") out.push("");
      }
    }

    return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  } catch {
    return xml;
  }
}

/** Map LineType → FDX Paragraph Type */
const LINE_TO_FDX_TYPE: Record<string, string> = {
  blank: "Action", // FDX doesn't have blank, just empty Action
  scene_heading: "Scene Heading",
  action: "Action",
  character: "Character",
  parenthetical: "Parenthetical",
  dialogue: "Dialogue",
  transition: "Transition",
  shot: "Action",
};

/** Escape XML special characters */
function escapeXml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Convert plain screenplay text → FDX XML.
 * Uses classifyLine to determine paragraph types, producing a valid
 * FinalDraft-compatible XML string that can be stored in script.content.
 */
function textToFdx(text: string, title?: string): string {
  const lines = text.split("\n");
  const paras: string[] = [];
  let prevType: LineType | null = null;

  for (const raw of lines) {
    const trimmed = raw.trim();
    const lt = classifyLine(trimmed, prevType);
    prevType = lt;

    if (lt === "blank") continue; // skip blank lines

    const fdxType = LINE_TO_FDX_TYPE[lt] || "Action";
    paras.push(`<Paragraph Type="${fdxType}"><Text>${escapeXml(trimmed)}</Text></Paragraph>`);
  }

  const safeTitle = escapeXml(title || "Untitled");
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<FinalDraft DocumentType="Script" Template="No" Version="1">`,
    `<TitlePage><Content Type="Title"><Text>${safeTitle}</Text></Content></TitlePage>`,
    `<Content>`,
    ...paras,
    `</Content>`,
    `</FinalDraft>`,
  ].join("\n");
}

/** Convert draft scene objects → formatted screenplay text */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scenesToText(scenes: Record<string, any>[]): string {
  const out: string[] = [];
  for (const s of scenes || []) {
    const heading = String(s.scene_heading || s.title || "").trim();
    if (heading) out.push(heading.toUpperCase(), "");

    for (const a of Array.isArray(s.actions) ? s.actions : []) {
      const t = String(a || "").trim();
      if (t) out.push(t);
    }

    const dialogs = [...(Array.isArray(s.dialogs) ? s.dialogs : [])].sort(
      (a, b) => Number(a?.order || 0) - Number(b?.order || 0)
    );
    for (const d of dialogs) {
      const c = String(d?.character || "").trim();
      const t = String(d?.dialog || "").trim();
      if (c) out.push(c.toUpperCase());
      if (t) out.push(t);
      out.push("");
    }
    out.push("");
  }
  return out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* ═══════════════════════════════════════════════════════════
   Component
   ═══════════════════════════════════════════════════════════ */

function getLineClasses(type: LineType): string {
  switch (type) {
    case "blank": return "h-[24px]";
    case "scene_heading": return "text-[#f0f0f0] font-bold uppercase tracking-wide text-left transition-all duration-500 rounded";
    case "character": return "text-center text-[#e8e8e8] uppercase mt-3";
    case "parenthetical": return "text-center mx-auto max-w-[240px] text-[#b0b0b0] italic";
    case "dialogue": return "text-center mx-auto max-w-[65%] text-[#d0d0d0]";
    case "transition": return "text-right text-[#e0e0e0] uppercase mt-3 mb-1";
    case "shot": return "text-left text-[#e0e0e0] uppercase";
    default: return "text-left text-[#c8c8c8]"; // action
  }
}

const generateInitialHtml = (text: string) => {
  const escapeXml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = text.split("\n");
  let prevType: LineType | null = null;
  return lines.map((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed) {
      prevType = 'blank';
      return `<p data-type="blank"></p>`;
    }
    const type = classifyLine(trimmed, prevType);
    prevType = type;
    return `<p data-type="${type}">${escapeXml(line)}</p>`;
  }).join("");
};

// RawEditor, applyFormatting, and getLineClasses have been replaced by ScriptEditor components

export default function ScriptPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  /* ── Core state ─────────────────────────────────────────── */
  const [script, setScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [internalRefContent, setInternalRefContent] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const originalFdxRef = useRef<string>(""); // The real FDX stored in DB

  /* ── Conversion flow state ──────────────────────────────── */
  const [pendingScriptId, setPendingScriptId] = useState<number | null>(null);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isAwaitingConfirm, setIsAwaitingConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /* ── AI script generation state ─────────────────────────── */
  // "More options" expands the floating bar inline (no popup) to reveal the
  // full structured-brief fields.
  const [barExpanded, setBarExpanded] = useState(false);
  // Structured instruction form — composed into a creative brief server-side.
  const [genForm, setGenForm] = useState({ ...EMPTY_GEN_FORM });
  const [genCharacters, setGenCharacters] = useState<GenCharacter[]>([]);
  const [genTitle, setGenTitle] = useState("");
  const [genSceneCount, setGenSceneCount] = useState(""); // "" = AI picks (≤ cap)
  const [genSubmitting, setGenSubmitting] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genScriptId, setGenScriptId] = useState<number | null>(null);
  const [genProgress, setGenProgress] = useState("");

  const setGenField = (field: keyof typeof EMPTY_GEN_FORM, value: string) =>
    setGenForm((prev) => ({ ...prev, [field]: value }));

  const updateGenCharacter = (idx: number, patch: Partial<GenCharacter>) =>
    setGenCharacters((prev) => prev.map((c, i) => (i === idx ? { ...c, ...patch } : c)));

  /* ── Manual (blank) script creation ─────────────────────── */
  const [creatingManual, setCreatingManual] = useState(false);

  /* ── Floating generate bar (Creative-Space-style collapse) ──
     Collapses to a slim peek pill; hovering the bottom edge or clicking the
     pill reveals it. Stays open while typing or while a kickoff is running. */
  const [barCollapsed, setBarCollapsed] = useState(false);
  const [barHover, setBarHover] = useState(false);
  const [barFocused, setBarFocused] = useState(false);
  const barHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const barRevealed = !barCollapsed || barHover || barFocused || genSubmitting;
  const revealBar = () => {
    if (barHideTimer.current) {
      clearTimeout(barHideTimer.current);
      barHideTimer.current = null;
    }
    setBarHover(true);
  };
  const scheduleHideBar = () => {
    if (barHideTimer.current) clearTimeout(barHideTimer.current);
    barHideTimer.current = setTimeout(() => setBarHover(false), 250);
  };
  useEffect(
    () => () => {
      if (barHideTimer.current) clearTimeout(barHideTimer.current);
    },
    [],
  );

  /* ── UI toggles ─────────────────────────────────────────── */
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [activeElement, setActiveElement] = useState<ScreenplayElement>("action");

  /* ── Refs ────────────────────────────────────────────────── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<any>(null);
  /** Plain-text snapshot of the draft loaded for confirmation (not the FDX). Used in
   *  handleConfirm to detect real edits vs TipTap's initial-render reformatting. */
  const originalDraftTextRef = useRef<string>("");

  useEffect(() => {
    if (!isDirty && editorContent !== internalRefContent) {
      setInternalRefContent(editorContent);
    }
  }, [editorContent, isDirty, internalRefContent]);

  const initialHtml = useMemo(() => {
    return generateInitialHtml(internalRefContent);
  }, [internalRefContent]);

  const showUpload = !script && !loading && !isConverting && !isGenerating;
  const canUpload = !script || isConverting;
  const isEditorVisible = !!script && !isConverting && !isGenerating && !loading && !showUpload;

  // "New script" = nothing saved yet and nothing meaningful typed. The floating
  // generate bar only exists in that window — the moment the user writes or a
  // script has real content, it disappears for good.
  const scriptIsBlank = !!script && !(script.content || "").trim();
  const showGenerateBar =
    !loading &&
    !isConverting &&
    !isGenerating &&
    !isAwaitingConfirm &&
    (!script || (scriptIsBlank && editorContent.trim().length < 20));

  // React shortcuts & legacy inputs managed by TipTap ScriptEditor
  
  useEffect(() => {
    if (projectId) fetchScript();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const fetchScript = async () => {
    try {
      const scripts = await getScripts(projectId);
      if (scripts?.length) {
        const s = scripts[0];
        setScript(s);
        const raw = s.content || "";
        originalFdxRef.current = raw;
        const initialText = isFdxXml(raw) ? fdxToText(raw) : raw;
        setEditorContent(initialText);
        setInternalRefContent(initialText);
        setIsDirty(false);

        // Check if this script is mid-conversion
        if (s.requires_confirmation && s.review_status === "processing") {
          setPendingScriptId(s.id);
          setPendingTaskId(s.task_id || null);
          setIsConverting(true);
          return;
        }
        if (s.requires_confirmation && (s.review_status === "pending_review" || s.review_status === "ready_for_review")) {
          setPendingScriptId(s.id);
          // Try to load draft immediately
          try {
            const review = await getScriptConversionReview(s.id);
            const draftFdx = review?.draft?.fdx_preview || '';
            const draftScenes = review?.draft?.scenes || [];
            if (draftFdx && isFdxXml(draftFdx)) {
              const text = fdxToText(draftFdx);
              setEditorContent(text);
              setInternalRefContent(text);
              originalDraftTextRef.current = text;
              // Must set isConverting=false BEFORE isAwaitingConfirm=true so the
              // polling useEffect stops (its guard checks isConverting).
              setIsConverting(false);
              setIsAwaitingConfirm(true);
            } else if (draftScenes.length) {
              const text = scenesToText(draftScenes);
              setEditorContent(text);
              setInternalRefContent(text);
              originalDraftTextRef.current = text;
              setIsConverting(false);
              setIsAwaitingConfirm(true);
            } else {
              // Draft not written yet — keep the converting spinner
              setIsConverting(true);
            }
          } catch {
            // Review endpoint failed (draft not ready) — keep polling
            setIsConverting(true);
          }
          return;
        }

        // AI generation in flight? The generate endpoint creates the script
        // row immediately with empty content; recover the generating state
        // across reloads by checking the latest script_generation task.
        if (!(s.content || "").trim()) {
          try {
            const genTask = await getLatestTaskStatus(
              "script",
              s.id,
              "script_generation",
            );
            if (
              genTask &&
              !isTaskBackfillRow(genTask) &&
              (genTask.status === "pending" ||
                genTask.status === "processing" ||
                genTask.status === "retrying")
            ) {
              setGenScriptId(s.id);
              setGenProgress(genTask.progress_message || "");
              setIsGenerating(true);
              return;
            }
          } catch {
            // Status lookup failing must not block the normal editor flow.
          }
        }

        // Normal flow — load scenes/characters
        try {
          const sc = await getScenes(s.id);
          if (sc) setScenes(sc);
        } catch {}
        try {
          const ch = await getCharacters(s.id);
          if (ch) setCharacters(ch);
        } catch {}
      } else {
        setScript(null);
        setScenes([]);
        setCharacters([]);
      }
    } catch (err) {
      console.error("Failed to fetch script", err);
    } finally {
      setLoading(false);
    }
  };

  /* ═══════════════════ Conversion polling ══════════════════ */

  useEffect(() => {
    if (!isConverting || !pendingScriptId) return;

    const timer = setInterval(async () => {
      try {
        if (!pendingTaskId) {
          // No task id — fall back to refreshing the script directly
          await fetchScript();
          return;
        }

        // Poll the DB-backed task status endpoint (same as storyboard page).
        // The DB record persists even after Celery's result backend expires, so
        // we always get an accurate status without a fallback review API call.
        const taskRes = await getTaskStatus(pendingTaskId);
        const taskStatus = taskRes?.status || '';

        if (taskStatus === 'failed' || taskStatus === 'failure') {
          console.error("Conversion task failed:", taskRes.error);
          setIsConverting(false);
          return;
        }

        if (taskStatus === 'completed' || taskStatus === 'success') {
          // Stop the polling interval immediately, then let fetchScript() decide
          // the next screen (confirm or normal editor).
          setPendingTaskId(null);
          setIsConverting(false);  // tears down this interval via useEffect deps
          await fetchScript();
        }
        // Any other status ('pending', 'processing', 'started', 'retrying'):
        // keep polling — do nothing this tick.
      } catch (error: any) {
        console.warn("Task polling error:", error?.message);
      }
    }, 3000);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isConverting, pendingScriptId, pendingTaskId]);

  /* ═══════════════ AI generation polling ═══════════════════ */

  useEffect(() => {
    if (!isGenerating || !genScriptId) return;

    const timer = setInterval(async () => {
      try {
        const row = await getLatestTaskStatus(
          "script",
          genScriptId,
          "script_generation",
        );
        if (!row) return; // task row not written yet — keep waiting

        if (row.progress_message) setGenProgress(row.progress_message);

        if (row.status === "completed") {
          setIsGenerating(false); // tears down this interval via deps
          setGenScriptId(null);
          setGenProgress("");
          toast.success("Script generated — scenes and characters are ready!");
          await fetchScript();
        } else if (row.status === "failed") {
          setIsGenerating(false);
          setGenScriptId(null);
          setGenProgress("");
          toast.error(row.error || "Script generation failed. Please try again.");
          await fetchScript();
        }
        // pending / processing / retrying → keep polling.
      } catch (error: unknown) {
        console.warn("Script generation polling error:", (error as Error)?.message);
      }
    }, 3000);

    return () => clearInterval(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGenerating, genScriptId]);

  /* ═══════════════════════ Handlers ════════════════════════ */

  const handleStartManual = async () => {
    if (creatingManual) return;
    setCreatingManual(true);
    try {
      await createScript(projectId, { title: "Untitled Script" });
      toast.success("Blank script created — start writing!");
      await fetchScript();
    } catch (err: unknown) {
      toast.error(extractApiError(err as Error, "Failed to create script."));
    } finally {
      setCreatingManual(false);
    }
  };

  const handleGenerateScript = async () => {
    const rawText = genForm.raw_text.trim();
    if (!rawText || genSubmitting) return;

    setGenSubmitting(true);
    try {
      // A blank manual script may already exist (the "start writing manually"
      // row). The generate endpoint creates a fresh script, and this page
      // loads the OLDEST script in the project — so remove the empty row
      // first or it would shadow the generated one. Nothing saved is lost:
      // the bar only renders while the script has no content.
      if (script && !(script.content || "").trim()) {
        try {
          await deleteScript(script.id);
        } catch {
          // Non-fatal: worst case the generated script sorts second and the
          // user deletes the empty one from the UI.
        }
      }
      // Build the structured instruction — empty optional fields are omitted
      // so the backend brief never contains hollow sections.
      const characters = genCharacters
        .map((c) => ({
          name: c.name.trim(),
          role: c.role.trim(),
          description: c.description.trim(),
        }))
        .filter((c) => c.name)
        .map((c) => ({
          name: c.name,
          ...(c.role ? { role: c.role } : {}),
          ...(c.description ? { description: c.description } : {}),
        }));

      const instruction: ScriptGenerationInstruction = {
        raw_text: rawText,
        purpose: genForm.purpose || undefined,
        genre: genForm.genre.trim() || undefined,
        tone: genForm.tone.trim() || undefined,
        narration_style: genForm.narration_style || undefined,
        setting: genForm.setting.trim() || undefined,
        language: genForm.language || "en",
        additional_notes: genForm.additional_notes.trim() || undefined,
        ...(characters.length ? { characters } : {}),
      };

      const res = await generateScriptFromPrompt(projectId, {
        instruction,
        title: genTitle.trim() || undefined,
        scene_count: genSceneCount ? Number(genSceneCount) : undefined,
        metadata: { project_id: projectId, timestamp: new Date().toISOString() },
      });
      setBarExpanded(false);
      setGenForm({ ...EMPTY_GEN_FORM });
      setGenCharacters([]);
      setGenTitle("");
      setGenSceneCount("");
      setScript(res);
      setGenScriptId(res.id);
      setGenProgress("");
      setIsGenerating(true);
      toast.success("Writing your screenplay — this takes about a minute…");
    } catch (err: unknown) {
      toast.error(extractApiError(err as Error, "Failed to start script generation."));
    } finally {
      setGenSubmitting(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    const allowed = [".fdx", ".pdf", ".docx", ".txt", ".doc", ".rtf"];
    if (!allowed.includes(ext)) {
      toast.error(`Unsupported type. Allowed: ${allowed.join(", ")}`);
      return;
    }

    setUploading(true);
    try {
      const newScript = await uploadScript(projectId, file);

      if (newScript.requires_confirmation) {
        // Non-FDX → needs conversion + review
        setScript(newScript);
        setPendingScriptId(newScript.id);
        setPendingTaskId(newScript.task_id || null);
        setIsConverting(true);
        setIsAwaitingConfirm(false);
        setEditorContent("");
        setScenes([]);
        setCharacters([]);
        toast.success("Script received — converting your screenplay…");
      } else {
        // FDX → parsed immediately. Let fetchScript set script + internalRefContent
        // in one batch so ScriptEditor only mounts once initialHtml is populated.
        toast.success("Script uploaded and parsed!");
        setPendingScriptId(null);
        setIsConverting(false);
        setIsAwaitingConfirm(false);
        await fetchScript();
      }
    } catch (err: unknown) {
      toast.error(extractApiError(err as Error, "Upload failed."));
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSave = async () => {
    if (!script) return;
    setSaving(true);
    try {
      if (isDirty) {
        // User edited the text — convert back to FDX before saving
        const newFdx = textToFdx(editorContent, script.title);
        const updated = await updateScript(script.id, { content: newFdx });
        setScript(updated);
        originalFdxRef.current = newFdx;
        setIsDirty(false);
        toast.success("Script saved. Go to Scenes to review and apply changes.");
      } else {
        toast.info("No changes to save.");
      }
    } catch (err: unknown) {
      toast.error(extractApiError(err as Error, "Save failed."));
    } finally {
      setSaving(false);
    }
  };

  const handleConfirm = async () => {
    if (!script) return;
    setConfirming(true);
    try {
      // Detect real user edits by comparing plain text against what was originally
      // loaded into the editor. We cannot rely on `isDirty` here because TipTap
      // fires onUpdate during its initial render with slightly reformatted HTML,
      // which would set isDirty=true even before the user types anything.
      const normalize = (s: string) => s.replace(/\s+/g, " ").trim();
      const normalizedEditor = normalize(editorContent);
      // Guard: if the editor is effectively empty (collab seed failed, sync
      // race, etc.) do NOT send screenplay_text — that path triggers a full
      // re-parse on the backend and would overwrite the good draft with
      // whatever the LLM makes of our blank input.
      const editorIsTrivial = normalizedEditor.length < 20;
      const hasRealEdits =
        !editorIsTrivial &&
        normalizedEditor !== normalize(originalDraftTextRef.current);

      if (hasRealEdits) {
        // User edited the draft — send screenplay_text for LLM re-conversion
        await confirmScriptConversion(script.id, {
          action: "confirm",
          screenplay_text: editorContent,
        });
        toast.success("Script confirmed — re-converting with edits…");
      } else {
        // No real edits — confirm the existing draft scenes directly
        await confirmScriptConversion(script.id, {
          action: "confirm",
        });
        toast.success("Script confirmed — syncing scenes…");
      }
      setIsAwaitingConfirm(false);
      setIsConverting(false);
      setPendingScriptId(null);
      setIsDirty(false);
      await fetchScript();
    } catch (err: unknown) {
      toast.error(extractApiError(err as Error, "Confirmation failed."));
    } finally {
      setConfirming(false);
    }
  };

  const scriptHeadings = useMemo(() => {
    const headings: { text: string; index: number; lineIndex: number; headingIndex: number }[] = [];
    const lines = editorContent.split("\n");
    let charIdx = 0;
    let hIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (SCENE_HEADING_RE.test(trimmed)) {
        headings.push({ text: trimmed.toUpperCase(), index: charIdx, lineIndex: i, headingIndex: hIdx });
        hIdx++;
      }
      charIdx += lines[i].length + 1; // +1 for \n
    }
    return headings;
  }, [editorContent]);

  const jumpToHeading = useCallback(
    (heading: { text: string; index: number; lineIndex: number; headingIndex: number }) => {
      // Use DOM to scroll to the heading, since TipTap renders data-type="scene_heading"
      const domHeadings = document.querySelectorAll('[data-type="scene_heading"]');
      const el = domHeadings[heading.headingIndex] as HTMLElement;
      
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-1', 'ring-emerald-400/60');
        setTimeout(() => el.classList.remove('ring-1', 'ring-emerald-400/60'), 1200);

        const editor = editorRef.current;
        if (editor) {
          editor.commands.focus();
        }
      }
    },
    []
  );

  const handleDeleteScript = async () => {
    if (!script) return;
    try {
      await deleteScript(script.id);
      toast.success("Script deleted successfully.");
      setScript(null);
      setEditorContent("");
      setInternalRefContent("");
      setScenes([]);
      setCharacters([]);
      setShowDeleteConfirm(false);
      setDeleteConfirmText("");
      // Refresh list to see if another script exists, or stay on upload screen
      await fetchScript();
    } catch (err: unknown) {
      toast.error(extractApiError(err as Error, "Failed to delete script."));
    }
  };

  /* ═══════════════════ Celtx shortcuts ════════════════════ */
  // TipTap ScriptEditor extension handles Enter/Tab shortcuts intrinsically.

  // To support global Cmd+S for saving, use a window event listener
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (isAwaitingConfirm) handleConfirm();
        else handleSave();
      }
      if (meta && e.shiftKey && e.key.toLowerCase() === "a") {
        e.preventDefault();
        setShowAnalytics(true);
      }
      if (meta && e.key === "/") {
        e.preventDefault();
        setShowShortcuts((v) => !v);
      }
    };
    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isAwaitingConfirm, handleConfirm, handleSave]);

  /* ═══════════════════ Analytics data ═════════════════════
     All charts and stat cards derive exclusively from script.analysis, which
     the backend computes in analyze_fdx() and saves on every content save.
     Nothing is computed from the scenes array — keeping a single source of
     truth means the analytics panel always reflects the saved FDX, never a
     partially-synced scene list.
  */

  const COLORS = ["#22c55e", "#10b981", "#059669", "#047857", "#6ee7b7"];

  const intCount = (script?.analysis?.interior_vs_exterior as Record<string, number> | undefined)?.Interior ?? 0;
  const extCount = (script?.analysis?.interior_vs_exterior as Record<string, number> | undefined)?.Exterior ?? 0;

  const intExtData = useMemo<{ name: string; value: number }[]>(() => {
    const d: { name: string; value: number }[] = [];
    if (intCount) d.push({ name: "INT", value: intCount });
    if (extCount) d.push({ name: "EXT", value: extCount });
    return d;
  }, [intCount, extCount]);

  const locationData = useMemo<{ name: string; count: number }[]>(() => {
    const dist = script?.analysis?.setting_distribution as Record<string, number> | undefined;
    if (!dist) return [];
    return Object.entries(dist)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [script]);

  const characterData = useMemo<{ name: string; count: number }[]>(() => {
    const apps = script?.analysis?.character_appearances as
      | Record<string, { count: number }>
      | undefined;
    if (!apps) return [];
    return Object.entries(apps)
      .map(([name, v]) => ({ name, count: v.count ?? 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [script]);

  const sceneBreakdownData = useMemo<
    { label: string; scene: string; characters: number; dialogues: number }[]
  >(() => {
    const breakdown = script?.analysis?.scene_breakdown as
      | { scene_label?: string; heading?: string; characters?: number; dialogues?: number }[]
      | undefined;
    if (!breakdown?.length) return [];
    return breakdown.map((sb, idx) => ({
      label: sb.scene_label ?? `S${idx + 1}`,
      scene: sb.heading ?? `Scene ${idx + 1}`,
      characters: sb.characters ?? 0,
      dialogues: sb.dialogues ?? 0,
    }));
  }, [script]);

  const dialogueDistData = useMemo<{ name: string; value: number }[]>(() => {
    const dist = script?.analysis?.dialogue_distribution as Record<string, number> | undefined;
    if (!dist) return [];
    return Object.entries(dist)
      .filter(([, v]) => v > 0)
      .map(([name, pct]) => ({ name, value: pct }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [script]);

  /* ═══════════════════ Helpers for view ═══════════════════ */

  /* ═══════════════════ Helpers for view ═══════════════════ */

  /* ═══════════════════════ Render ══════════════════════════ */

  return (
    <div className="relative h-full flex flex-col bg-[var(--background)]">
      {/* ─── Top bar ─────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-[var(--border)]">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-[var(--text-primary)] tracking-wide">
            Script Editor
          </h1>

          {/* Element indicator pill */}
          {isEditorVisible && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)]">
              {activeElement.replace("_", " ")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Shortcuts */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface)] transition-colors"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>

          {/* Analytics — show as soon as the script has been saved once (analysis populated) */}
          {script && script.analysis?.scene_count && !isAwaitingConfirm && (
            <button
              data-tour="script-analytics-btn"
              onClick={() => setShowAnalytics(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface)] transition-colors"
              title="Script Analytics"
            >
              <BarChart2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Analytics</span>
            </button>
          )}

          {/* Re-upload */}
          {script && !isConverting && !isAwaitingConfirm && (
            <>
              <input
                type="file"
                accept=".fdx,.pdf,.docx,.doc,.rtf,.txt"
                className="hidden"
                ref={fileInputRef}
                onChange={handleUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded border border-[var(--border)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--surface)] transition-colors"
                title="Upload new script"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span className="hidden sm:inline">Upload</span>
              </button>
            </>
          )}

          {/* Confirm (during review) */}
          {isAwaitingConfirm && (
            <button
              onClick={handleConfirm}
              disabled={confirming}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60"
            >
              {confirming ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CheckCircle className="h-3.5 w-3.5" />
              )}
              Confirm Script
            </button>
          )}

          {/* Save (normal mode) */}
          {script && !isAwaitingConfirm && !isConverting && (
            <button
              data-tour="script-save-btn"
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Save
            </button>
          )}
          {/* Delete (dustbin) */}
          {script && !isConverting && (
            <button
              onClick={() => {
                setDeleteConfirmText("");
                setShowDeleteConfirm(true);
              }}
              className="inline-flex items-center justify-center h-[28px] w-[28px] rounded bg-red-900/30 border border-red-900/50 text-red-500 hover:bg-red-900/50 hover:text-red-400 transition-colors ml-1"
              title="Delete Script"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </header>

      {/* ─── Confirm banner ──────────────────────────────── */}
      {isAwaitingConfirm && (
        <div className="flex-shrink-0 px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-3">
          <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
          <p className="text-[11px] text-amber-200">
            Review the generated screenplay below. Edit anything you need, then
            press <strong>Confirm Script</strong> to generate scenes &amp;
            characters.
          </p>
        </div>
      )}

      {/* ─── Main content ────────────────────────────────── */}
      <div className="flex-1 min-h-0 flex">
        {/* Loading */}
        {loading && (
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
          </div>
        )}

        {/* Upload zone (no script yet) */}
        {showUpload && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div data-tour="script-upload-zone" className="w-full max-w-md border border-dashed border-[var(--border)] rounded-lg p-12 flex flex-col items-center bg-[var(--surface)] hover:border-[var(--border-hover)] transition-colors">
              <Upload className="h-10 w-10 text-[var(--text-muted)] mb-4" />
              <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">
                Upload your screenplay
              </h3>
              <p className="text-[var(--text-muted)] text-xs mb-6">
                Supports .fdx, .pdf, .docx, .doc, .rtf, .txt
              </p>
              <input
                type="file"
                accept=".fdx,.pdf,.docx,.doc,.rtf,.txt"
                className="hidden"
                ref={fileInputRef}
                onChange={handleUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-sm font-medium transition-colors flex items-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="animate-spin h-4 w-4" /> Uploading…
                  </>
                ) : (
                  "Select File"
                )}
              </button>

              {/* Divider */}
              <div className="w-full flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-[var(--border)]" />
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">
                  or
                </span>
                <div className="flex-1 h-px bg-[var(--border)]" />
              </div>

              {/* Blank script → the screenplay editor, no file involved. */}
              <button
                onClick={handleStartManual}
                disabled={uploading || creatingManual}
                className="px-6 py-2.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 border border-[var(--border-hover)] text-[var(--text-secondary)] hover:text-white hover:border-emerald-500/50 hover:bg-[var(--surface-hover)]"
              >
                {creatingManual ? (
                  <Loader2 className="animate-spin h-4 w-4" />
                ) : (
                  <PenLine className="h-4 w-4" />
                )}
                Start writing manually
              </button>
              <p className="text-[var(--text-muted)] text-[11px] mt-2 text-center">
                Or describe your story in the prompt bar below and let the AI
                write your initial script (up to {MAX_GENERATED_SCENES} scenes).
              </p>
            </div>
          </div>
        )}

        {/* AI generation loader */}
        {isGenerating && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-2 border-[var(--border)] flex items-center justify-center">
                  <Sparkles className="h-7 w-7 text-emerald-400 animate-pulse" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <Loader2 className="h-3 w-3 animate-spin text-emerald-400" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-[var(--text-primary)] text-sm font-medium mb-1">
                  Writing your screenplay…
                </h3>
                <p className="text-[var(--text-secondary)] text-xs max-w-xs">
                  {genProgress ||
                    "The AI is writing your script and building scenes and characters. This usually takes about a minute."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Converting loader */}
        {isConverting && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-2 border-[var(--border)] flex items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-[var(--text-primary)] text-sm font-medium mb-1">
                  Converting your screenplay…
                </h3>
                <p className="text-[var(--text-secondary)] text-xs max-w-xs">
                  We&apos;re parsing and structuring your script. This usually
                  takes 30–90 seconds.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── Editor + Scene Navigator ────────────────── */}
        {isEditorVisible && (
          <>
            {/* Editor area */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="flex-1 min-h-0 overflow-auto bg-[var(--background)]">
                {/*
                  Screenplay page — US Letter proportions (8.5 × 11 in)
                  Industry standard margins (Final Draft / Celtx / Arc Studio):
                    Page margins: 1.5in left, 1in right → 6in text area
                    Scene Heading: full width, left-aligned
                    Action:        full width, left-aligned
                    Character:     CENTERED on page
                    Parenthetical: CENTERED, narrow (max ~2.5in)
                    Dialogue:      CENTERED, ~3.5in wide
                    Transition:    right-aligned
                */}
                <div data-tour="script-editor" className="w-[720px] max-w-full mx-auto my-8 bg-[var(--surface)] border border-[var(--border)] rounded shadow-2xl shadow-black/40 min-h-[calc(100vh-220px)]">
                  <div className="relative">
                    {/* Formatted screenplay TipTap render */}
                    <ScriptEditor
                      key={script?.id ? `${script.id}-${script.updated_at}-${isAwaitingConfirm}` : 'new'}
                      initialHtml={initialHtml}
                      editorRef={editorRef}
                      scriptId={script?.id}
                      onUpdate={(html: string, text: string) => {
                        setEditorContent(text);
                        // Do NOT write TipTap's HTML back into internalRefContent.
                        // internalRefContent is the *source text* used by
                        // generateInitialHtml; treating HTML as text would
                        // corrupt initialHtml and make seedIfEmpty reseed with
                        // garbage (which is why the editor appeared blank).
                        if (html !== initialHtml) setIsDirty(true);
                      }}
                      onActiveElementChange={setActiveElement}
                    />
                  </div>
                </div>
              </div>

              {/* Bottom status bar */}
              <div className="flex-shrink-0 px-5 py-1.5 border-t border-[var(--border)] flex items-center justify-between text-[10px] text-[var(--text-muted)]">
                <div className="flex items-center gap-4">
                  <span>
                    {editorContent.split("\n").length} lines
                  </span>
                  <span>
                    {scriptHeadings.length} scene{scriptHeadings.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span>⌘S Save</span>
                  <span>Tab Cycle Element</span>
                  <span>⌘1-7 Elements</span>
                </div>
              </div>
            </div>

            {/* Scene Navigator sidebar */}
            <aside data-tour="scene-navigator" className="w-56 flex-shrink-0 border-l border-[var(--border)] bg-[var(--surface)] flex flex-col min-h-0">
              <div className="px-3 py-3 border-b border-[var(--border)]">
                <h3 className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
                  Scenes
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {scriptHeadings.length === 0 ? (
                  <p className="px-3 py-4 text-[11px] text-[var(--text-muted)]">
                    No scene headings found. Start with INT. or EXT.
                  </p>
                ) : (
                  scriptHeadings.map((h, i) => (
                    <button
                      key={`${h.index}-${i}`}
                      onClick={() => jumpToHeading(h)}
                      className="w-full text-left px-3 py-2 hover:bg-[var(--surface)] transition-colors group flex items-start gap-2"
                    >
                      <ChevronRight className="h-3 w-3 text-[var(--text-muted)] group-hover:text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] text-[var(--text-secondary)] group-hover:text-white leading-tight line-clamp-2">
                        {h.text}
                      </span>
                    </button>
                  ))
                )}
              </div>
            </aside>
          </>
        )}
      </div>

      {/* ═══════════ Floating generate bar (new scripts only) ═══════════
          Creative-Space-style: floats over the page bottom, collapses to a
          slim peek pill, reveals on hover/click, never hides while typing or
          submitting. Quick path = description + format + scene count; the
          full structured brief lives behind "More options". */}
      {showGenerateBar && (
        <div className="absolute bottom-0 left-0 right-0 pb-5 px-4 z-20 pointer-events-none">
          {/* Reveal hot-zone + peek pill while collapsed */}
          {barCollapsed && (
            <div
              className="absolute bottom-0 left-0 right-0 h-6 flex items-end justify-center pointer-events-auto cursor-pointer group"
              onMouseEnter={revealBar}
              onClick={() => setBarCollapsed(false)}
              title="Show prompt bar"
            >
              {!barRevealed && (
                <div className="mb-1 flex items-center gap-1 rounded-full bg-[var(--surface)]/80 backdrop-blur border border-[#ffffff12] px-2.5 py-1 text-[10px] text-[var(--text-muted)] group-hover:text-emerald-400 group-hover:border-emerald-500/40 shadow-lg transition-colors">
                  <ChevronUp className="w-3 h-3" />
                  <span>Generate with AI</span>
                </div>
              )}
            </div>
          )}

          <div
            className={`relative w-full max-w-2xl mx-auto bg-[var(--surface)]/80 backdrop-blur-xl border border-[#ffffff10] rounded-2xl p-4 shadow-[0_-4px_48px_rgba(0,0,0,0.8)] flex flex-col gap-2.5 pointer-events-auto transition-transform duration-300 ${
              barRevealed ? "translate-y-0" : "translate-y-[125%]"
            }`}
            onMouseEnter={revealBar}
            onMouseLeave={scheduleHideBar}
            onFocusCapture={() => setBarFocused(true)}
            onBlurCapture={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setBarFocused(false);
            }}
          >
            {/* Hide handle */}
            <button
              type="button"
              onClick={() => {
                setBarCollapsed(true);
                setBarHover(false);
                setBarFocused(false);
              }}
              className="absolute -top-3 left-1/2 -translate-x-1/2 z-10 flex items-center justify-center w-9 h-6 rounded-full bg-[var(--surface)] border border-[#ffffff12] text-[var(--text-muted)] hover:text-emerald-400 hover:border-emerald-500/40 shadow-lg transition-colors"
              title="Hide prompt bar"
              aria-label="Hide prompt bar"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-2 text-[11px] text-[var(--text-secondary)]">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              Generate your initial script with AI
            </div>

            <div className="flex items-end gap-2">
              <textarea
                value={genForm.raw_text}
                onChange={(e) => setGenField("raw_text", e.target.value)}
                maxLength={5000}
                rows={2}
                placeholder="Describe your story — who, where, what happens…"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerateScript();
                  }
                }}
                className="flex-1 bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors resize-none placeholder:text-[var(--text-muted)]"
              />
              <button
                type="button"
                onClick={handleGenerateScript}
                disabled={!genForm.raw_text.trim() || genSubmitting}
                className="inline-flex items-center gap-1.5 h-[38px] px-4 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {genSubmitting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                Generate
              </button>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={genForm.purpose}
                onChange={(e) => setGenField("purpose", e.target.value)}
                title="Format"
                className="bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded px-2 py-1 text-[11px] text-[var(--text-secondary)] focus:outline-none focus:border-emerald-500 transition-colors"
              >
                {SCRIPT_PURPOSES.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
              <select
                value={genSceneCount}
                onChange={(e) => setGenSceneCount(e.target.value)}
                title="Scene count"
                className="bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded px-2 py-1 text-[11px] text-[var(--text-secondary)] focus:outline-none focus:border-emerald-500 transition-colors"
              >
                <option value="">Auto scenes (max {MAX_GENERATED_SCENES})</option>
                {Array.from({ length: MAX_GENERATED_SCENES }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} scene{n > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setBarExpanded((v) => !v)}
                className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                title="Genre, tone, narration, setting, language, cast…"
              >
                {barExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronUp className="h-3 w-3" />
                )}
                {barExpanded ? "Fewer options" : "More options"}
              </button>
              <span className="ml-auto text-[10px] text-[var(--text-muted)]">
                Enter to generate · Shift+Enter for newline
              </span>
            </div>

            {/* Expanded structured-brief fields — inline, no popup. */}
            {barExpanded && (
              <div className="border-t border-[#ffffff10] pt-3 mt-0.5 flex flex-col gap-3 max-h-[45vh] overflow-y-auto pr-1">
                {/* Genre / Tone / Narration */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Genre
                    </label>
                    <input
                      type="text"
                      list="gen-genre-suggestions"
                      value={genForm.genre}
                      onChange={(e) => setGenField("genre", e.target.value)}
                      maxLength={120}
                      placeholder="e.g. Thriller"
                      className="w-full bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-[var(--text-muted)]"
                    />
                    <datalist id="gen-genre-suggestions">
                      {GENRE_SUGGESTIONS.map((g) => (
                        <option key={g} value={g} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Tone
                    </label>
                    <input
                      type="text"
                      list="gen-tone-suggestions"
                      value={genForm.tone}
                      onChange={(e) => setGenField("tone", e.target.value)}
                      maxLength={120}
                      placeholder="e.g. Dark"
                      className="w-full bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-[var(--text-muted)]"
                    />
                    <datalist id="gen-tone-suggestions">
                      {TONE_SUGGESTIONS.map((t) => (
                        <option key={t} value={t} />
                      ))}
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Narration style
                    </label>
                    <select
                      value={genForm.narration_style}
                      onChange={(e) => setGenField("narration_style", e.target.value)}
                      className="w-full bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      {NARRATION_STYLES.map((n) => (
                        <option key={n.value} value={n.value}>
                          {n.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Setting / Language / Title */}
                <div className="grid grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Setting
                    </label>
                    <input
                      type="text"
                      value={genForm.setting}
                      onChange={(e) => setGenField("setting", e.target.value)}
                      maxLength={300}
                      placeholder="e.g. 1980s Hong Kong"
                      className="w-full bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Language
                    </label>
                    <select
                      value={genForm.language}
                      onChange={(e) => setGenField("language", e.target.value)}
                      className="w-full bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
                    >
                      {SCRIPT_LANGUAGES.map((l) => (
                        <option key={l.value} value={l.value}>
                          {l.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                      Title{" "}
                      <span className="normal-case text-[var(--text-muted)]">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={genTitle}
                      onChange={(e) => setGenTitle(e.target.value)}
                      maxLength={255}
                      placeholder="Let the AI pick one"
                      className="w-full bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-[var(--text-muted)]"
                    />
                  </div>
                </div>

                {/* Characters */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">
                      Characters{" "}
                      <span className="normal-case text-[var(--text-muted)]">
                        (optional — the AI invents a cast if left empty)
                      </span>
                    </label>
                    {genCharacters.length < MAX_INSTRUCTION_CHARACTERS && (
                      <button
                        type="button"
                        onClick={() =>
                          setGenCharacters((prev) => [
                            ...prev,
                            { name: "", role: "", description: "" },
                          ])
                        }
                        className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 transition-colors"
                      >
                        <Plus className="h-3 w-3" /> Add character
                      </button>
                    )}
                  </div>
                  {genCharacters.length > 0 && (
                    <div className="flex flex-col gap-1.5">
                      {genCharacters.map((c, idx) => (
                        <div key={idx} className="flex gap-1.5 items-start">
                          <input
                            type="text"
                            value={c.name}
                            onChange={(e) => updateGenCharacter(idx, { name: e.target.value })}
                            maxLength={80}
                            placeholder="Name"
                            className="w-28 bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-[var(--text-muted)]"
                          />
                          <select
                            value={c.role}
                            onChange={(e) => updateGenCharacter(idx, { role: e.target.value })}
                            className="w-28 bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded px-1.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors"
                          >
                            <option value="">Role…</option>
                            {CHARACTER_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r.charAt(0).toUpperCase() + r.slice(1)}
                              </option>
                            ))}
                          </select>
                          <input
                            type="text"
                            value={c.description}
                            onChange={(e) =>
                              updateGenCharacter(idx, { description: e.target.value })
                            }
                            maxLength={500}
                            placeholder="Short description (age, look, personality)"
                            className="flex-1 bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-[var(--text-muted)]"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setGenCharacters((prev) => prev.filter((_, i) => i !== idx))
                            }
                            className="p-1.5 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                            title="Remove character"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Additional notes */}
                <div>
                  <label className="block text-[10px] font-medium text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                    Additional notes{" "}
                    <span className="normal-case text-[var(--text-muted)]">(optional)</span>
                  </label>
                  <textarea
                    value={genForm.additional_notes}
                    onChange={(e) => setGenField("additional_notes", e.target.value)}
                    maxLength={1000}
                    rows={2}
                    placeholder="Anything else the AI should honor — pacing, references, must-have beats…"
                    className="w-full bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 transition-colors resize-none placeholder:text-[var(--text-muted)]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ═══════════ Shortcuts Modal ═══════════════════════ */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-lg border border-[var(--border)] bg-[var(--surface)]">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-[var(--text-secondary)] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-y-2 gap-x-6 text-xs text-[#ccc]">
              <div className="flex justify-between">
                <span>Save script</span>
                <kbd className="text-[var(--text-secondary)]">⌘ S</kbd>
              </div>
              <div className="flex justify-between">
                <span>Shortcut map</span>
                <kbd className="text-[var(--text-secondary)]">⌘ /</kbd>
              </div>
              <div className="flex justify-between">
                <span>Analytics</span>
                <kbd className="text-[var(--text-secondary)]">⌘ ⇧ A</kbd>
              </div>
              <div className="flex justify-between">
                <span>Cycle element</span>
                <kbd className="text-[var(--text-secondary)]">Tab</kbd>
              </div>
              <div className="col-span-2 border-t border-[var(--border)] my-2" />
              <div className="col-span-2 text-[10px] text-[var(--text-secondary)] uppercase tracking-wider mb-1">
                Element shortcuts
              </div>
              {ELEMENT_CYCLE.map((el, i) => (
                <div key={el} className="flex justify-between">
                  <span className="capitalize">{el.replace("_", " ")}</span>
                  <kbd className="text-[var(--text-secondary)]">⌘ {i + 1}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Analytics Modal ══════════════════════= */}
      {showAnalytics && script && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-lg border border-[var(--border)] bg-[var(--surface)] max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-emerald-400" /> Script
                Analytics
              </h3>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-[var(--text-secondary)] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              {/* Stat cards — 5 cols */}
              <div className="grid grid-cols-5 gap-3 mb-6">
                <div className="p-3 bg-[var(--surface)] rounded-md border border-[var(--border)] text-center">
                  <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">Scenes</span>
                  <p className="text-xl font-bold text-emerald-400 mt-1">
                    {(script.analysis?.scene_count as number | undefined) ?? sceneBreakdownData.length}
                  </p>
                </div>
                <div className="p-3 bg-[var(--surface)] rounded-md border border-[var(--border)] text-center">
                  <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">Characters</span>
                  <p className="text-xl font-bold text-emerald-400 mt-1">
                    {(script.analysis?.character_count as number | undefined) ?? characterData.length}
                  </p>
                </div>
                <div className="p-3 bg-[var(--surface)] rounded-md border border-[var(--border)] text-center">
                  <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">Interior</span>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{intCount}</p>
                </div>
                <div className="p-3 bg-[var(--surface)] rounded-md border border-[var(--border)] text-center">
                  <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">Exterior</span>
                  <p className="text-xl font-bold text-emerald-400 mt-1">{extCount}</p>
                </div>
                <div className="p-3 bg-[var(--surface)] rounded-md border border-[var(--border)] text-center">
                  <span className="text-[9px] text-[var(--text-muted)] uppercase tracking-wider">Lines</span>
                  <p className="text-xl font-bold text-emerald-400 mt-1">
                    {editorContent.split("\n").length}
                  </p>
                </div>
              </div>

              {sceneBreakdownData.length > 0 && (
                <>
                  {/* Row 1 — Scene-by-Scene line chart (full width) */}
                  {sceneBreakdownData.length > 1 && (
                    <div className="mb-4">
                      <div className="bg-[var(--surface)] p-4 rounded-md border border-[var(--border)]">
                        <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 text-center">
                          Scene-by-Scene Breakdown
                        </h4>
                        <div className="h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={sceneBreakdownData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
                              <XAxis dataKey="label" tick={{ fill: "#666", fontSize: 9 }} axisLine={{ stroke: "#222" }} tickLine={false} />
                              <YAxis tick={{ fill: "#666", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip
                                contentStyle={{ backgroundColor: "#111", borderColor: "#222", borderRadius: "6px", fontSize: "12px" }}
                                labelFormatter={(label) => {
                                  const item = sceneBreakdownData.find((d) => d.label === String(label));
                                  return item ? item.scene : String(label);
                                }}
                              />
                              <Legend verticalAlign="top" height={30} wrapperStyle={{ fontSize: "10px" }} />
                              <Line type="monotone" dataKey="characters" name="Characters" stroke="#22c55e" strokeWidth={2} dot={{ r: 3, fill: "#22c55e" }} activeDot={{ r: 5 }} />
                              <Line type="monotone" dataKey="dialogues" name="Dialogues" stroke="#6ee7b7" strokeWidth={2} dot={{ r: 3, fill: "#6ee7b7" }} activeDot={{ r: 5 }} />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Row 2 — Characters bar (left) + Locations bar (right) */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    {characterData.length > 0 && (
                      <div className="bg-[var(--surface)] p-4 rounded-md border border-[var(--border)]">
                        <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 text-center">Top Characters</h4>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={characterData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                              <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 9 }} axisLine={{ stroke: "#222" }} tickLine={false} tickFormatter={(v: string) => (v.length > 8 ? v.substring(0, 8) + ".." : v)} />
                              <YAxis tick={{ fill: "#666", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip contentStyle={{ backgroundColor: "#111", borderColor: "#222", borderRadius: "6px", fontSize: "12px" }} cursor={{ fill: "#1a1a1a", opacity: 0.6 }} />
                              <Bar dataKey="count" fill="#22c55e" radius={[3, 3, 0, 0]} maxBarSize={35}>
                                {characterData.map((_, idx) => (
                                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}

                    {locationData.length > 0 && (
                      <div className="bg-[var(--surface)] p-4 rounded-md border border-[var(--border)]">
                        <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 text-center">Top Locations</h4>
                        <div className="h-52">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={locationData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                              <XAxis dataKey="name" tick={{ fill: "#666", fontSize: 9 }} axisLine={{ stroke: "#222" }} tickLine={false} tickFormatter={(v: string) => (v.length > 8 ? v.substring(0, 8) + ".." : v)} />
                              <YAxis tick={{ fill: "#666", fontSize: 9 }} axisLine={false} tickLine={false} allowDecimals={false} />
                              <Tooltip contentStyle={{ backgroundColor: "#111", borderColor: "#222", borderRadius: "6px", fontSize: "12px" }} cursor={{ fill: "#1a1a1a", opacity: 0.6 }} />
                              <Bar dataKey="count" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={35}>
                                {locationData.map((_, idx) => (
                                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Row 3 — Dialogue Distribution pie (left) + Action vs Dialogue pie (right) */}
                  {(dialogueDistData.length > 0 || script?.analysis?.action_vs_dialogue) && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {dialogueDistData.length > 0 && (
                        <div className="bg-[var(--surface)] p-4 rounded-md border border-[var(--border)]">
                          <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 text-center">Dialogue Distribution</h4>
                          <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie data={dialogueDistData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none">
                                  {dialogueDistData.map((_, idx) => (
                                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: "#111", borderColor: "#222", borderRadius: "6px", fontSize: "12px" }} itemStyle={{ color: "#fff" }} formatter={(value) => `${value}%`} />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "10px" }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}

                      {script?.analysis?.action_vs_dialogue && (
                        <div className="bg-[var(--surface)] p-4 rounded-md border border-[var(--border)]">
                          <h4 className="text-xs font-semibold text-[var(--text-secondary)] mb-3 text-center">Action vs Dialogue</h4>
                          <div className="h-52">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={[
                                    { name: "Action", value: script.analysis.action_vs_dialogue.Action || 0 },
                                    { name: "Dialogue", value: script.analysis.action_vs_dialogue.Dialogue || 0 },
                                  ].filter((d) => d.value > 0)}
                                  cx="50%" cy="50%" innerRadius={45} outerRadius={65} paddingAngle={4} dataKey="value" stroke="none"
                                >
                                  <Cell fill="#22c55e" />
                                  <Cell fill="#6ee7b7" />
                                </Pie>
                                <Tooltip contentStyle={{ backgroundColor: "#111", borderColor: "#222", borderRadius: "6px", fontSize: "12px" }} itemStyle={{ color: "#fff" }} formatter={(value) => `${value}%`} />
                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: "10px" }} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
      {/* ═══════════ Delete Modal ═════════════════════════ */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
            <div className="p-4 border-b border-[var(--border)] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-red-400 flex items-center gap-2">
                <Trash2 className="h-4 w-4" /> Delete Script
              </h3>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="text-[var(--text-secondary)] hover:text-white transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              <p className="text-xs text-[var(--text-secondary)] mb-4">
                This action is permanent and cannot be undone. All scenes, characters, and shots associated with this script will be lost.
              </p>
              <p className="text-xs text-[var(--text-primary)] font-medium mb-2">
                Type <strong className="text-red-400">CONFIRM</strong> to proceed:
              </p>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                placeholder="CONFIRM"
                className="w-full bg-[var(--surface-hover)] border border-[var(--border-hover)] rounded px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-red-500 transition-colors mb-5 placeholder:text-[var(--text-muted)]"
                autoFocus
              />
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 rounded text-xs text-[var(--text-secondary)] hover:text-white hover:bg-[var(--border)] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteScript}
                  disabled={deleteConfirmText !== "CONFIRM"}
                  className="px-4 py-2 rounded text-xs bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
