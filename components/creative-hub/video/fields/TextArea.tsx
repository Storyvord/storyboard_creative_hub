// STO-1854 — Multi-line text widget (negative_prompt, free-text prompts).
import { VideoParamSpec } from "@/types/video";
import FieldShell from "./FieldShell";

interface TextAreaProps {
  spec: VideoParamSpec;
  value: string | undefined;
  onChange: (value: string) => void;
  label: string;
}

export default function TextArea({ spec, value, onChange, label }: TextAreaProps) {
  return (
    <FieldShell label={label} htmlFor={`v-${spec.name}`} help={spec.help} required={spec.required === true}>
      <textarea
        id={`v-${spec.name}`}
        rows={3}
        value={value ?? ""}
        placeholder={typeof spec.default === "string" ? spec.default : undefined}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-[var(--surface)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)] px-2 py-1.5 outline-none focus:border-emerald-500/40 transition-colors resize-none"
      />
    </FieldShell>
  );
}
