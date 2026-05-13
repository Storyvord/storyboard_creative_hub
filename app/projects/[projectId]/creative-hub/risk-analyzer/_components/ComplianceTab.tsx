"use client";

// Status-aware compliance tab. Producers were confused by an empty
// Compliance tab during in-flight phases — this component explains exactly
// what state the analysis is in and offers the Finalize affordance when
// it's available (including the CANCELLED-with-findings case, which the
// backend now accepts).

import { Lock, Loader2, ShieldCheck, XCircle } from "lucide-react";
import { RiskAnalysis, normaliseStatus } from "@/types/risk-analyzer";
import ComplianceSection from "./ComplianceSection";

interface ComplianceTabProps {
  analysis: RiskAnalysis | null;
  onFinalize?: () => void;
  onDownloadPdf?: () => void;
  onStartNewAnalysis?: () => void;
}

export default function ComplianceTab({
  analysis,
  onFinalize,
  onDownloadPdf,
  onStartNewAnalysis,
}: ComplianceTabProps) {
  const norm = normaliseStatus(analysis?.status);

  if (norm === "FINALIZED") {
    return (
      <ComplianceSection
        report={analysis?.compliance_report ?? null}
        pdfUrl={analysis?.finalized_pdf_url}
        onDownloadPdf={onDownloadPdf}
      />
    );
  }

  if (norm === "AWAITING_APPROVAL") {
    return (
      <EmptyShell
        icon={<ShieldCheck size={20} className="text-emerald-500" />}
        title="Finalize this analysis to generate the compliance report"
        body="Once you finalize, the score is locked, a signed PDF is produced, and the four-section compliance report (executive summary, statement, mitigation verification, residual risks) appears here."
      >
        {onFinalize && (
          <button
            type="button"
            onClick={onFinalize}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <Lock size={14} /> Finalize &amp; generate report
          </button>
        )}
      </EmptyShell>
    );
  }

  if (norm === "CANCELLED") {
    const canFinalize =
      analysis?.cancelled_context?.finalize_available_from_cancelled === true;
    return (
      <EmptyShell
        icon={<XCircle size={20} className="text-red-500" />}
        title="Analysis was cancelled"
        body={
          canFinalize
            ? "You can still finalize this cancelled run using the partial findings that were captured. The compliance report will reflect what was analysed."
            : "No compliance report is available for cancelled runs without findings. Start a fresh analysis to produce one."
        }
      >
        {canFinalize && onFinalize ? (
          <button
            type="button"
            onClick={onFinalize}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <Lock size={14} /> Finalize partial analysis
          </button>
        ) : (
          onStartNewAnalysis && (
            <button
              type="button"
              onClick={onStartNewAnalysis}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:border-emerald-500/40 hover:text-emerald-500"
            >
              Start new analysis
            </button>
          )
        )}
      </EmptyShell>
    );
  }

  if (norm === "FAILED") {
    return (
      <EmptyShell
        icon={<XCircle size={20} className="text-red-500" />}
        title="Compliance unavailable — analysis failed"
        body="Resume from the status banner above. The compliance report is only produced after the pipeline reaches the AWAITING_APPROVAL stage and you click Finalize."
      />
    );
  }

  // In-flight: PENDING / CLASSIFYING / MITIGATING / FINALIZING
  return (
    <EmptyShell
      icon={<Loader2 size={20} className="animate-spin text-amber-500" />}
      title="Compliance report not generated yet"
      body="The report is produced when you finalize the analysis. Right now we're still classifying scenes and proposing mitigations — once that finishes you can review the findings and then finalize to lock the report."
    />
  );
}

interface EmptyShellProps {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}

function EmptyShell({ icon, title, body, children }: EmptyShellProps) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div>{icon}</div>
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          {title}
        </h3>
        <p className="max-w-md text-xs text-[var(--text-muted)]">{body}</p>
        {children && <div className="mt-2">{children}</div>}
      </div>
    </div>
  );
}
