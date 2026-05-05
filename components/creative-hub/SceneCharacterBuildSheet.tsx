"use client";

import { useEffect, useMemo, useState } from "react";
import { Scissors, Palette, Eye, Droplet, Heart, Sparkles, FileText, Save, Loader2, Wand2 } from "lucide-react";

/**
 * Structured "build sheet" form for the Character Artist's workflow.
 * Splits the SceneCharacter.notes blob into labelled categories so the
 * artist can specify hair, makeup, skin condition, physical state, and
 * accessories independently. The composed string fed to the AI prompt
 * stays human-readable (one CATEGORY: value line each) so it slots
 * cleanly into the existing `appearance_notes` placeholder shipped in
 * STO-1057. Free-form notes that don't match a known prefix land in
 * the OTHER bucket.
 */

const FIELD_KEYS = ["HAIR", "LIPS", "EYES", "SKIN", "PHYSICAL", "ACCESSORIES", "OTHER"] as const;

type FieldKey = (typeof FIELD_KEYS)[number];

type BuildSheetState = Record<FieldKey, string>;

const EMPTY: BuildSheetState = {
    HAIR: "",
    LIPS: "",
    EYES: "",
    SKIN: "",
    PHYSICAL: "",
    ACCESSORIES: "",
    OTHER: "",
};

const PRESETS: Record<FieldKey, string[]> = {
    HAIR: ["wet", "tousled", "slicked back", "braided", "ponytail", "messy", "windswept"],
    LIPS: ["nude", "rose pink", "dark red lipstick", "glossy", "chapped", "bloodied"],
    EYES: ["smoky shadow", "smudged liner", "tired / dark circles", "tear-streaked", "bloodshot"],
    SKIN: ["clean", "dust on face", "sweat-glazed", "scratch on left cheek", "bruised jaw", "wet"],
    PHYSICAL: ["exhausted", "alert", "slumped shoulders", "tense", "joyful", "wounded"],
    ACCESSORIES: ["silver chain", "leather wristband", "wire-rim glasses", "wedding ring", "no jewellery"],
    OTHER: [],
};

const META: Record<FieldKey, { label: string; placeholder: string; icon: React.ComponentType<{ className?: string }> }> = {
    HAIR: { label: "Hair", placeholder: "colour · style · condition", icon: Scissors },
    LIPS: { label: "Lips", placeholder: "lipstick / gloss / chapped", icon: Palette },
    EYES: { label: "Eyes", placeholder: "shadow / liner / lashes / state", icon: Eye },
    SKIN: { label: "Skin", placeholder: "foundation tweak · dirt · scars · sweat", icon: Droplet },
    PHYSICAL: { label: "Physical state", placeholder: "energy · posture · mood", icon: Heart },
    ACCESSORIES: { label: "Accessories", placeholder: "jewellery · glasses · hat · prop", icon: Sparkles },
    OTHER: { label: "Other notes", placeholder: "anything else the AI should know", icon: FileText },
};

export function parseBuildSheet(notes: string | null | undefined): BuildSheetState {
    const state: BuildSheetState = { ...EMPTY };
    if (!notes) return state;
    const otherLines: string[] = [];
    for (const rawLine of notes.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line) continue;
        const m = line.match(/^([A-Z_]+):\s*(.*)$/);
        if (m && (FIELD_KEYS as readonly string[]).includes(m[1])) {
            state[m[1] as FieldKey] = m[2].trim();
        } else {
            otherLines.push(line);
        }
    }
    if (otherLines.length) {
        state.OTHER = state.OTHER ? `${state.OTHER}\n${otherLines.join("\n")}` : otherLines.join("\n");
    }
    return state;
}

export function composeBuildSheet(state: BuildSheetState): string {
    const out: string[] = [];
    for (const key of FIELD_KEYS) {
        const v = state[key].trim();
        if (v) out.push(`${key}: ${v}`);
    }
    return out.join("\n");
}

interface SceneCharacterBuildSheetProps {
    initialNotes: string | null | undefined;
    onSave: (composedNotes: string) => Promise<void>;
    /**
     * Optional "Save & Generate" handler. When provided, the sheet renders a
     * second action that auto-saves the current composed prompt and kicks off
     * generation atomically — eliminating the stale-notes risk where the artist
     * tweaks the sheet, forgets to save, then hits Generate from outside.
     */
    onGenerate?: (composedNotes: string) => void | Promise<void>;
    saving?: boolean;
    generating?: boolean;
}

export default function SceneCharacterBuildSheet({
    initialNotes,
    onSave,
    onGenerate,
    saving = false,
    generating = false,
}: SceneCharacterBuildSheetProps) {
    const initial = useMemo(() => parseBuildSheet(initialNotes), [initialNotes]);
    const [state, setState] = useState<BuildSheetState>(initial);

    // Re-sync if the parent reloads scene character data.
    useEffect(() => {
        setState(parseBuildSheet(initialNotes));
    }, [initialNotes]);

    const composed = composeBuildSheet(state);
    const initialComposed = composeBuildSheet(initial);
    const dirty = composed !== initialComposed;

    const setField = (k: FieldKey, v: string) =>
        setState((prev) => ({ ...prev, [k]: v }));

    // True when `preset` is already present as its own comma-delimited token
    // in the current field. We split on commas (the same delimiter we insert
    // when appending) and trim — substring matching would false-positive on
    // things like "wet" vs "sweat-glazed".
    const presetActive = (k: FieldKey, preset: string) => {
        const tokens = state[k].split(",").map((t) => t.trim().toLowerCase());
        return tokens.includes(preset.toLowerCase());
    };

    const togglePreset = (k: FieldKey, preset: string) =>
        setState((prev) => {
            const cur = prev[k].trim();
            const tokens = cur ? cur.split(",").map((t) => t.trim()) : [];
            const lower = preset.toLowerCase();
            const idx = tokens.findIndex((t) => t.toLowerCase() === lower);
            if (idx >= 0) {
                tokens.splice(idx, 1);
            } else {
                tokens.push(preset);
            }
            return { ...prev, [k]: tokens.filter(Boolean).join(", ") };
        });

    const handleSubmit = async () => {
        await onSave(composed);
    };

    const handleSaveAndGenerate = async () => {
        if (!onGenerate) return;
        await onGenerate(composed);
    };

    return (
        <div className="bg-[var(--surface-raised)] rounded-xl border border-[var(--border)] overflow-hidden">
            <div className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-bold text-[var(--text-primary)] tracking-wide">
                        Build Sheet
                    </h3>
                    <p className="text-[9px] text-[var(--text-muted)] mt-0.5">
                        Specify the scene-specific look. Each line drives the AI prompt.
                    </p>
                </div>
                <div className="flex items-center gap-1.5">
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!dirty || saving || generating}
                        className="text-[10px] font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 bg-[var(--surface)] hover:bg-[var(--surface-hover)] text-[var(--text-secondary)] border border-[var(--border)] disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                        {saving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                            <Save className="h-3 w-3" />
                        )}
                        Save sheet
                    </button>
                    {onGenerate && (
                        <button
                            type="button"
                            onClick={handleSaveAndGenerate}
                            disabled={saving || generating}
                            title="Save the sheet and run AI generation in one step — uses the composed prompt above"
                            className="text-[10px] font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            {generating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Wand2 className="h-3 w-3" />
                            )}
                            Save & Generate
                        </button>
                    )}
                </div>
            </div>

            {/* Stylist-sheet 2-column layout — pair related fields so the
                 artist can scan the look at a glance instead of scrolling
                 through a single long stack. OTHER spans both columns. */}
            <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3">
                {FIELD_KEYS.map((key) => {
                    const meta = META[key];
                    const Icon = meta.icon;
                    const presets = PRESETS[key];
                    const value = state[key];
                    const isOther = key === "OTHER";
                    return (
                        <div
                            key={key}
                            className={`bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3 space-y-2 ${
                                isOther ? "md:col-span-2" : ""
                            }`}
                        >
                            <div className="flex items-center gap-2">
                                <Icon className="h-3.5 w-3.5 text-emerald-500" />
                                <label className="text-[10px] font-bold text-[var(--text-primary)] uppercase tracking-widest">
                                    {meta.label}
                                </label>
                            </div>
                            <textarea
                                value={value}
                                onChange={(e) => setField(key, e.target.value)}
                                placeholder={meta.placeholder}
                                rows={isOther ? 3 : 2}
                                className="w-full bg-[var(--surface-raised)] border border-[var(--border)] rounded-md px-3 py-2 text-xs text-[var(--text-secondary)] leading-relaxed focus:outline-none focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20 transition-colors resize-none placeholder:text-[var(--text-muted)]"
                            />
                            {presets.length > 0 && (
                                <div className="flex flex-wrap gap-1.5">
                                    {presets.map((preset) => {
                                        const active = presetActive(key, preset);
                                        return (
                                            <button
                                                key={preset}
                                                type="button"
                                                onClick={() => togglePreset(key, preset)}
                                                title={
                                                    active
                                                        ? `Remove "${preset}"`
                                                        : `Add "${preset}"`
                                                }
                                                aria-pressed={active}
                                                className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/30 ${
                                                    active
                                                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/50 hover:bg-emerald-500/25"
                                                        : "bg-[var(--surface-raised)] hover:bg-[var(--surface-hover)] text-[var(--text-muted)] hover:text-emerald-400 border-[var(--border)] hover:border-emerald-500/40"
                                                }`}
                                            >
                                                {active ? "✓" : "+"} {preset}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Live preview of the composed prompt — gives the artist confidence
                 in what's about to be sent to the model. */}
            <div className="bg-[var(--surface)] px-4 py-3 border-t border-[var(--border)]">
                <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mb-1.5">
                    Composed prompt
                </p>
                {composed ? (
                    <pre className="text-[10px] text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed font-mono">
                        {composed}
                    </pre>
                ) : (
                    <p className="text-[10px] text-[var(--text-muted)] italic">
                        Sheet is empty — fill any section above to preview.
                    </p>
                )}
            </div>
        </div>
    );
}
