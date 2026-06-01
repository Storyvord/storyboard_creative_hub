// STO-1854 — Kling multi_prompt editor: a repeatable list of {prompt, duration}
// shots. Rendered when a `list` param declares an `item_schema` with prompt +
// duration sub-fields. Mutually exclusive with the top-level `prompt` (enforced
// by the constraints engine).
import { Plus, Trash2 } from "lucide-react";
import { VideoParamSpec } from "@/types/video";
import FieldShell from "./FieldShell";

export interface ShotRow {
  prompt: string;
  duration: number | string;
}

interface MultiPromptShotEditorProps {
  spec: VideoParamSpec;
  value: ShotRow[] | undefined;
  onChange: (value: ShotRow[]) => void;
  label: string;
}

export default function MultiPromptShotEditor({
  spec,
  value,
  onChange,
  label,
}: MultiPromptShotEditorProps) {
  const rows = value ?? [];
  // Derive the duration sub-field's options from the item_schema so the FE
  // never hardcodes the 1–15 range.
  const durationSpec = spec.item_schema?.find((s) => s.name === "duration");
  const durationOptions = durationSpec?.options ?? [];
  const defaultDuration =
    (durationSpec?.default as number | string | undefined) ??
    (durationOptions[0] as number | string | undefined) ??
    5;

  const update = (idx: number, patch: Partial<ShotRow>) => {
    onChange(rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };
  const addRow = () => onChange([...rows, { prompt: "", duration: defaultDuration }]);
  const removeRow = (idx: number) => onChange(rows.filter((_, i) => i !== idx));

  const maxRows = spec.max;

  return (
    <FieldShell label={label} help={spec.help} required={spec.required === true}>
      <div className="flex flex-col gap-2">
        {rows.length === 0 && (
          <p className="text-[10px] text-[var(--text-muted)] italic">
            No shots yet — add one or use the single prompt above.
          </p>
        )}
        {rows.map((row, idx) => (
          <div
            key={idx}
            className="flex flex-col gap-1.5 p-2 rounded-md border border-[var(--border)] bg-[var(--surface)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--text-muted)]">
                Shot {idx + 1}
              </span>
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="p-1 rounded text-[var(--text-muted)] hover:text-red-400 transition-colors"
                aria-label={`Remove shot ${idx + 1}`}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <textarea
              rows={2}
              value={row.prompt}
              onChange={(e) => update(idx, { prompt: e.target.value })}
              placeholder="Describe this shot…"
              className="w-full bg-[var(--background)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)] px-2 py-1.5 outline-none focus:border-emerald-500/40 transition-colors resize-none"
            />
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-wider text-[var(--text-muted)]">
                Duration (s)
              </span>
              {durationOptions.length > 0 ? (
                <select
                  value={String(row.duration)}
                  onChange={(e) =>
                    update(idx, {
                      duration: typeof durationOptions[0] === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                    })
                  }
                  className="bg-[var(--background)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)] px-2 py-1 outline-none focus:border-emerald-500/40"
                >
                  {durationOptions.map((o) => (
                    <option key={String(o)} value={String(o)}>
                      {String(o)}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  value={row.duration}
                  onChange={(e) => update(idx, { duration: Number(e.target.value) })}
                  className="w-20 bg-[var(--background)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)] px-2 py-1 outline-none focus:border-emerald-500/40"
                />
              )}
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={addRow}
          disabled={typeof maxRows === "number" && rows.length >= maxRows}
          className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md border border-dashed border-[var(--border-hover)] text-[11px] text-[var(--text-secondary)] hover:text-emerald-400 hover:border-emerald-500/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" /> Add shot
          {typeof maxRows === "number" ? ` (${rows.length}/${maxRows})` : ""}
        </button>
      </div>
    </FieldShell>
  );
}
