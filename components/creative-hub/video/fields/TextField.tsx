// STO-1854 — Single-line text widget.
import { VideoParamSpec } from "@/types/video";
import FieldShell from "./FieldShell";

interface TextFieldProps {
  spec: VideoParamSpec;
  value: string | undefined;
  onChange: (value: string) => void;
  label: string;
}

export default function TextField({ spec, value, onChange, label }: TextFieldProps) {
  return (
    <FieldShell label={label} htmlFor={`v-${spec.name}`} help={spec.help} required={spec.required === true}>
      <input
        id={`v-${spec.name}`}
        type="text"
        value={value ?? ""}
        placeholder={typeof spec.default === "string" ? spec.default : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)] px-2 py-1.5 outline-none focus:border-emerald-500/40 transition-colors"
      />
    </FieldShell>
  );
}
