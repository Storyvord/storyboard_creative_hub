"use client";

import { AlertTriangle, ExternalLink, PauseCircle, PlayCircle, RefreshCw, RotateCcw } from "lucide-react";
import { clsx } from "clsx";

/**
 * Yellow/amber banner that overlays the regular `<StatusBanner>` when a
 * polled analysis has shown no observable progress for the stall window
 * (server-hinted via `is_stalled`, or client-detected after 2 min).
 *
 * The banner gives the user three escape hatches:
 *   1. Force a manual `refresh()` poll.
 *   2. Mark the analysis failed and re-queue (client-side: just calls
 *      `resume()` — the backend watchdog is the real authority).
 *   3. Pause polling so the page stops hammering the API.
 *
 * Background: a silently-dropped Celery task (unregistered name, dead
 * pool, etc.) used to leave the dashboard polling forever with a
 * spinner. This banner is the user-visible escape valve.
 */

interface StalledBannerProps {
  stalledSeconds: number;
  /** Force a status/results poll right now. */
  onRefresh: () => void;
  /** Re-queue the analysis (soft "mark failed" affordance). */
  onMarkFailedAndRetry: () => void;
  /** Toggle the polling loop on/off. */
  paused: boolean;
  onPause: () => void;
  onResume: () => void;
  /** True when the underlying status is already FAILED (no-op for retry). */
  retryDisabled?: boolean;
  /** Loading flag for the retry button. */
  retrying?: boolean;
}

export default function StalledBanner({
  stalledSeconds,
  onRefresh,
  onMarkFailedAndRetry,
  paused,
  onPause,
  onResume,
  retryDisabled,
  retrying,
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
          Analysis appears stalled — no progress for {mins} {minuteLabel}.
        </p>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          The worker may be down or the task wasn&apos;t registered. You can
          force a refresh, re-queue the analysis, or pause polling.
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
          onClick={onMarkFailedAndRetry}
          disabled={retryDisabled || retrying}
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RotateCcw size={12} />
          {retrying ? "Retrying…" : "Mark as failed and retry"}
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
            <PauseCircle size={12} /> Cancel polling
          </button>
        )}
      </div>
    </div>
  );
}
