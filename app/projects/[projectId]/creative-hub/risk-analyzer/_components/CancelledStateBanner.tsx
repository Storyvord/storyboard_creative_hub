"use client";

// Producer-facing CANCELLED-state banner. Shown at the top of the dashboard
// when the analysis row is in CANCELLED. Surfaces the partial result counts,
// explains the (non-)refund policy, and — when the backend says
// `cancelled_context.finalize_available_from_cancelled` — offers a Finalize
// affordance so a producer can still ship a compliance report from the
// partial findings.
//
// Backend contract (additive, optional during rollout):
//   - analysis.total_findings_count          → top-level int
//   - analysis.scenes_with_findings_count    → top-level int
//   - analysis.cancelled_context             → { findings_count, finalize_available_from_cancelled }

import { Plus, ShieldCheck, XCircle } from "lucide-react";
import { CancelledContext, RiskAnalysis } from "@/types/risk-analyzer";

interface CancelledStateBannerProps {
  analysis: RiskAnalysis | null;
  /** Optional override — when omitted we read from `analysis.cancelled_context`. */
  cancelledContext?: CancelledContext | null;
  scenesProcessed?: number;
  onFinalize?: () => void;
  onStartNewAnalysis?: () => void;
}

export default function CancelledStateBanner({
  analysis,
  cancelledContext,
  scenesProcessed,
  onFinalize,
  onStartNewAnalysis,
}: CancelledStateBannerProps) {
  const ctx = cancelledContext ?? analysis?.cancelled_context ?? null;
  const findingsCount =
    ctx?.findings_count ??
    analysis?.total_findings_count ??
    // Defensive fallback — derive from scenes when the backend hint isn't
    // present yet on an older deployment.
    (analysis?.scenes
      ? analysis.scenes.reduce(
          (acc, s) =>
            acc + s.findings.filter((f) => !f.deleted_by_user).length,
          0,
        )
      : 0);
  const scenesAnalysed =
    scenesProcessed ??
    analysis?.scenes_with_findings_count ??
    analysis?.summary_stats?.scenes_analysed ??
    0;
  const canFinalize = ctx?.finalize_available_from_cancelled === true;

  return (
    <div className="rounded-xl border border-red-500/30 bg-[var(--surface)] px-4 py-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="flex-shrink-0 text-red-500">
          <XCircle size={18} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Analysis cancelled.
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            {scenesAnalysed} {scenesAnalysed === 1 ? "scene was" : "scenes were"}{" "}
            analysed before cancellation, with {findingsCount}{" "}
            {findingsCount === 1 ? "finding" : "findings"}. Credits already
            consumed weren&apos;t refunded.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canFinalize && onFinalize && (
            <button
              type="button"
              onClick={onFinalize}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              <ShieldCheck size={12} /> Finalize partial analysis
            </button>
          )}
          {onStartNewAnalysis && (
            <button
              type="button"
              onClick={onStartNewAnalysis}
              className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--text-secondary)] hover:border-emerald-500/40 hover:text-emerald-500"
            >
              <Plus size={12} /> Start new analysis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
