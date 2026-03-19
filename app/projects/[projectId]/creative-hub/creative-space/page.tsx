"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Loader2, Send, LayoutPanelTop, MonitorPlay, AlertTriangle, User, MapPin, History } from "lucide-react";
import { useParams } from "next/navigation";
import {
  getScripts,
  createScriptPrevisualization,
  getImageModels,
  getCharacters,
  getLocations,
  ImageModel,
  getScriptPrevisualizations,
} from "@/services/creative-hub";
import { toast } from "react-toastify";
import { extractApiError } from "@/lib/extract-api-error";
import { ASPECT_RATIOS, CAMERA_ANGLES } from "@/app/projects/[projectId]/creative-hub/storyboard/page";
import dayjs from "dayjs";
import isToday from "dayjs/plugin/isToday";
import isYesterday from "dayjs/plugin/isYesterday";

dayjs.extend(isToday);
dayjs.extend(isYesterday);

const SHOT_TYPES = [
  "Close-Up", "Wide Shot", "Tracking Shot", "Over-The-Shoulder",
  "Medium Shot", "Medium Close-Up", "Medium Two-Shot", "Other",
];

const PARAM_SELECT_CLS =
  "bg-[#111] border border-[#1e1e1e] rounded-md text-xs text-white px-2 py-1.5 outline-none focus:border-emerald-500/40 transition-colors cursor-pointer";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TaggedCharacter { id: number; name: string; image_url?: string; }
interface TaggedLocation  { id: number; name: string; image_url?: string; }

// ─── Tag parsers ──────────────────────────────────────────────────────────────

function getTaggedCharactersFromText(text: string, characters: TaggedCharacter[]): TaggedCharacter[] {
  if (!characters.length) return [];
  const escaped = characters.map((c) => c.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`@(${escaped.join("|")})`, "gi");
  const seen = new Set<number>();
  const result: TaggedCharacter[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const char = characters.find((c) => c.name.toLowerCase() === m![1].toLowerCase());
    if (char && !seen.has(char.id)) { seen.add(char.id); result.push(char); }
  }
  return result;
}

function getTaggedLocationsFromText(text: string, locations: TaggedLocation[]): TaggedLocation[] {
  if (!locations.length) return [];
  const escaped = locations.map((l) => l.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`#(${escaped.join("|")})`, "gi");
  const seen = new Set<number>();
  const result: TaggedLocation[] = [];
  let m: RegExpExecArray | null;
  while ((m = pattern.exec(text)) !== null) {
    const loc = locations.find((l) => l.name.toLowerCase() === m![1].toLowerCase());
    if (loc && !seen.has(loc.id)) { seen.add(loc.id); result.push(loc); }
  }
  return result;
}

// ─── MentionInput ─────────────────────────────────────────────────────────────

interface MentionInputProps {
  value: string;
  onChange: (val: string) => void;
  characters: TaggedCharacter[];
  locations: TaggedLocation[];
  disabled?: boolean;
  onKeyDown?: React.KeyboardEventHandler<HTMLTextAreaElement>;
}

type DropdownItem =
  | { kind: "character"; item: TaggedCharacter }
  | { kind: "location";  item: TaggedLocation  };

function rankByQuery<T extends { name: string }>(items: T[], query: string): T[] {
  if (!query) return items;
  const q = query.toLowerCase();
  return [...items].sort((a, b) => {
    const an = a.name.toLowerCase();
    const bn = b.name.toLowerCase();
    const score = (n: string) => (n === q ? 0 : n.startsWith(q) ? 1 : 2);
    const diff = score(an) - score(bn);
    return diff !== 0 ? diff : an.localeCompare(bn);
  });
}

function MentionInput({ value, onChange, characters, locations, disabled, onKeyDown }: MentionInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const [mentionChar,  setMentionChar]  = useState<"@" | "#" | null>(null);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos,  setDropdownPos]  = useState({ top: 0, left: 0, width: 0 });
  const [selectedIdx,  setSelectedIdx]  = useState(0);
  const [mounted,      setMounted]      = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const syncScroll = () => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  const dropdownItems: DropdownItem[] = (() => {
    const q = mentionQuery.toLowerCase();
    if (mentionChar === "@") {
      return rankByQuery(characters.filter((c) => c.name.toLowerCase().includes(q)), mentionQuery)
        .map((item) => ({ kind: "character" as const, item }));
    }
    if (mentionChar === "#") {
      return rankByQuery(locations.filter((l) => l.name.toLowerCase().includes(q)), mentionQuery)
        .map((item) => ({ kind: "location" as const, item }));
    }
    return [];
  })();

  const positionDropdown = () => {
    if (!textareaRef.current) return;
    const rect = textareaRef.current.getBoundingClientRect();
    // Anchor above the textarea — dropdown opens upward away from the bottom bar
    setDropdownPos({ top: rect.top - 8, left: rect.left, width: Math.max(rect.width, 280) });
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    syncScroll();

    const cursor    = e.target.selectionStart ?? 0;
    const textUpTo  = newVal.slice(0, cursor);
    const lastAt    = textUpTo.lastIndexOf("@");
    const lastHash  = textUpTo.lastIndexOf("#");
    const triggerIdx  = Math.max(lastAt, lastHash);
    const triggerChar = triggerIdx === lastAt ? "@" : "#";

    if (triggerIdx !== -1) {
      const fragment = textUpTo.slice(triggerIdx + 1);
      if (!fragment.includes(" ")) {
        setMentionChar(triggerChar);
        setMentionQuery(fragment);
        setMentionStart(triggerIdx);
        setShowDropdown(true);
        setSelectedIdx(0);
        positionDropdown();
        return;
      }
    }
    setShowDropdown(false);
    setMentionStart(null);
    setMentionChar(null);
  };

  const insertMention = (label: string) => {
    if (mentionStart === null || !mentionChar) return;
    const before = value.slice(0, mentionStart);
    const after  = value.slice(mentionStart + 1 + mentionQuery.length);
    onChange(`${before}${mentionChar}${label} ${after}`);
    setShowDropdown(false);
    setMentionStart(null);
    setMentionChar(null);
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + label.length + 2;
        textareaRef.current.setSelectionRange(pos, pos);
        textareaRef.current.focus();
        syncScroll();
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown && dropdownItems.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((p) => Math.min(p + 1, dropdownItems.length - 1));
        return;
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((p) => Math.max(p - 1, 0));
        return;
      } else if (e.key === "Tab" || e.key === "Enter") {
        const sel = dropdownItems[selectedIdx];
        if (sel) { e.preventDefault(); insertMention(sel.item.name); return; }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
        return;
      }
    }
    onKeyDown?.(e);
  };

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current  && !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current  && !textareaRef.current.contains(e.target as Node)
      ) { setShowDropdown(false); }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Portal dropdown — rendered at document.body to escape backdrop-filter stacking context
  const dropdown =
    mounted && showDropdown && dropdownItems.length > 0
      ? createPortal(
          <div
            ref={dropdownRef}
            className="fixed z-[9999] bg-[#141414] border border-[#2a2a2a] rounded-lg shadow-2xl overflow-hidden"
            style={{
              top:       dropdownPos.top,
              left:      dropdownPos.left,
              width:     dropdownPos.width,
              transform: "translateY(-100%)",  // open upward
              maxHeight: "260px",
              overflowY: "auto",
            }}
          >
            {/* Header */}
            <div className="px-3 py-1.5 flex items-center justify-between border-b border-[#1f1f1f] sticky top-0 bg-[#141414] z-10">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#444]">
                {mentionChar === "@" ? "Characters" : "Locations"}
                {mentionQuery && (
                  <span className="text-[#333] normal-case font-normal">
                    {" "}· {dropdownItems.length} match{dropdownItems.length !== 1 ? "es" : ""}
                  </span>
                )}
              </span>
              <span className="text-[9px] text-[#333] font-mono">↑↓ · Tab/↵ select · Esc</span>
            </div>

            {dropdownItems.map((d, i) => {
              const label      = d.item.name;
              const imageUrl   = d.kind === "character" ? d.item.image_url : (d.item as TaggedLocation).image_url;
              const isChar     = d.kind === "character";
              const isSelected = selectedIdx === i;
              const isBest     = i === 0;

              const q        = mentionQuery.toLowerCase();
              const matchIdx = label.toLowerCase().indexOf(q);
              const highlighted =
                q && matchIdx !== -1 ? (
                  <>
                    {label.slice(0, matchIdx)}
                    <span className={isChar ? "text-emerald-300" : "text-sky-300"}>
                      {label.slice(matchIdx, matchIdx + q.length)}
                    </span>
                    {label.slice(matchIdx + q.length)}
                  </>
                ) : label;

              return (
                <button
                  key={`${d.kind}-${d.item.id}`}
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); insertMention(label); }}
                  onMouseEnter={() => setSelectedIdx(i)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                    isSelected
                      ? isChar ? "bg-emerald-500/10" : "bg-sky-500/10"
                      : "hover:bg-[#1a1a1a]"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-[#1f1f1f] border ${
                    isChar ? "border-emerald-500/20" : "border-sky-500/20"
                  }`}>
                    {imageUrl ? (
                      <img src={imageUrl} alt={label} className="w-full h-full object-cover" />
                    ) : isChar ? (
                      <User className="w-3 h-3 m-auto mt-1.5 text-emerald-500/60" />
                    ) : (
                      <MapPin className="w-3 h-3 m-auto mt-1.5 text-sky-500/60" />
                    )}
                  </div>
                  <span className={`text-xs flex-1 ${isChar ? "text-emerald-400" : "text-sky-400"}`}>
                    {highlighted}
                  </span>
                  {isBest ? (
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${
                      isChar
                        ? "text-emerald-600 border-emerald-900/50 bg-emerald-950/40"
                        : "text-sky-600 border-sky-900/50 bg-sky-950/40"
                    }`}>Tab</span>
                  ) : (
                    <span className="text-[9px] text-[#333] font-mono">{isChar ? "@" : "#"}</span>
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )
      : null;
  /** Tokenise exact character and location names to handle multi-word tags correctly, e.g. #Hong Kong */
  const renderHighlighted = (text: string) => {
    const charNames = characters.map(c => c.name);
    const locNames  = locations.map(l => l.name);
    const allNames  = [...charNames, ...locNames].sort((a, b) => b.length - a.length);

    const parts: React.ReactNode[] = [];

    if (allNames.length === 0) {
      parts.push(<span key={`t0`} className="text-white">{text}</span>);
      return parts;
    }

    // Build dynamic regex like /(@John Smith|#Hong Kong)/gi
    const escapedChars = charNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const escapedLocs  = locNames.map(n => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const charPattern = escapedChars.length > 0 ? `@(?:${escapedChars.join("|")})` : "";
    const locPattern  = escapedLocs.length > 0  ? `#(?:${escapedLocs.join("|")})` : "";
    const combined    = [charPattern, locPattern].filter(Boolean).join("|");
    const re = new RegExp(`(${combined})`, "gi");

    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      if (m.index > last)
        parts.push(<span key={`t${last}`} className="text-white">{text.slice(last, m.index)}</span>);
      const token = m[0];
      parts.push(
        <span key={`m${m.index}`}
          className={token.startsWith("@")
            ? "text-emerald-400"
            : "text-sky-400"}
        >{token}</span>
      );
      last = m.index + token.length;
    }
    if (last < text.length)
      parts.push(<span key={`t${last}`} className="text-white">{text.slice(last)}</span>);
    return parts;
  };

  const commonStyles: React.CSSProperties = {
    fontFamily: "inherit",
    fontSize: "inherit",
    lineHeight: "inherit",
    letterSpacing: "inherit",
    fontKerning: "none",
    margin: 0,
    boxSizing: "border-box",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    overflowWrap: "break-word",
  };

  return (
    <div className="flex-1 relative overflow-hidden flex flex-col">
      <div
        ref={backdropRef}
        aria-hidden="true"
        className="absolute inset-0 px-2 py-1.5 text-sm pointer-events-none select-none"
        style={{
          ...commonStyles,
          color: disabled ? "#555" : "#fff",
          overflowY: "auto",
          overflowX: "hidden",
          zIndex: 0,
        }}
      >
        {renderHighlighted(value)}
        {"\n"}
      </div>

      <textarea
        ref={textareaRef}
        className="relative block w-full flex-1 border-none outline-none text-sm px-2 py-1.5 resize-none max-h-32 min-h-[44px] placeholder-[#444]"
        style={{
          ...commonStyles,
          color: "transparent",
          caretColor: disabled ? "transparent" : "white",
          background: "transparent",
          display: "block",
          zIndex: 1,
        }}
        placeholder="Describe the vision… use @Character or #Location to tag references"
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        disabled={disabled}
        rows={1}
      />
      {dropdown}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CreativeSpacePage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [scriptId,    setScriptId]    = useState<number | null>(null);
  const [prompt,      setPrompt]      = useState("");
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [cameraAngle, setCameraAngle] = useState("");
  const [shotType,    setShotType]    = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  // View toggle state
  const [showHistory, setShowHistory] = useState(false);

  // History state
  const [history, setHistory] = useState<any[]>([]);
  const [historyPage, setHistoryPage] = useState(1);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const [isFetchingHistory, setIsFetchingHistory] = useState(false);
  const [sessionGenerations, setSessionGenerations] = useState<any[]>([]);

  // Derived state or refs
  const containerRef = useRef<HTMLDivElement>(null);
  const sessionContainerRef = useRef<HTMLDivElement>(null);
  const [lastScrollHeight, setLastScrollHeight] = useState<number>(0);

  const [imageModels,       setImageModels]       = useState<ImageModel[]>([]);
  const [selectedModelName, setSelectedModelName] = useState("");
  const [selectedProvider,  setSelectedProvider]  = useState("");

  const [characters,       setCharacters]       = useState<TaggedCharacter[]>([]);
  const [locations,        setLocations]        = useState<TaggedLocation[]>([]);
  const [taggedCharacters, setTaggedCharacters] = useState<TaggedCharacter[]>([]);
  const [taggedLocations,  setTaggedLocations]  = useState<TaggedLocation[]>([]);

  const fetchHistory = async (sid: number, page: number, isInitial: boolean = false) => {
    if (isFetchingHistory) return;
    setIsFetchingHistory(true);
    try {
      const { results, next } = await getScriptPrevisualizations(sid, page);
      const items = Array.isArray(results) ? [...results] : [];

      // Results usually come newest first (ex: ID descending).
      // Since we want newest at the bottom, we should reverse them.
      // E.g., if page 1 has IDs 10..1, reversed is 1..10 (10 at bottom).
      const newItems = items;

      if (containerRef.current) {
        setLastScrollHeight(containerRef.current.scrollHeight);
      }

      setHistory((prev) => {
        if (isInitial) return newItems; // first load
        // Avoid duplicates by preserving existing history and adding older items
        const existingIds = prev.map((item) => item.id);
        const filteredNewItems = newItems.filter((i: any) => !existingIds.includes(i.id));

        // Note: New items represent 'older' images from the next page.
        // We append them to the START of the array so they sit at the top of the chat view.
        return [...filteredNewItems, ...prev];
      });

      setHasMoreHistory(!!next);
      setHistoryPage(page);
    } catch (err: any) {
      console.error("Failed to fetch previz history:", err);
    } finally {
      setIsFetchingHistory(false);
    }
  };

  useEffect(() => {
    if (!projectId) return;

    getScripts(projectId)
      .then((loaded) => {
        if (loaded?.length > 0) {
          const sid = loaded[0].id;
          setScriptId((prev) => prev ?? sid);
          Promise.all([
            getCharacters(sid).catch(() => []),
            getLocations(sid).catch(() => []),
          ]).then(([chars, locs]) => {
            setCharacters(chars.map((c: any) => ({ id: c.id, name: c.name, image_url: c.image_url ?? undefined })));
            setLocations(locs.map((l: any) => ({ id: l.id, name: l.name, image_url: l.image_url ?? undefined })));
          });
        }
      })
      .catch(console.error);

    getImageModels()
      .then((models) => {
        if (models?.length > 0) {
          setImageModels(models);
          setSelectedModelName(models[0].model_name);
          setSelectedProvider(models[0].provider);
        }
      })
      .catch(console.error);
  }, [projectId]);

  // Maintain scroll position when compiling new older history
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Auto-scroll to bottom on first load or when generating new shot
    if (historyPage === 1 && history.length > 0) {
      setTimeout(() => {
        if (containerRef.current) {
          containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
      }, 50);
    }
    // Maintain relative scroll offset when older messages are injected at the top
    else if (historyPage > 1) {
      setTimeout(() => {
        if (containerRef.current) {
          const newScrollHeight = containerRef.current.scrollHeight;
          const diff = newScrollHeight - lastScrollHeight;
          containerRef.current.scrollTop += diff;
        }
      }, 50);
    }
  }, [history, historyPage, lastScrollHeight]);

  const handleScroll = () => {
    if (!containerRef.current || isFetchingHistory || !hasMoreHistory || !scriptId || isGenerating) return;
    
    // If scrolled to top with a 100px threshold
    if (containerRef.current.scrollTop <= 100) {
      fetchHistory(scriptId, historyPage + 1);
    }
  };

  // Derive tagged entities live from prompt changes
  useEffect(() => {
    setTaggedCharacters(getTaggedCharactersFromText(prompt, characters));
    setTaggedLocations(getTaggedLocationsFromText(prompt, locations));
  }, [prompt, characters, locations]);

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const idx = Number(e.target.value);
    if (imageModels[idx]) {
      setSelectedModelName(imageModels[idx].model_name);
      setSelectedProvider(imageModels[idx].provider);
    }
  };

  const selectedModelIdx = imageModels.findIndex(
    (m) => m.model_name === selectedModelName && m.provider === selectedProvider
  );

  const handleGenerate = async () => {
    if (!scriptId || !prompt.trim()) return;
    setIsGenerating(true);

    const capturedPrompt = prompt;
    const capturedChars  = taggedCharacters;
    const capturedLocs   = taggedLocations;
    const charIds = capturedChars.map((c) => c.id);
    const locIds  = capturedLocs.map((l) => l.id);
    const tempId  = Date.now();

    const newGen = {
        id: tempId,
        isGenerating: true,
        prompt: capturedPrompt,
        aspect_ratio: aspectRatio,
        camera_angle: cameraAngle,
        shot_type: shotType,
        model_name: selectedModelName,
        taggedCharacters: capturedChars,
        taggedLocations:  capturedLocs,
        created_at: new Date().toISOString()
    };

    setHistory((prev) => [...prev, newGen]);
    setSessionGenerations((prev) => [...prev, newGen]);

    // Do NOT clear prompt yet — clear only on success so the user can retry on error

    setTimeout(() => {
      if (sessionContainerRef.current) sessionContainerRef.current.scrollTop = sessionContainerRef.current.scrollHeight;
      if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }, 50);

    try {
      const response = await createScriptPrevisualization({
        script: scriptId,
        description: capturedPrompt,
        aspect_ratio: aspectRatio,
        camera_angle: cameraAngle || undefined,
        shot_type: shotType || undefined,
        generate_ai_image: true,
        model: selectedModelName || undefined,
        provider: selectedProvider || undefined,
        character_ids: charIds.length > 0 ? charIds : undefined,
        location_ids:  locIds.length > 0  ? locIds  : undefined,
      });

      if (response?.image_url) {
        const resolved = { ...response, isGenerating: false, shot_type: shotType, taggedCharacters: capturedChars, taggedLocations: capturedLocs };
        setHistory((prev) => prev.map((item) => item.id === tempId ? resolved : item));
        setSessionGenerations((prev) => prev.map((item) => item.id === tempId ? resolved : item));
        
        setTimeout(() => {
          if (sessionContainerRef.current) sessionContainerRef.current.scrollTop = sessionContainerRef.current.scrollHeight;
        }, 50);

        // Scroll to bottom after arrival
        if (showHistory) {
          setTimeout(() => {
            if (containerRef.current) containerRef.current.scrollTop = containerRef.current.scrollHeight;
          }, 50);
        }
        setPrompt(""); // Success, can clear prompt
      } else {
        const msg = "Failed to generate visual.";
        const errored = (item: any) => ({ ...item, isGenerating: false, isError: true, errorMessage: msg });
        setHistory((prev) => prev.map((item) => item.id === tempId ? errored(item) : item));
        setSessionGenerations((prev) => prev.map((item) => item.id === tempId ? errored(item) : item));
      }
    } catch (error: any) {
      console.error("Failed to generate script previsualization:", error);
      const msg = extractApiError(error, "Image generation failed. Please try again.");
      toast.error(msg);
      
      const errored = (item: any) => ({ ...item, isGenerating: false, isError: true, errorMessage: msg });
      setHistory((prev) => prev.map((item) => item.id === tempId ? errored(item) : item));
      setSessionGenerations((prev) => prev.map((item) => item.id === tempId ? errored(item) : item));
    } finally {
      setIsGenerating(false);
    }
  };

  // Group history items by date explicitly resolving "Today" and "Yesterday."
  // Since items are fetched descending (newest first) and we reversed them to place oldest at top,
  // we can iterate cleanly. However, if the server ordered them newest-first natively, they should be in 
  // chronological order for the chat interface (oldest at top). Let's sort to guarantee chronological order.
  const chronologicalHistory = [...history].sort((a, b) => {
    // If temp generating item, id is large date.now(), puts it at end appropriately
    const idA = a.id ?? 0;
    const idB = b.id ?? 0;
    return idA - idB; 
  });

  const groupedHistory = chronologicalHistory.reduce((acc: any, item: any) => {
    if (!item.created_at) return acc;
    const dateObj = dayjs(item.created_at);
    let label = dateObj.format("MMM D, YYYY");

    if (dateObj.isToday()) {
      label = "Today";
    } else if (dateObj.isYesterday()) {
      label = "Yesterday";
    }

    if (!acc[label]) acc[label] = [];
    acc[label].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="relative flex flex-col h-full bg-[#0a0a0a] overflow-hidden">

      {/* Header */}
      <div className="flex-shrink-0 border-b border-[#1a1a1a] p-4 bg-[#0d0d0d] flex justify-between items-center z-10">
        <div>
          <h1 className="text-xl text-white font-semibold flex items-center gap-2">
            <LayoutPanelTop className="w-5 h-5 text-emerald-500" /> Creative Space
          </h1>
          <p className="text-xs text-[#666] mt-1">
            Generate unassigned script previsualizations. Tag{" "}
            <span className="text-emerald-500 font-medium">@characters</span> and{" "}
            <span className="text-sky-500 font-medium">#locations</span> to include reference images.
          </p>
        </div>
        <button
          onClick={() => {
            // Trigger fetch dynamically when opening history view if we haven't yet
            if (!showHistory && scriptId && history.length === 0 && hasMoreHistory) {
              fetchHistory(scriptId, 1, true);
            }
            setShowHistory(!showHistory);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] hover:bg-[#222] border border-[#333] rounded-md text-sm text-white transition-colors"
        >
          {showHistory ? (
            <>
              <MonitorPlay className="w-4 h-4" />
              <span>Back to Generator</span>
            </>
          ) : (
            <>
              <History className="w-4 h-4" />
              <span>View History</span>
            </>
          )}
        </button>
      </div>

      {/* Scrollable history grid */}
      <div 
        ref={containerRef}
        onScroll={handleScroll}
        className={`flex-1 overflow-y-auto p-6 pb-[200px] scroll-smooth ${showHistory ? 'block' : 'hidden'}`}
      >
        <div className="max-w-[1400px] mx-auto flex flex-col gap-10">
          
          {isFetchingHistory && hasMoreHistory && (
             <div className="flex justify-center p-4">
               <Loader2 className="w-5 h-5 text-emerald-500 animate-spin" />
             </div>
          )}

          {history.length === 0 && !isFetchingHistory ? (
            <div className="h-full min-h-[50vh] flex flex-col items-center justify-center text-[#444]">
              <MonitorPlay className="w-16 h-16 mb-4 opacity-20" />
              <p className="text-sm">Your generated imagery will appear here.</p>
              <p className="text-xs mt-2 text-[#333]">
                Use <span className="text-emerald-600">@CharacterName</span> or{" "}
                <span className="text-sky-600">#LocationName</span> in your prompt to inject reference images.
              </p>
            </div>
          ) : (
            Object.entries(groupedHistory).map(([dateLabel, items]) => (
              <div key={dateLabel} className="flex flex-col gap-4">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-[#1a1a1a] flex-1"></div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#555]">{dateLabel}</span>
                  <div className="h-px bg-[#1a1a1a] flex-1"></div>
                </div>

                <div className="flex flex-wrap gap-3">
                  {(items as any[]).map((item: any, idx: number) => {
                    const pt = (item.aspect_ratio || "16:9").split(":");
                    const w = parseFloat(pt[0]) || 16;
                    const h = parseFloat(pt[1]) || 9;
                    const ratio = Math.max(0.5, Math.min(w / h, 3));

                    return (
                      <div 
                        key={item.id ?? idx} 
                        className="bg-[#111] border border-[#222] rounded-lg overflow-hidden flex flex-col group relative"
                        style={{
                          flexGrow: ratio,
                          flexBasis: `${ratio * 120}px`,
                          maxWidth: '100%'
                        }}
                      >
                        <div 
                          className="bg-[#050505] relative flex items-center justify-center overflow-hidden"
                          style={{ aspectRatio: `${w}/${h}` }}
                        >
                          {item.isGenerating ? (
                            <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a]">
                              <Loader2 className="w-6 h-6 text-emerald-500 animate-spin mb-2" />
                              <span className="text-emerald-400 text-[10px] font-medium animate-pulse">Generating</span>
                            </div>
                          ) : item.isError ? (
                            <div className="flex flex-col items-center justify-center gap-2 px-4 text-center h-full w-full bg-red-950/10">
                              <AlertTriangle className="w-6 h-6 text-red-500/70 shrink-0" />
                              <p className="text-red-400 text-[10px] leading-relaxed line-clamp-3" title={item.errorMessage}>{item.errorMessage}</p>
                            </div>
                          ) : item.image_url ? (
                            <img src={item.image_url} alt="Generated Previz" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="text-[#333]"><MonitorPlay className="w-6 h-6" /></div>
                          )}

                          {/* Top Meta Badges overlaid on top */}
                          <div className="absolute top-0 left-0 right-0 p-2 flex flex-wrap gap-1 bg-gradient-to-b from-black/80 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            {((item.taggedCharacters?.length > 0) || (item.taggedLocations?.length > 0)) && (
                              <>
                                {item.taggedCharacters?.map((c: TaggedCharacter) => (
                                  <div key={`char-${c.id}`} className="flex flex-row items-center bg-black/50 backdrop-blur rounded pl-0.5 pr-1 py-0.5">
                                    {c.image_url ? <img src={c.image_url} alt={c.name} className="w-3 h-3 rounded-sm object-cover mr-1" /> : <User className="w-2.5 h-2.5 mr-0.5 text-emerald-500/60" />}
                                    <span className="text-[9px] text-emerald-400 font-medium">@{c.name.substring(0,6)}..</span>
                                  </div>
                                ))}
                                {item.taggedLocations?.map((l: TaggedLocation) => (
                                  <div key={`loc-${l.id}`} className="flex flex-row items-center bg-black/50 backdrop-blur rounded pl-0.5 pr-1 py-0.5">
                                    {l.image_url ? <img src={l.image_url} alt={l.name} className="w-3 h-3 rounded-sm object-cover mr-1" /> : <MapPin className="w-2.5 h-2.5 mr-0.5 text-sky-500/60" />}
                                    <span className="text-[9px] text-sky-400 font-medium">#{l.name.substring(0,6)}..</span>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Bottom Info area */}
                        <div className="p-2 flex flex-col border-t border-[#1a1a1a] h-[72px] flex-shrink-0">
                          <p className="text-[10px] text-[#ccc] line-clamp-2" title={item.description || item.prompt}>
                            {item.description || item.prompt}
                          </p>

                          <div className="flex flex-wrap gap-1 mt-auto overflow-hidden">
                            <span className="text-[8px] bg-[#1a1a1a] px-1 py-0.5 rounded text-[#888] font-mono whitespace-nowrap">
                              {item.aspect_ratio || "16:9"}
                            </span>
                            {item.shot_type && (
                              <span className="text-[8px] bg-[#1a1a1a] px-1 py-0.5 rounded text-[#888] truncate max-w-[80px]">
                                {item.shot_type}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  {/* Dummy element to prevent the last row from stretching heavily if incomplete */}
                  <div className="flex-grow-[10]"></div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Generator Active View */}
      {!showHistory && (
        <div ref={sessionContainerRef} className="flex-1 flex flex-col p-6 pb-[200px] overflow-y-auto scroll-smooth">
          {sessionGenerations.length > 0 ? (
            <div className="w-full max-w-5xl mx-auto flex flex-col gap-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {sessionGenerations.map((item, idx) => {
                  const pt = (item.aspect_ratio || "16:9").split(":");
                  const w = parseFloat(pt[0]) || 16;
                  const h = parseFloat(pt[1]) || 9;
                  
                  return (
                    <div key={item.id || idx} className="flex flex-col gap-3 fade-in">
                      <div className="relative w-full flex items-center justify-center bg-[#050505] border border-[#222] rounded-xl overflow-hidden shadow-2xl" style={{ aspectRatio: `${w}/${h}` }}>
                        {item.isGenerating ? (
                          <div className="flex flex-col items-center justify-center h-full w-full bg-[#0a0a0a]">
                            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-3" />
                            <span className="text-emerald-400 text-xs font-medium animate-pulse">Generating your vision...</span>
                          </div>
                        ) : item.isError ? (
                          <div className="flex flex-col items-center justify-center gap-3 px-6 text-center h-full w-full bg-red-950/10">
                            <AlertTriangle className="w-8 h-8 text-red-500/70 shrink-0" />
                            <p className="text-red-400 text-xs leading-relaxed">{item.errorMessage}</p>
                          </div>
                        ) : item.image_url ? (
                          <img src={item.image_url} alt="Generated Previz" className="w-full h-full object-contain" />
                        ) : null}
                      </div>
                      <div className="px-2">
                        <p className="text-[#888] text-sm leading-relaxed" title={item.prompt || item.description}>{item.prompt || item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center text-[#444] text-center max-w-md h-full mx-auto">
              <div className="w-20 h-20 rounded-2xl bg-[#111] border border-[#222] flex items-center justify-center mb-6 shadow-xl">
                <LayoutPanelTop className="w-8 h-8 text-emerald-500/50" />
              </div>
              <h2 className="text-lg text-white font-medium mb-2">Creative Space Generator</h2>
              <p className="text-sm">Describe your scene below to generate previsualizations.</p>
              <p className="text-xs mt-3 text-[#333]">
                Use <span className="text-emerald-600">@CharacterName</span> or{" "}
                <span className="text-sky-600">#LocationName</span> to inject reference images.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Floating bottom bar */}
      <div className="absolute bottom-0 left-0 right-0 pb-5 px-4 z-20 pointer-events-none">
        <div className="w-3/4 mx-auto bg-[#0d0d0d]/70 backdrop-blur-xl border border-[#ffffff08] rounded-2xl p-4 lg:p-5 shadow-[0_-4px_48px_rgba(0,0,0,0.8)] flex flex-col gap-3 pointer-events-auto">

          {/* Live tag chips */}
          {(taggedCharacters.length > 0 || taggedLocations.length > 0) && (
            <div className="flex flex-wrap gap-1.5 px-1">
              {taggedCharacters.map((c) => (
                <div key={`chip-char-${c.id}`} className="flex items-center gap-1.5 bg-emerald-950/50 border border-emerald-800/40 rounded-full pl-1 pr-1.5 py-0.5">
                  <div className="w-4 h-4 rounded-full overflow-hidden bg-[#1a1a1a]">
                    {c.image_url ? <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" /> : <User className="w-2.5 h-2.5 m-auto mt-0.5 text-emerald-500/60" />}
                  </div>
                  <span className="text-[10px] text-emerald-300 font-medium">@{c.name}</span>
                </div>
              ))}
              {taggedLocations.map((l) => (
                <div key={`chip-loc-${l.id}`} className="flex items-center gap-1.5 bg-sky-950/50 border border-sky-800/40 rounded-full pl-1 pr-1.5 py-0.5">
                  <div className="w-4 h-4 rounded-full overflow-hidden bg-[#1a1a1a]">
                    {l.image_url ? <img src={l.image_url} alt={l.name} className="w-full h-full object-cover" /> : <MapPin className="w-2.5 h-2.5 m-auto mt-0.5 text-sky-500/60" />}
                  </div>
                  <span className="text-[10px] text-sky-300 font-medium">#{l.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-3 items-end">
            <div className="flex-1 bg-[#111] border border-[#1e1e1e] rounded-xl p-2 focus-within:border-emerald-500/50 transition-colors flex items-center shadow-inner">
              <MentionInput
                value={prompt}
                onChange={setPrompt}
                characters={characters}
                locations={locations}
                disabled={isGenerating}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleGenerate(); }
                }}
              />
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !prompt.trim()}
                className="ml-2 p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white rounded-lg transition-colors flex items-center justify-center flex-shrink-0"
              >
                {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Parameters row */}
          <div className="flex flex-wrap gap-x-5 gap-y-2.5 items-center px-1">

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider whitespace-nowrap">Aspect Ratio</span>
              <select className={PARAM_SELECT_CLS} value={aspectRatio} onChange={(e) => setAspectRatio(e.target.value)}>
                {ASPECT_RATIOS.map((ar) => <option key={ar} value={ar}>{ar}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider whitespace-nowrap">Shot Type</span>
              <select className={PARAM_SELECT_CLS} value={shotType} onChange={(e) => setShotType(e.target.value)}>
                <option value="">— Any —</option>
                {SHOT_TYPES.map((st) => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider whitespace-nowrap">Camera Angle</span>
              <select className={PARAM_SELECT_CLS} value={cameraAngle} onChange={(e) => setCameraAngle(e.target.value)}>
                <option value="">— Any —</option>
                {CAMERA_ANGLES.map((ca) => <option key={ca} value={ca}>{ca}</option>)}
              </select>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-[10px] font-semibold text-[#555] uppercase tracking-wider whitespace-nowrap">Model</span>
              {imageModels.length === 0 ? (
                <div className="flex items-center gap-1.5 text-[#555] text-xs">
                  <Loader2 className="w-3 h-3 animate-spin" /> Loading...
                </div>
              ) : (
                <select
                  className={`${PARAM_SELECT_CLS} max-w-[280px]`}
                  value={selectedModelIdx >= 0 ? selectedModelIdx : 0}
                  onChange={handleModelChange}
                >
                  {imageModels.map((m, i) => (
                    <option key={i} value={i}>{m.model_name.split("/").pop()} · {m.credits_per_image} cr</option>
                  ))}
                </select>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
