// STO-1854 — Shared label/help wrapper for video form fields.
import React from "react";

interface FieldShellProps {
  label: string;
  htmlFor?: string;
  help?: string;
  required?: boolean;
  /** Inline (label + control on one row) vs stacked. */
  inline?: boolean;
  children: React.ReactNode;
}

export default function FieldShell({
  label,
  htmlFor,
  help,
  required,
  inline,
  children,
}: FieldShellProps) {
  return (
    <div className={inline ? "flex items-center justify-between gap-3" : "flex flex-col gap-1"}>
      <label
        htmlFor={htmlFor}
        className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wider"
      >
        {label}
        {required ? <span className="text-emerald-500 ml-0.5">*</span> : null}
      </label>
      <div className={inline ? "" : "w-full"}>{children}</div>
      {help && !inline ? (
        <p className="text-[10px] text-[var(--text-muted)] leading-snug">{help}</p>
      ) : null}
    </div>
  );
}
