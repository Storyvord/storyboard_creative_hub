// STO-1854 — Themed HTML5 range slider (new widget) for int/float params with
// min/max. Falls back to a number input when bounds are absent.
import { VideoParamSpec } from "@/types/video";
import FieldShell from "./FieldShell";

interface NumberSliderProps {
  spec: VideoParamSpec;
  value: number | undefined;
  onChange: (value: number) => void;
  label: string;
}

export default function NumberSlider({ spec, value, onChange, label }: NumberSliderProps) {
  const hasBounds = typeof spec.min === "number" && typeof spec.max === "number";
  const isFloat = spec.type === "float";
  const step = isFloat ? 0.05 : 1;
  const current =
    value ?? (typeof spec.default === "number" ? spec.default : (spec.min ?? 0));

  if (!hasBounds) {
    return (
      <FieldShell label={label} htmlFor={`v-${spec.name}`} help={spec.help} required={spec.required === true}>
        <input
          id={`v-${spec.name}`}
          type="number"
          step={step}
          value={value ?? ""}
          onChange={(e) => onChange(isFloat ? parseFloat(e.target.value) : parseInt(e.target.value, 10))}
          className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)] px-2 py-1.5 outline-none focus:border-emerald-500/40 transition-colors"
        />
      </FieldShell>
    );
  }

  return (
    <FieldShell label={label} htmlFor={`v-${spec.name}`} help={spec.help} required={spec.required === true}>
      <div className="flex items-center gap-3">
        <input
          id={`v-${spec.name}`}
          type="range"
          min={spec.min}
          max={spec.max}
          step={step}
          value={current}
          onChange={(e) => onChange(isFloat ? parseFloat(e.target.value) : parseInt(e.target.value, 10))}
          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer bg-[var(--surface-hover)] accent-emerald-500"
        />
        <span className="text-xs font-mono text-[var(--text-primary)] tabular-nums w-12 text-right">
          {isFloat ? current.toFixed(2) : current}
        </span>
      </div>
    </FieldShell>
  );
}
