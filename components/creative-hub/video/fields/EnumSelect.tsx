// STO-1854 — Enum widget (themed <select>) rendered from a spec's `options`.
import { VideoParamSpec } from "@/types/video";
import FieldShell from "./FieldShell";

const SELECT_CLS =
  "w-full bg-[var(--surface)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)] px-2 py-1.5 outline-none focus:border-emerald-500/40 transition-colors cursor-pointer";

interface EnumSelectProps {
  spec: VideoParamSpec;
  value: string | number | undefined;
  onChange: (value: string | number) => void;
  label: string;
}

export default function EnumSelect({ spec, value, onChange, label }: EnumSelectProps) {
  const options = spec.options ?? [];
  const required = spec.required === true;
  // Detect numeric enums so we round-trip the value's type to the payload.
  const numeric = options.every((o) => typeof o === "number");
  return (
    <FieldShell label={label} htmlFor={`v-${spec.name}`} help={spec.help} required={required}>
      <select
        id={`v-${spec.name}`}
        className={SELECT_CLS}
        value={value === undefined || value === null ? "" : String(value)}
        onChange={(e) => onChange(numeric ? Number(e.target.value) : e.target.value)}
      >
        {!required && <option value="">— none —</option>}
        {options.map((opt) => (
          <option key={String(opt)} value={String(opt)}>
            {String(opt)}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}
