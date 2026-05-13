"use client";

import { Loader2, AlertTriangle, CheckCircle2, ShieldAlert, RefreshCw, FileText, Lock } from "lucide-react";
import { clsx } from "clsx";
import {
  CreditEstimate,
  DriftWarning,
  RiskAnalysis,
  RiskAnalysisStatusPayload,
  normaliseStatus,
} from "@/types/risk-analyzer";

/**
 * Renders the state-specific banner copy + actions per FRONTEND_INTEGRATION.md
 * §8. The banner sits at the top of the dashboard and is always present once
 * an analysis exists.
 */

interface StatusBannerProps {
  status: RiskAnalysisStatusPayload | null;
  analysis: RiskAnalysis | null;
  estimate?: CreditEstimate | null;
  /** Empty-state CTA — show before any analysis exists. */
  onStartAnalysis?: () => void;
  onFinalize?: () => void;
  onResume?: () => void;
  onDownloadPdf?: () => void;
  finalizing?: boolean;
}

function etaLine(estimate?: CreditEstimate | null): string | null {
  if (!estimate) return null;
  const { estimated_calls, estimated_credits, estimated_minutes } = estimate;
  return `~${estimated_calls} calls · ~${estimated_credits} credits · ~${estimated_minutes} min`;
}

function lastDriftWarning(d?: DriftWarning[]): DriftWarning | null {
  if (!d || d.length === 0) return null;
  return d[d.length - 1] ?? null;
}

export default function StatusBanner({
  status,
  analysis,
  estimate,
  onStartAnalysis,
  onFinalize,
  onResume,
  onDownloadPdf,
  finalizing,
}: StatusBannerProps) {
  // No analysis yet — empty state.
  if (!status && !analysis) {
    const eta = etaLine(estimate);
    return (
      <Banner tone="neutral" icon={<ShieldAlert size={18} />}>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            No risk analysis yet.
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Run the analyzer to surface scene-level hazards, mitigation
            suggestions, and insurance estimates.
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <button
            type="button"
            onClick={onStartAnalysis}
            className="inline-flex items-center gap-2 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow hover:from-emerald-400 hover:to-emerald-500"
          >
            <ShieldAlert size={14} /> Start Risk Analysis
          </button>
          {eta && (
            <p className="text-[11px] text-[var(--text-muted)]">{eta}</p>
          )}
        </div>
      </Banner>
    );
  }

  const norm = normaliseStatus(status?.status ?? analysis?.status);

  if (norm === "FINALIZED") {
    const finalizedAt = analysis?.finalized_at;
    const score = analysis?.finalized_score ?? analysis?.score;
    return (
      <Banner tone="success" icon={<Lock size={18} />}>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Compliance report generated
            {finalizedAt ? ` ${new Date(finalizedAt).toLocaleString()}` : ""}.
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Score frozen at <span className="font-semibold">{score ?? "—"}</span>. Edits are
            disabled.
          </p>
        </div>
        {analysis?.finalized_pdf_url && onDownloadPdf && (
          <button
            type="button"
            onClick={onDownloadPdf}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <FileText size={14} /> Download Signed PDF
          </button>
        )}
      </Banner>
    );
  }

  if (norm === "FAILED") {
    const last = lastDriftWarning(status?.drift_warnings ?? analysis?.drift_warnings);
    const isCreditsExhausted = last?.kind === "finalize_credits_exhausted";
    return (
      <Banner tone="danger" icon={<AlertTriangle size={18} />}>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Analysis failed.
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            {last?.kind ? last.kind.replace(/_/g, " ") : "Unknown failure"} — see diagnostics below.
          </p>
        </div>
        {onResume && (
          <button
            type="button"
            onClick={onResume}
            className="inline-flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-500"
          >
            <RefreshCw size={14} /> {isCreditsExhausted ? "Top up credits and retry finalize" : "Resume"}
          </button>
        )}
      </Banner>
    );
  }

  if (norm === "AWAITING_APPROVAL") {
    const score = analysis?.score ?? "—";
    const band = analysis?.score_band ?? "Medium";
    return (
      <Banner tone="info" icon={<CheckCircle2 size={18} />}>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Analysis ready.
          </p>
          <p className="text-xs text-[var(--text-muted)] mt-1">
            Review the {band}-risk findings below and approve mitigations. Score:{" "}
            <span className="font-semibold">{score}</span>. Finalizing locks the compliance
            report.
          </p>
        </div>
        {onFinalize && (
          <button
            type="button"
            onClick={onFinalize}
            disabled={finalizing}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {finalizing ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            Finalize & Generate Report
          </button>
        )}
      </Banner>
    );
  }

  // Progress: PENDING / CLASSIFYING / MITIGATING / FINALIZING
  const progress = Math.min(Math.max(status?.progress ?? 0, 0), 1);
  const pct = Math.round(progress * 100);
  const phase = norm
    ? norm.charAt(0) + norm.slice(1).toLowerCase().replace(/_/g, " ")
    : "Working";
  const sceneFrag =
    status && typeof status.scenes_total === "number" && status.scenes_total > 0
      ? `Scene ${status.scenes_processed} of ${status.scenes_total} analyzed.`
      : null;
  return (
    <Banner tone="progress" icon={<Loader2 size={18} className="animate-spin" />}>
      <div className="flex-1">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          Analyzing your script… <span className="text-[var(--text-muted)] font-normal">({phase})</span>
        </p>
        {sceneFrag && (
          <p className="text-xs text-[var(--text-muted)] mt-1">{sceneFrag}</p>
        )}
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-hover)]">
          <div
            className="h-full bg-emerald-500 transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="ml-3 text-xs font-medium text-[var(--text-muted)]">{pct}%</span>
    </Banner>
  );
}

// ── Internal shell ─────────────────────────────────────────────────────────
function Banner({
  tone,
  icon,
  children,
}: {
  tone: "neutral" | "info" | "success" | "danger" | "progress";
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneClass: Record<typeof tone, string> = {
    neutral: "border-[var(--border)] bg-[var(--surface)]",
    info: "border-emerald-500/30 bg-emerald-500/5",
    success: "border-emerald-500/40 bg-emerald-500/10",
    danger: "border-red-500/40 bg-red-500/10",
    progress: "border-amber-500/30 bg-amber-500/5",
  };
  const iconToneClass: Record<typeof tone, string> = {
    neutral: "text-[var(--text-muted)]",
    info: "text-emerald-500",
    success: "text-emerald-500",
    danger: "text-red-500",
    progress: "text-amber-500",
  };
  return (
    <div
      className={clsx(
        "flex items-start gap-3 rounded-xl border px-4 py-3",
        toneClass[tone],
      )}
    >
      <div className={clsx("flex-shrink-0 mt-0.5", iconToneClass[tone])}>{icon}</div>
      {children}
    </div>
  );
}
