// STO-1854 — Themed boolean toggle (new widget).
import { cn } from "@/lib/utils";

interface BoolToggleProps {
  label: string;
  help?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export default function BoolToggle({ label, help, value, onChange, disabled }: BoolToggleProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex flex-col">
        <span className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider">
          {label}
        </span>
        {help ? <span className="text-[10px] text-[var(--text-muted)] leading-snug">{help}</span> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={cn(
          "relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors outline-none",
          value ? "bg-emerald-600" : "bg-[var(--surface-hover)] border border-[var(--border)]",
          disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer",
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
            value ? "translate-x-4" : "translate-x-1",
          )}
        />
      </button>
    </div>
  );
}
