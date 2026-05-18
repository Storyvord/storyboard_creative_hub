"use client";

import { AlertTriangle, ExternalLink, PauseCircle, PlayCircle, RefreshCw, XCircle } from "lucide-react";
import { clsx } from "clsx";

/**
 * Yellow/amber banner that overlays the regular `<StatusBanner>` when a
 * polled analysis has shown no observable progress for the stall window
 * (server-hinted via `is_stalled`, or client-detected after 2 min).
 *
 * The banner gives the user three escape hatches:
 *   1. Force a manual `refresh()` poll. The backend's `GET /status/`
 *      endpoint now fails stalled analyses inline, so a refresh is also
 *      what triggers the recovery flip from PENDING → FAILED.
 *   2. Cancel the analysis outright (opens the shared `<CancelDialog>`).
 *      Replaces the old "Mark as failed and retry" resume-hack — the
 *      backend now has a real cancel endpoint and we send the user to a
 *      clean restart.
 *   3. Pause polling so the page stops hammering the API.
 */

interface StalledBannerProps {
  stalledSeconds: number;
  /** Force a status/results poll right now. */
  onRefresh: () => void;
  /** Opens the shared `<CancelDialog>` (parent owns the dialog). */
  onCancel: () => void;
  /** Toggle the polling loop on/off. */
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  /** Disable the cancel button (e.g. status already terminal). */
  cancelDisabled?: boolean;
}

export default function StalledBanner({
  stalledSeconds,
  onRefresh,
  onCancel,
  paused,
  onPause,
  onResume,
  cancelDisabled,
}: StalledBannerProps) {
  const mins = Math.max(0, Math.floor(stalledSeconds / 60));
  const minuteLabel = mins === 1 ? "minute" : "minutes";

  return (
    <div
      className={clsx(
        "mb-3 flex flex-col gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3",
        "sm:flex-row sm:items-start",
      )}
      role="status"
      aria-live="polite"
    >
      <div className="flex-shrink-0 mt-0.5 text-amber-500">
        <AlertTriangle size={18} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          No progress for {mins} {minuteLabel} — the worker may be down.
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          Refreshing will trigger the backend to mark this as failed
          automatically. You can also cancel and start fresh.
        </p>
        <p className="text-[11px] text-[var(--text-muted)] mt-1">
          <a
            href="https://docs.celeryq.dev/en/stable/userguide/workers.html#starting-the-worker"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-amber-600 hover:text-amber-500 hover:underline"
          >
            <ExternalLink size={11} /> Open worker logs help
          </a>
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-stretch">
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-amber-500/40 bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-amber-500/10"
        >
          <RefreshCw size={12} /> Refresh
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={cancelDisabled}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <XCircle size={12} /> Cancel analysis
        </button>
        {paused ? (
          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-amber-500/40 bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-amber-500/10"
          >
            <PlayCircle size={12} /> Resume polling
          </button>
        ) : (
          <button
            type="button"
            onClick={onPause}
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-amber-500/40 bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] hover:bg-amber-500/10"
          >
            <PauseCircle size={12} /> Pause polling
          </button>
        )}
      </div>
    </div>
  );
}
