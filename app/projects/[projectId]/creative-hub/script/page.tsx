"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  uploadScript,
  getScripts,
  getScenes,
  getCharacters,
  updateScript,
  reparseScript,
  getScriptConversionReview,
  confirmScriptConversion,
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
} from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import { useParams } from "next/navigation";

/* ───────────────────────── Types ───────────────────────── */

type ScreenplayElement =
  | "scene_heading"
  | "action"
  | "character"
  | "dialogue"
  | "parenthetical"
  | "transition"
  | "shot";

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

  /* ── Conversion flow state ──────────────────────────────── */
  const [pendingScriptId, setPendingScriptId] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [isAwaitingConfirm, setIsAwaitingConfirm] = useState(false);
  const [confirming, setConfirming] = useState(false);

  /* ── UI toggles ─────────────────────────────────────────── */
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [activeElement, setActiveElement] = useState<ScreenplayElement>("action");

  /* ── Refs ────────────────────────────────────────────────── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  /* ── Derived: scene headings from the editor text ───────── */
  const scriptHeadings = useMemo(() => {
    const headings: { text: string; index: number }[] = [];
    const lines = editorContent.split("\n");
    let charIdx = 0;
    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();
      if (SCENE_HEADING_RE.test(trimmed)) {
        headings.push({ text: trimmed.toUpperCase(), index: charIdx });
      }
      charIdx += lines[i].length + 1; // +1 for \n
    }
    return headings;
  }, [editorContent]);

  /* ═══════════════════════ Data fetching ═══════════════════ */

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
        setEditorContent(isFdxXml(raw) ? fdxToText(raw) : raw);

        // Check if this script is mid-conversion
        if (s.requires_confirmation && s.review_status === "processing") {
          setPendingScriptId(s.id);
          setIsConverting(true);
          return;
        }
        if (s.requires_confirmation && s.review_status === "pending_review") {
          setPendingScriptId(s.id);
          // Try to load draft immediately
          try {
            const review = await getScriptConversionReview(s.id);
            const draftScenes = review?.draft?.scenes || [];
            if (draftScenes.length) {
              setEditorContent(scenesToText(draftScenes));
              setIsAwaitingConfirm(true);
            } else {
              setIsConverting(true);
            }
          } catch {
            setIsConverting(true);
          }
          return;
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
        const review = await getScriptConversionReview(pendingScriptId);
        const draftScenes = review?.draft?.scenes || [];
        if (draftScenes.length) {
          setEditorContent(scenesToText(draftScenes));
          setIsConverting(false);
          setIsAwaitingConfirm(true);
        }
      } catch {
        // Not ready yet — keep polling
      }
    }, 3000);

    return () => clearInterval(timer);
  }, [isConverting, pendingScriptId]);

  /* ═══════════════════════ Handlers ════════════════════════ */

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
      setScript(newScript);

      if (newScript.requires_confirmation) {
        // Non-FDX → needs conversion + review
        setPendingScriptId(newScript.id);
        setIsConverting(true);
        setIsAwaitingConfirm(false);
        setEditorContent("");
        setScenes([]);
        setCharacters([]);
        toast.success("Script received — converting your screenplay…");
      } else {
        // FDX → parsed immediately
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
      const updated = await updateScript(script.id, { content: editorContent });
      setScript(updated);
      toast.success("Script saved — reparsing scenes…");

      // Trigger reparse to regenerate scenes from updated content
      try {
        await reparseScript(script.id);
        // Refresh scenes & characters after reparse
        const [newScenes, newChars] = await Promise.all([
          getScenes(script.id).catch(() => []),
          getCharacters(script.id).catch(() => []),
        ]);
        setScenes(newScenes);
        setCharacters(newChars);
        toast.success("Scenes updated from script.");
      } catch {
        // Reparse may be async — scenes will update on next load
        toast.info("Reparse queued — scenes will update shortly.");
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
      await confirmScriptConversion(script.id, {
        action: "confirm",
        screenplay_text: editorContent,
      });
      toast.success("Script confirmed — generating scenes & characters…");
      setIsAwaitingConfirm(false);
      setIsConverting(false);
      setPendingScriptId(null);
      await fetchScript();
    } catch (err: unknown) {
      toast.error(extractApiError(err as Error, "Confirmation failed."));
    } finally {
      setConfirming(false);
    }
  };

  const jumpToHeading = useCallback(
    (heading: { text: string; index: number }) => {
      const ta = editorRef.current;
      if (!ta) return;
      ta.focus();
      ta.setSelectionRange(heading.index, heading.index + heading.text.length);
      const linesBefore = editorContent.slice(0, heading.index).split("\n").length;
      ta.scrollTop = Math.max(0, (linesBefore - 3) * 22);
    },
    [editorContent]
  );

  /* ═══════════════════ Celtx shortcuts ════════════════════ */

  const applyElement = (element: ScreenplayElement) => {
    const ta = editorRef.current;
    if (!ta) return;

    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = editorContent;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const lineEndPos = text.indexOf("\n", end);
    const lineEnd = lineEndPos === -1 ? text.length : lineEndPos;
    const currentLine = text.slice(lineStart, lineEnd).trim();

    let transformed = currentLine;
    switch (element) {
      case "scene_heading":
        transformed =
          currentLine.toUpperCase().startsWith("INT") ||
          currentLine.toUpperCase().startsWith("EXT")
            ? currentLine.toUpperCase()
            : `INT. ${currentLine || "LOCATION"} - DAY`;
        break;
      case "character":
        transformed = (currentLine || "CHARACTER").toUpperCase();
        break;
      case "parenthetical":
        transformed = currentLine.startsWith("(")
          ? currentLine
          : `(${currentLine || "beat"})`;
        break;
      case "transition":
        transformed = currentLine.toUpperCase().endsWith("TO:")
          ? currentLine.toUpperCase()
          : `${(currentLine || "CUT").toUpperCase()} TO:`;
        break;
      case "shot":
        transformed = currentLine.toUpperCase().startsWith("SHOT")
          ? currentLine
          : `SHOT: ${currentLine || ""}`;
        break;
      default:
        transformed = currentLine;
    }

    const next = text.slice(0, lineStart) + transformed + text.slice(lineEnd);
    setEditorContent(next);
    setActiveElement(element);
  };

  const handleEditorKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const meta = e.metaKey || e.ctrlKey;

    if (meta && e.key.toLowerCase() === "s") {
      e.preventDefault();
      if (isAwaitingConfirm) handleConfirm();
      else handleSave();
      return;
    }
    if (meta && e.shiftKey && e.key.toLowerCase() === "a") {
      e.preventDefault();
      setShowAnalytics(true);
      return;
    }
    if (meta && e.key === "/") {
      e.preventDefault();
      setShowShortcuts((v) => !v);
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      const idx = ELEMENT_CYCLE.indexOf(activeElement);
      const next = e.shiftKey
        ? (idx - 1 + ELEMENT_CYCLE.length) % ELEMENT_CYCLE.length
        : (idx + 1) % ELEMENT_CYCLE.length;
      applyElement(ELEMENT_CYCLE[next]);
      return;
    }

    const num = Number(e.key);
    if (meta && num >= 1 && num <= 7) {
      e.preventDefault();
      applyElement(ELEMENT_CYCLE[num - 1]);
    }
  };

  /* ═══════════════════ Analytics data ═════════════════════ */

  const COLORS = ["#22c55e", "#10b981", "#059669", "#047857", "#6ee7b7"];

  const intExtData = useMemo(() => {
    let i = 0,
      e = 0,
      n = 0;
    scenes.forEach((s) => {
      const v = (s.int_ext || "").toUpperCase();
      if (v.includes("INT")) i++;
      else if (v.includes("EXT")) e++;
      else n++;
    });
    const d: { name: string; value: number }[] = [];
    if (i) d.push({ name: "INT", value: i });
    if (e) d.push({ name: "EXT", value: e });
    if (n) d.push({ name: "N/A", value: n });
    return d;
  }, [scenes]);

  const locationData = useMemo(() => {
    const m: Record<string, number> = {};
    scenes.forEach((s) => {
      const loc = (s.location || "").toUpperCase();
      if (loc) m[loc] = (m[loc] || 0) + 1;
    });
    return Object.entries(m)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [scenes]);

  /* ═══════════════════ Helpers for view ═══════════════════ */

  const isEditorVisible = !!script && !isConverting && !loading;
  const showUpload = !script && !loading && !isConverting;

  /* ═══════════════════════ Render ══════════════════════════ */

  return (
    <div className="h-full flex flex-col bg-[#0a0a0a]">
      {/* ─── Top bar ─────────────────────────────────────── */}
      <header className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <h1 className="text-sm font-semibold text-white tracking-wide">
            Script Editor
          </h1>

          {/* Element indicator pill */}
          {isEditorVisible && (
            <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-[#1a1a1a] text-[#888] border border-[#222]">
              {activeElement.replace("_", " ")}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Shortcuts */}
          <button
            onClick={() => setShowShortcuts(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded border border-[#222] text-[#888] hover:text-white hover:bg-[#151515] transition-colors"
            title="Keyboard Shortcuts"
          >
            <Keyboard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Shortcuts</span>
          </button>

          {/* Analytics */}
          {script && scenes.length > 0 && !isAwaitingConfirm && (
            <button
              onClick={() => setShowAnalytics(true)}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded border border-[#222] text-[#888] hover:text-white hover:bg-[#151515] transition-colors"
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
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded border border-[#222] text-[#888] hover:text-white hover:bg-[#151515] transition-colors"
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
            <Loader2 className="h-6 w-6 animate-spin text-[#333]" />
          </div>
        )}

        {/* Upload zone (no script yet) */}
        {showUpload && (
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="w-full max-w-md border border-dashed border-[#222] rounded-lg p-12 flex flex-col items-center bg-[#0d0d0d] hover:border-[#333] transition-colors">
              <Upload className="h-10 w-10 text-[#333] mb-4" />
              <h3 className="text-sm font-medium text-white mb-1">
                Upload your screenplay
              </h3>
              <p className="text-[#555] text-xs mb-6">
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
            </div>
          </div>
        )}

        {/* Converting loader */}
        {isConverting && (
          <div className="flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                <div className="h-16 w-16 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center">
                  <Loader2 className="h-7 w-7 animate-spin text-emerald-400" />
                </div>
                <div className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              </div>
              <div className="text-center">
                <h3 className="text-white text-sm font-medium mb-1">
                  Converting your screenplay…
                </h3>
                <p className="text-[#666] text-xs max-w-xs">
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
              <div className="flex-1 min-h-0 overflow-auto bg-[#080808]">
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
                <div className="w-[720px] max-w-full mx-auto my-8 bg-[#0e0e0e] border border-[#1a1a1a] rounded shadow-2xl shadow-black/40 min-h-[calc(100vh-220px)]">
                  <div className="relative">
                    {/* Invisible textarea captures all input */}
                    <textarea
                      ref={editorRef}
                      value={editorContent}
                      onChange={(e) => setEditorContent(e.target.value)}
                      onKeyDown={handleEditorKeyDown}
                      spellCheck={false}
                      className="absolute inset-0 w-full h-full opacity-0 resize-none z-10 cursor-text"
                      placeholder=""
                    />

                    {/* Formatted screenplay render */}
                    <div
                      className="font-[Courier_Prime,Courier_New,monospace] text-[12.5px] leading-[24px] min-h-[60vh] cursor-text px-16 py-12"
                      onClick={() => editorRef.current?.focus()}
                    >
                      {editorContent === "" ? (
                        <p className="text-[#333] italic text-center">Start writing your screenplay…</p>
                      ) : (() => {
                        const lines = editorContent.split("\n");
                        let prevType: LineType | null = null;
                        return lines.map((line, idx) => {
                          const trimmed = line.trim();
                          const type = classifyLine(trimmed, prevType);
                          prevType = type;

                          if (type === "blank") {
                            return <div key={idx} className="h-[24px]" />;
                          }
                          if (type === "scene_heading") {
                            return (
                              <div key={idx} className="text-[#f0f0f0] font-bold uppercase tracking-wide text-left">
                                {trimmed}
                              </div>
                            );
                          }
                          if (type === "character") {
                            /* Character name: centered on the page */
                            return (
                              <div key={idx} className="text-center text-[#e8e8e8] uppercase font-semibold mt-3">
                                {trimmed}
                              </div>
                            );
                          }
                          if (type === "parenthetical") {
                            /* Parenthetical: centered, narrow block */
                            return (
                              <div key={idx} className="text-center mx-auto max-w-[240px] text-[#b0b0b0] italic">
                                {trimmed}
                              </div>
                            );
                          }
                          if (type === "dialogue") {
                            /* Dialogue: centered block, ~65% width */
                            return (
                              <div key={idx} className="text-center mx-auto max-w-[65%] text-[#d0d0d0]">
                                {trimmed}
                              </div>
                            );
                          }
                          if (type === "transition") {
                            return (
                              <div key={idx} className="text-right text-[#e0e0e0] uppercase font-semibold mt-3 mb-1">
                                {trimmed}
                              </div>
                            );
                          }
                          if (type === "shot") {
                            return (
                              <div key={idx} className="text-left text-[#e0e0e0] uppercase">
                                {trimmed}
                              </div>
                            );
                          }
                          /* Action — full width, left-aligned */
                          return (
                            <div key={idx} className="text-left text-[#c8c8c8]">
                              {trimmed}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom status bar */}
              <div className="flex-shrink-0 px-5 py-1.5 border-t border-[#1a1a1a] flex items-center justify-between text-[10px] text-[#555]">
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
            <aside className="w-56 flex-shrink-0 border-l border-[#1a1a1a] bg-[#0d0d0d] flex flex-col min-h-0">
              <div className="px-3 py-3 border-b border-[#1a1a1a]">
                <h3 className="text-[11px] font-semibold text-[#999] uppercase tracking-wider">
                  Scenes
                </h3>
              </div>
              <div className="flex-1 overflow-y-auto py-1">
                {scriptHeadings.length === 0 ? (
                  <p className="px-3 py-4 text-[11px] text-[#444]">
                    No scene headings found. Start with INT. or EXT.
                  </p>
                ) : (
                  scriptHeadings.map((h, i) => (
                    <button
                      key={`${h.index}-${i}`}
                      onClick={() => jumpToHeading(h)}
                      className="w-full text-left px-3 py-2 hover:bg-[#151515] transition-colors group flex items-start gap-2"
                    >
                      <ChevronRight className="h-3 w-3 text-[#333] group-hover:text-emerald-400 mt-0.5 flex-shrink-0" />
                      <span className="text-[11px] text-[#aaa] group-hover:text-white leading-tight line-clamp-2">
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

      {/* ═══════════ Shortcuts Modal ═══════════════════════ */}
      {showShortcuts && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-lg border border-[#2a2a2a] bg-[#101010]">
            <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowShortcuts(false)}
                className="text-[#888] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 grid grid-cols-2 gap-y-2 gap-x-6 text-xs text-[#ccc]">
              <div className="flex justify-between">
                <span>Save script</span>
                <kbd className="text-[#888]">⌘ S</kbd>
              </div>
              <div className="flex justify-between">
                <span>Shortcut map</span>
                <kbd className="text-[#888]">⌘ /</kbd>
              </div>
              <div className="flex justify-between">
                <span>Analytics</span>
                <kbd className="text-[#888]">⌘ ⇧ A</kbd>
              </div>
              <div className="flex justify-between">
                <span>Cycle element</span>
                <kbd className="text-[#888]">Tab</kbd>
              </div>
              <div className="col-span-2 border-t border-[#1f1f1f] my-2" />
              <div className="col-span-2 text-[10px] text-[#666] uppercase tracking-wider mb-1">
                Element shortcuts
              </div>
              {ELEMENT_CYCLE.map((el, i) => (
                <div key={el} className="flex justify-between">
                  <span className="capitalize">{el.replace("_", " ")}</span>
                  <kbd className="text-[#888]">⌘ {i + 1}</kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════ Analytics Modal ══════════════════════= */}
      {showAnalytics && script && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-3xl rounded-lg border border-[#2a2a2a] bg-[#101010] max-h-[85vh] overflow-y-auto">
            <div className="p-4 border-b border-[#1f1f1f] flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-emerald-400" /> Script
                Analytics
              </h3>
              <button
                onClick={() => setShowAnalytics(false)}
                className="text-[#888] hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-5">
              {/* Stat cards */}
              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-4 bg-[#111] rounded-md border border-[#1a1a1a] text-center">
                  <span className="text-[9px] text-[#555] uppercase tracking-wider">
                    Scenes
                  </span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {script.analysis?.scene_count || scenes.length || scriptHeadings.length}
                  </p>
                </div>
                <div className="p-4 bg-[#111] rounded-md border border-[#1a1a1a] text-center">
                  <span className="text-[9px] text-[#555] uppercase tracking-wider">
                    Characters
                  </span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {characters.length ||
                      script.analysis?.character_count ||
                      0}
                  </p>
                </div>
                <div className="p-4 bg-[#111] rounded-md border border-[#1a1a1a] text-center">
                  <span className="text-[9px] text-[#555] uppercase tracking-wider">
                    Lines
                  </span>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {editorContent.split("\n").length}
                  </p>
                </div>
              </div>

              {/* Charts */}
              {scenes.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {intExtData.length > 0 && (
                    <div className="bg-[#111] p-4 rounded-md border border-[#1a1a1a]">
                      <h4 className="text-xs font-semibold text-[#999] mb-3 text-center">
                        INT / EXT Breakdown
                      </h4>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={intExtData}
                              cx="50%"
                              cy="50%"
                              innerRadius={45}
                              outerRadius={65}
                              paddingAngle={5}
                              dataKey="value"
                              stroke="none"
                            >
                              {intExtData.map((_, idx) => (
                                <Cell
                                  key={idx}
                                  fill={COLORS[idx % COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#111",
                                borderColor: "#222",
                                borderRadius: "6px",
                                fontSize: "12px",
                              }}
                              itemStyle={{ color: "#fff" }}
                            />
                            <Legend verticalAlign="bottom" height={36} />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {locationData.length > 0 && (
                    <div className="bg-[#111] p-4 rounded-md border border-[#1a1a1a]">
                      <h4 className="text-xs font-semibold text-[#999] mb-3 text-center">
                        Top Locations
                      </h4>
                      <div className="h-52">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={locationData}
                            margin={{ top: 5, right: 20, bottom: 5, left: 0 }}
                          >
                            <XAxis
                              dataKey="name"
                              tick={{ fill: "#666", fontSize: 9 }}
                              axisLine={{ stroke: "#222" }}
                              tickLine={false}
                              tickFormatter={(v: string) =>
                                v.length > 8 ? v.substring(0, 8) + ".." : v
                              }
                            />
                            <YAxis
                              tick={{ fill: "#666", fontSize: 9 }}
                              axisLine={false}
                              tickLine={false}
                              allowDecimals={false}
                            />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#111",
                                borderColor: "#222",
                                borderRadius: "6px",
                                fontSize: "12px",
                              }}
                              cursor={{ fill: "#1a1a1a", opacity: 0.6 }}
                            />
                            <Bar
                              dataKey="count"
                              fill="#22c55e"
                              radius={[3, 3, 0, 0]}
                              maxBarSize={35}
                            >
                              {locationData.map((_, idx) => (
                                <Cell
                                  key={idx}
                                  fill={COLORS[idx % COLORS.length]}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
