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
 */

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
}

function nextInterval(attempt: number): number {
  if (attempt <= 3) return 3_000;
  if (attempt <= 6) return 6_000;
  if (attempt <= 10) return 12_000;
  return 30_000;
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

  const attemptRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  // Stable scriptId/analysisId snapshots for the polling loop. We capture
  // them in refs so the timeout chain doesn't need to be torn down on every
  // render.
  const scriptIdRef = useRef(scriptId);
  const analysisIdRef = useRef(analysisId);
  scriptIdRef.current = scriptId;
  analysisIdRef.current = analysisId;

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
    await fetchResults(sid, aid);
  }, [fetchResults]);

  useEffect(() => {
    cancelledRef.current = false;
    attemptRef.current = 0;

    if (!enabled || scriptId === null || analysisId === null) {
      setIsPolling(false);
      return () => {
        cancelledRef.current = true;
        if (timerRef.current) clearTimeout(timerRef.current);
      };
    }

    setIsPolling(true);
    setError(null);

    const tick = async () => {
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
        const norm = normaliseStatus(s.status);
        if (norm !== null && isTerminal(norm)) {
          // Terminal — pull the full envelope once, then stop polling.
          await fetchResults(sid, aid);
          if (cancelledRef.current) return;
          setIsPolling(false);
          return;
        }
      }

      // Still in-flight (PENDING / CLASSIFYING / MITIGATING / FINALIZING):
      // schedule the next poll.
      const delay = nextInterval(attemptRef.current);
      timerRef.current = setTimeout(tick, delay);
    };

    // Kick off immediately — first poll happens within the natural 3 s
    // initial cadence on subsequent attempts.
    tick();

    return () => {
      cancelledRef.current = true;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, scriptId, analysisId]);

  return { analysis, status, isPolling, error, refresh };
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
