"use client";

import { useState } from "react";
import { Loader2, Lock, X } from "lucide-react";

interface FinalizeDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
  submitting?: boolean;
}

/**
 * Confirmation gate for `POST finalize/`. Once finalized the analysis is
 * read-only and the compliance report + signed PDF are generated. Requires
 * an explicit checkbox tick so a misclick doesn't lock the artifact.
 */
export default function FinalizeDialog({
  open,
  onClose,
  onConfirm,
  submitting,
}: FinalizeDialogProps) {
  const [confirmed, setConfirmed] = useState(false);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <Lock size={16} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Finalize analysis
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </header>

        <div className="space-y-3 px-4 py-4 text-sm text-[var(--text-secondary)]">
          <p>
            Finalizing will <span className="font-semibold text-[var(--text-primary)]">lock</span>{" "}
            this analysis — score, findings, and mitigations become read-only — and trigger
            compliance report generation plus signed PDF rendering.
          </p>
          <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-[11px] text-amber-500">
            Subsequent edits require a new analysis run. The signed PDF is an immutable
            underwriter artifact.
          </p>
          <label className="flex items-start gap-2 text-xs text-[var(--text-secondary)]">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              I understand this analysis will be locked and a compliance report will be
              generated.
            </span>
          </label>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={!confirmed || submitting}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={12} className="animate-spin" /> : <Lock size={12} />}
            Finalize & generate report
          </button>
        </footer>
      </div>
    </div>
  );
}
