// STO-1854 — Seed widget: an integer input with a randomize button. Empty seed
// is omitted from the payload (provider picks one). Seedance returns the used
// seed in provider_meta for reproducibility.
import { Dice5 } from "lucide-react";
import { VideoParamSpec } from "@/types/video";
import FieldShell from "./FieldShell";

interface SeedFieldProps {
  spec: VideoParamSpec;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
  label: string;
}

export default function SeedField({ spec, value, onChange, label }: SeedFieldProps) {
  return (
    <FieldShell label={label} htmlFor={`v-${spec.name}`} help={spec.help} required={spec.required === true}>
      <div className="flex items-center gap-2">
        <input
          id={`v-${spec.name}`}
          type="number"
          value={value ?? ""}
          placeholder="random"
          onChange={(e) => {
            const v = e.target.value;
            onChange(v === "" ? undefined : parseInt(v, 10));
          }}
          className="flex-1 bg-[var(--surface)] border border-[var(--border)] rounded-md text-xs text-[var(--text-primary)] px-2 py-1.5 outline-none focus:border-emerald-500/40 transition-colors"
        />
        <button
          type="button"
          title="Randomize seed"
          onClick={() => onChange(Math.floor(Math.random() * 2_147_483_647))}
          className="p-2 bg-[var(--surface-hover)] hover:bg-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] rounded-md transition-colors"
        >
          <Dice5 className="w-4 h-4" />
        </button>
      </div>
    </FieldShell>
  );
}
