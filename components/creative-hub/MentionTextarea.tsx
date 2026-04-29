"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { User } from "lucide-react";

export interface TaggedCharacter {
  id: number;
  type: "scene_character" | "global_character";
  character_id: number;
  name: string;
  image_url?: string;
}

export interface SceneCharacterItem {
  id: number;
  character_id: number;
  character_name: string;
  image_url?: string;
  character_image_url?: string;
}

export interface GlobalCharacterItem {
  id: number;
  name: string;
  image_url?: string;
}

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onTagsChange?: (tags: TaggedCharacter[]) => void;
  onBlur?: React.FocusEventHandler<HTMLTextAreaElement>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  rows?: number;
  sceneCharacters?: SceneCharacterItem[];
  globalCharacters?: GlobalCharacterItem[];
  style?: React.CSSProperties;
}

function getTaggedCharactersFromText(
  text: string,
  sceneCharacters: SceneCharacterItem[],
  globalCharacters: GlobalCharacterItem[]
): TaggedCharacter[] {
  const tagged: TaggedCharacter[] = [];
  
  // Collect all known names, longest first
  const sceneNames = sceneCharacters.map((c) => c.character_name);
  const globalNames = globalCharacters.map((c) => c.name);
  const allNames = [...sceneNames, ...globalNames].sort((a, b) => b.length - a.length);

  if (allNames.length === 0) return tagged;

  // Build exact match pattern: @(Name1|Name2)
  const escaped = allNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`@(${escaped.join("|")})`, "gi");

  const seen = new Set<string>();
  let match;

  while ((match = pattern.exec(text)) !== null) {
    const name = match[1]; // no trim needed, matched exactly
    if (seen.has(name.toLowerCase())) continue;

    const sc = sceneCharacters.find(
      (c) => c.character_name.toLowerCase() === name.toLowerCase()
    );
    if (sc) {
      seen.add(name.toLowerCase());
      tagged.push({
        id: sc.id,
        type: "scene_character",
        character_id: sc.character_id,
        name: sc.character_name,
        image_url: sc.image_url || sc.character_image_url,
      });
      continue;
    }

    const gc = globalCharacters.find(
      (c) => c.name.toLowerCase() === name.toLowerCase()
    );
    if (gc) {
      seen.add(name.toLowerCase());
      tagged.push({
        id: gc.id,
        type: "global_character",
        character_id: gc.id,
        name: gc.name,
        image_url: gc.image_url,
      });
    }
  }

  return tagged;
}

/**
 * Build an array of {text, color} segments for the highlight backdrop.
 *
 * Instead of a greedy [\w\s]* regex (which would consume all text after an
 * @tag), we build a regex alternation from the *actual* known character names.
 * Only exact @Name matches are colored; everything else is plain text.
 *
 * Colors: scene chars → emerald-400, global chars → green-500.
 */
function buildHighlightedSegments(
  text: string,
  sceneCharacters: SceneCharacterItem[],
  globalCharacters: GlobalCharacterItem[]
): Array<{ text: string; color: string; fontWeight: string }> {
  const segments: Array<{ text: string; color: string; fontWeight: string }> = [];

  // Collect all known names, longest first so longer names take priority
  const sceneNames = sceneCharacters.map((c) => c.character_name);
  const globalNames = globalCharacters.map((c) => c.name);
  const allNames = [...sceneNames, ...globalNames].sort((a, b) => b.length - a.length);

  if (allNames.length === 0) {
    segments.push({ text, color: "inherit", fontWeight: "normal" });
    return segments;
  }

  // Escape names for regex and build alternation: @(Name1|Name2|...)
  const escaped = allNames.map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`@(${escaped.join("|")})`, "gi");

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    // Plain text before this mention
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index), color: "inherit", fontWeight: "normal" });
    }

    const raw = match[0]; // the full match, e.g. "@John Smith"
    const name = match[1]; // captured name

    const isScene = sceneCharacters.some(
      (c) => c.character_name.toLowerCase() === name.toLowerCase()
    );

    segments.push({
      text: raw,
      color: isScene ? "var(--accent)" : "#22c55e", // emerald-400 vs green-500
      fontWeight: "normal",
    });

    lastIndex = match.index + raw.length;
  }

  // Trailing plain text
  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex), color: "inherit", fontWeight: "normal" });
  }

  return segments;
}

export default function MentionTextarea({
  value,
  onChange,
  onTagsChange,
  onBlur,
  placeholder,
  disabled,
  className,
  rows = 3,
  sceneCharacters = [],
  globalCharacters = [],
  style,
}: MentionTextareaProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionStart, setMentionStart] = useState<number | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [selectedIdx, setSelectedIdx] = useState(0);

  // Build merged options list
  const sceneCharIds = new Set(sceneCharacters.map((sc) => sc.character_id));

  const filteredScene = sceneCharacters.filter((sc) =>
    sc.character_name.toLowerCase().includes(mentionQuery.toLowerCase())
  );
  const filteredGlobal = globalCharacters.filter(
    (gc) =>
      !sceneCharIds.has(gc.id) &&
      gc.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  type DropdownItem =
    | { kind: "scene"; item: SceneCharacterItem }
    | { kind: "global"; item: GlobalCharacterItem };

  const dropdownItems: DropdownItem[] = [
    ...filteredScene.map((item) => ({ kind: "scene" as const, item })),
    ...filteredGlobal.map((item) => ({ kind: "global" as const, item })),
  ];

  const segments = buildHighlightedSegments(value, sceneCharacters, globalCharacters);

  // Notify parent of tag changes
  const notifyTags = useCallback(
    (text: string) => {
      if (!onTagsChange) return;
      const tags = getTaggedCharactersFromText(text, sceneCharacters, globalCharacters);
      onTagsChange(tags);
    },
    [onTagsChange, sceneCharacters, globalCharacters]
  );

  // Sync backdrop scroll with textarea scroll
  const syncScroll = useCallback(() => {
    if (textareaRef.current && backdropRef.current) {
      backdropRef.current.scrollTop = textareaRef.current.scrollTop;
      backdropRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  }, []);

  const positionDropdown = useCallback((textarea: HTMLTextAreaElement) => {
    const rect = textarea.getBoundingClientRect();
    setDropdownPos({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, 256),
    });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    onChange(newVal);
    notifyTags(newVal);
    syncScroll();

    const cursor = e.target.selectionStart ?? 0;
    const textUpToCursor = newVal.slice(0, cursor);
    const lastAt = textUpToCursor.lastIndexOf("@");

    if (lastAt !== -1) {
      const fragment = textUpToCursor.slice(lastAt + 1);
      if (!fragment.includes(" ") || fragment === "") {
        setMentionQuery(fragment);
        setMentionStart(lastAt);
        setShowDropdown(true);
        setSelectedIdx(0);
        positionDropdown(e.target);
        return;
      }
    }

    setShowDropdown(false);
    setMentionStart(null);
  };

  const insertMention = (name: string) => {
    if (mentionStart === null) return;
    const before = value.slice(0, mentionStart);
    const after = value.slice(mentionStart + 1 + mentionQuery.length);
    const newVal = `${before}@${name} ${after}`;
    onChange(newVal);
    notifyTags(newVal);
    setShowDropdown(false);
    setMentionStart(null);
    setTimeout(() => {
      if (textareaRef.current) {
        const pos = before.length + name.length + 2;
        textareaRef.current.setSelectionRange(pos, pos);
        textareaRef.current.focus();
        // Re-sync backdrop so highlight aligns with cursor after insert
        syncScroll();
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showDropdown || dropdownItems.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.min(prev + 1, dropdownItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" || e.key === "Tab") {
      const selected = dropdownItems[selectedIdx];
      if (selected) {
        e.preventDefault();
        const name =
          selected.kind === "scene"
            ? selected.item.character_name
            : selected.item.name;
        insertMention(name);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        textareaRef.current &&
        !textareaRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Re-notify tags when characters lists change
  useEffect(() => {
    notifyTags(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneCharacters.length, globalCharacters.length]);

  // Keep fixed dropdown in sync on scroll
  useEffect(() => {
    if (!showDropdown) return;
    const onScroll = () => {
      if (textareaRef.current) positionDropdown(textareaRef.current);
    };
    window.addEventListener("scroll", onScroll, true);
    return () => window.removeEventListener("scroll", onScroll, true);
  }, [showDropdown, positionDropdown]);

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
    <div ref={containerRef} className="relative block w-full">
      <div
        ref={backdropRef}
        aria-hidden="true"
        className={className}
        style={{
          ...style,
          ...commonStyles,
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflowY: "auto",
          overflowX: "hidden",
          color: disabled ? "#555" : "#999",
          zIndex: 0,
        }}
      >
        {segments.map((seg, i) => (
          <span
            key={i}
            style={{
              color: seg.color === "inherit" ? undefined : seg.color,
              fontWeight: seg.fontWeight,
            }}
          >
            {seg.text}
          </span>
        ))}
        {/* trailing newline to ensure last-line height matches textarea */}
        {"\n"}
      </div>

      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onScroll={syncScroll}
        onBlur={onBlur}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={className}
        style={{
          ...style,
          ...commonStyles,
          position: "relative",
          zIndex: 1,
          color: "transparent",
          caretColor: disabled ? "transparent" : "white",
          background: "transparent",
          display: "block",
          width: "100%",
        }}
      />

      {showDropdown && dropdownItems.length > 0 && (
        <div
          ref={dropdownRef}
          className="fixed z-[9999] bg-[#141414] border border-[#2a2a2a] rounded-md shadow-2xl overflow-hidden"
          style={{ top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width }}
        >
          {filteredScene.length > 0 && (
            <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] border-b border-[#1f1f1f]">
              This Scene
            </div>
          )}
          {filteredScene.map((sc, i) => {
            const idx = i;
            const imageUrl = sc.image_url || sc.character_image_url;
            return (
              <button
                key={`sc-${sc.id}`}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(sc.character_name); }}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  selectedIdx === idx ? "bg-emerald-500/10" : "hover:bg-[var(--surface-hover)]"
                }`}
              >
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-[#1f1f1f] border border-emerald-500/20">
                  {imageUrl ? (
                    <img src={imageUrl} alt={sc.character_name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3 h-3 m-auto mt-1.5 text-emerald-500/60" />
                  )}
                </div>
                <span className="text-xs text-emerald-400">{sc.character_name}</span>
                <span className="ml-auto text-[9px] text-emerald-600/60 font-mono">SC</span>
              </button>
            );
          })}

          {filteredGlobal.length > 0 && (
            <div className="px-3 py-1.5 text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)] border-t border-[#1f1f1f] border-b">
              Script Characters
            </div>
          )}
          {filteredGlobal.map((gc, i) => {
            const idx = filteredScene.length + i;
            return (
              <button
                key={`gc-${gc.id}`}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); insertMention(gc.name); }}
                onMouseEnter={() => setSelectedIdx(idx)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left transition-colors ${
                  selectedIdx === idx ? "bg-green-900/20" : "hover:bg-[var(--surface-hover)]"
                }`}
              >
                <div className="w-6 h-6 rounded-full overflow-hidden flex-shrink-0 bg-[#1f1f1f] border border-green-700/20">
                  {gc.image_url ? (
                    <img src={gc.image_url} alt={gc.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3 h-3 m-auto mt-1.5 text-green-600/60" />
                  )}
                </div>
                <span className="text-xs text-green-500">{gc.name}</span>
                <span className="ml-auto text-[9px] text-green-700/60 font-mono">GLB</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
