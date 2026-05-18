"use client";

import { useState } from "react";
import { Loader2, XCircle, X } from "lucide-react";

interface CancelDialogProps {
  open: boolean;
  onClose: () => void;
  /**
   * Confirms cancellation. Receives the optional free-text reason captured
   * in the textarea. Returns a promise so the dialog can show a spinner
   * until the request lands.
   */
  onConfirm: (reason: string) => Promise<void> | void;
  submitting?: boolean;
}

/**
 * Shared confirmation gate for `POST .../cancel/`. Used from both
 * `<StatusBanner>` (in-flight Cancel button) and `<StalledBanner>` (the
 * "Cancel analysis" escape hatch for stuck runs).
 *
 * Per Plan §8.10, credits already consumed are NOT refunded — the copy
 * makes that explicit so the user understands the trade-off before
 * confirming. The reason field is optional and sent in the request body.
 */
export default function CancelDialog({
  open,
  onClose,
  onConfirm,
  submitting,
}: CancelDialogProps) {
  if (!open) return null;
  return <CancelDialogBody onClose={onClose} onConfirm={onConfirm} submitting={submitting} />;
}

// Inner component so the reason state is freshly mounted (and therefore
// reset) every time the dialog opens — avoids using `useEffect` to clear
// state, which would trip the `react-hooks/set-state-in-effect` rule.
function CancelDialogBody({
  onClose,
  onConfirm,
  submitting,
}: {
  onClose: () => void;
  onConfirm: (reason: string) => Promise<void> | void;
  submitting?: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="cancel-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <XCircle size={16} className="text-red-500" />
            <h2
              id="cancel-dialog-title"
              className="text-sm font-semibold text-[var(--text-primary)]"
            >
              Cancel analysis?
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
            Credits already consumed{" "}
            <span className="font-semibold text-[var(--text-primary)]">
              cannot be refunded
            </span>
            . The analysis will be marked{" "}
            <span className="font-mono text-[11px] uppercase">cancelled</span>{" "}
            and you&apos;ll need to start a new one.
          </p>
          <label className="block">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Reason (optional)
            </span>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="e.g. Wrong script uploaded, will retry"
              className="mt-1 w-full resize-none rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-emerald-500/60 focus:outline-none"
              maxLength={500}
              disabled={submitting}
            />
          </label>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
          >
            Keep running
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason)}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60"
          >
            {submitting ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <XCircle size={12} />
            )}
            Cancel analysis
          </button>
        </footer>
      </div>
    </div>
  );
}
