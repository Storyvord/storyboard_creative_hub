"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getResults, getStatus } from "@/services/risk-analyzer";
import {
  RiskAnalysis,
  RiskAnalysisStatus,
  RiskAnalysisStatusPayload,
  isTerminal,
  normaliseStatus,
} from "@/types/risk-analyzer";

/**
 * Polls `GET /status/` for a risk analysis with exponential backoff
 * (3 s → 6 s → 12 s → 30 s) and refetches the full `GET /results/`
 * envelope when the run enters a terminal state.
 *
 * Spec: FRONTEND_INTEGRATION.md §4. Terminal states are
 * `FINALIZED`, `FAILED`, `AWAITING_APPROVAL` — the hook stops polling
 * on those (the consumer can still call `refresh()` to re-pull the
 * full envelope after an edit).
 *
 * The hook also surfaces stalled-task detection. A worker can silently
 * drop a Celery task (unregistered name, dead pool, etc.) and the DB row
 * sits in PENDING forever — the original implementation polled
 * indefinitely with no recovery path. We now expose `isStalled` /
 * `stalledSeconds` so the dashboard can show a recovery banner.
 *
 *   - Server hint preferred: when `status.is_stalled` is present, trust it.
 *   - Client fallback: if no progress observed for > 120 s and the status
 *     is non-terminal, consider it stalled. 120 s is intentionally generous
 *     to avoid flapping during the natural extract→classify gap on small
 *     scripts.
 *
 * Polling does **not** stop when stalled — the user may explicitly retry
 * or wait it out. They can call `pause()` to actually halt the loop.
 */

const CLIENT_STALL_THRESHOLD_SECONDS = 120;

interface UseRiskAnalysisPollingOptions {
  scriptId: number | null;
  analysisId: number | null;
  /** When false, the hook is fully inert (no fetches, no timers). */
  enabled?: boolean;
}

interface UseRiskAnalysisPollingResult {
  analysis: RiskAnalysis | null;
  status: RiskAnalysisStatusPayload | null;
  isPolling: boolean;
  error: string | null;
  /** Re-fetch the full results envelope (use after a mutation). */
  refresh: () => Promise<void>;
  /** True when the run has shown no progress for the stall window. */
  isStalled: boolean;
  /** Seconds since the last observed progress signal. */
  stalledSeconds: number;
  /** Pause/resume the polling loop without unmounting. */
  paused: boolean;
  pause: () => void;
  resume: () => void;
}

function nextInterval(attempt: number): number {
  if (attempt <= 3) return 3_000;
  if (attempt <= 6) return 6_000;
  if (attempt <= 10) return 12_000;
  return 30_000;
}

/**
 * Returns a stable "progress fingerprint" for comparison. Any meaningful
 * change here counts as observable progress and resets the stall timer.
 */
function progressFingerprint(s: RiskAnalysisStatusPayload | null): string {
  if (!s) return "";
  return [
    String(s.status ?? ""),
    String(s.progress ?? 0),
    String(s.scenes_processed ?? 0),
    String(s.scenes_total ?? 0),
    String(s.task_status ?? ""),
  ].join("|");
}

export function useRiskAnalysisPolling({
  scriptId,
  analysisId,
  enabled = true,
}: UseRiskAnalysisPollingOptions): UseRiskAnalysisPollingResult {
  const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
  const [status, setStatus] = useState<RiskAnalysisStatusPayload | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const [stalledSeconds, setStalledSeconds] = useState(0);
  const [isStalled, setIsStalled] = useState(false);

  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stallTickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const cancelledRef = useRef(false);

  // Stable scriptId/analysisId snapshots for the polling loop. We capture
  // them in refs so the timeout chain doesn't need to be torn down on every
  // render.
  const scriptIdRef = useRef(scriptId);
  const analysisIdRef = useRef(analysisId);
  scriptIdRef.current = scriptId;
  analysisIdRef.current = analysisId;

  // Progress fingerprint + last-progress timestamp tracked outside React
  // state so changes don't force a render until we explicitly publish.
  const lastFingerprintRef = useRef<string>("");
  const lastProgressAtRef = useRef<number>(Date.now());
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  // Mirror of `status` so the 1 s heartbeat (declared once) can read the
  // latest server-hint / status string without being torn down on every poll.
  const statusRef = useRef<RiskAnalysisStatusPayload | null>(null);
  statusRef.current = status;

  const fetchResults = useCallback(
    async (sid: number, aid: number) => {
      try {
        const data = await getResults(sid, aid);
        if (cancelledRef.current) return;
        setAnalysis(data);
      } catch (err) {
        if (cancelledRef.current) return;
        console.error("[useRiskAnalysisPolling] getResults failed", err);
        setError(err instanceof Error ? err.message : "Failed to load results.");
      }
    },
    [],
  );

  const refresh = useCallback(async () => {
    const sid = scriptIdRef.current;
    const aid = analysisIdRef.current;
    if (sid === null || aid === null) return;
    // A user-initiated refresh also counts as "progress activity" — reset
    // the timer so the stalled banner doesn't immediately reappear.
    lastProgressAtRef.current = Date.now();
    await fetchResults(sid, aid);
  }, [fetchResults]);

  const pause = useCallback(() => setPaused(true), []);
  const resumeFn = useCallback(() => {
    // Resuming also resets the stall timer — user explicitly opted back in.
    lastProgressAtRef.current = Date.now();
    setPaused(false);
  }, []);

  useEffect(() => {
    cancelledRef.current = false;
    attemptRef.current = 0;
    lastFingerprintRef.current = "";
    lastProgressAtRef.current = Date.now();
    setStalledSeconds(0);
    setIsStalled(false);

    if (!enabled || scriptId === null || analysisId === null) {
      setIsPolling(false);
      return () => {
        cancelledRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
        if (stallTickRef.current) clearInterval(stallTickRef.current);
      };
    }

    setIsPolling(true);
    setError(null);

    const tick = async () => {
      if (cancelledRef.current) return;
      if (pausedRef.current) {
        // Re-check every 3 s — cheap, no network hit.
        timerRef.current = setTimeout(tick, 3_000);
        return;
      }
      attemptRef.current += 1;
      const sid = scriptIdRef.current;
      const aid = analysisIdRef.current;
      if (sid === null || aid === null) return;

      let s: RiskAnalysisStatusPayload | null = null;
      try {
        s = await getStatus(sid, aid);
      } catch (err) {
        if (cancelledRef.current) return;
        console.error("[useRiskAnalysisPolling] getStatus failed", err);
        setError(err instanceof Error ? err.message : "Failed to load status.");
      }

      if (cancelledRef.current) return;

      if (s) {
        setStatus(s);
        const fp = progressFingerprint(s);
        if (fp !== lastFingerprintRef.current) {
          lastFingerprintRef.current = fp;
          lastProgressAtRef.current = Date.now();
        }
        const norm = normaliseStatus(s.status);
        if (norm !== null && isTerminal(norm)) {
          // Terminal — pull the full envelope once, then stop polling.
          await fetchResults(sid, aid);
          if (cancelledRef.current) return;
          setIsPolling(false);
          setIsStalled(false);
          setStalledSeconds(0);
          if (stallTickRef.current) {
            clearInterval(stallTickRef.current);
            stallTickRef.current = null;
          }
          return;
        }
      }

      // Still in-flight (PENDING / CLASSIFYING / MITIGATING / FINALIZING):
      // schedule the next poll. Note: we intentionally keep polling even
      // when stalled — the user controls retry via pause()/markFailed.
      const delay = nextInterval(attemptRef.current);
      timerRef.current = setTimeout(tick, delay);
    };

    // Separate 1 s heartbeat to update `stalledSeconds` and `isStalled` so
    // the banner copy updates without waiting for the next poll. Cheap; no
    // network involvement.
    stallTickRef.current = setInterval(() => {
      if (cancelledRef.current) return;
      const secs = Math.floor((Date.now() - lastProgressAtRef.current) / 1000);
      setStalledSeconds(secs);
      // Prefer the server hint when present.
      const current = statusRef.current;
      const serverHint = current?.is_stalled;
      const terminal = isTerminal(current?.status);
      let stalled: boolean;
      if (typeof serverHint === "boolean") {
        stalled = serverHint && !terminal;
      } else {
        stalled = !terminal && secs > CLIENT_STALL_THRESHOLD_SECONDS;
      }
      setIsStalled(stalled);
    }, 1_000);

    // Kick off immediately — first poll happens within the natural 3 s
    // initial cadence on subsequent attempts.
    tick();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      if (stallTickRef.current) {
        clearInterval(stallTickRef.current);
        stallTickRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scriptId, analysisId]);

  return {
    analysis,
    status,
    isPolling,
    error,
    refresh,
    isStalled,
    stalledSeconds,
    paused,
    pause,
    resume: resumeFn,
  };
}

/**
 * Re-exported terminal status set so a parent that owns the analysis can
 * keep render branches aligned with the polling hook.
 */
export const RISK_TERMINAL_STATUSES: RiskAnalysisStatus[] = [
  "FINALIZED",
  "FAILED",
  "AWAITING_APPROVAL",
];
