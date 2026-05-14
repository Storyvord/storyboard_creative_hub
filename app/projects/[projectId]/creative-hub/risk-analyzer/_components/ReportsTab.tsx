"use client";

// Dual-report container — replaces the old single-report `ComplianceTab`.
// Backend now generates two reports at finalize:
//   1. Insurance Risk Analysis (broker-facing, the original compliance copy)
//   2. Producer Risk Analysis (operational, scene-by-scene action items)
//
// This component:
//   - Owns the Insurance | Producer segmented control.
//   - Mounts either `InsuranceReport` or `ProducerReport` based on the
//     active sub-tab.
//   - Hides the toggle entirely when only one of the two reports is
//     present in the envelope (older finalized analyses won't carry
//     `producer_report`).
//   - Reuses the status-aware empty-state copy from ComplianceTab but
//     updates the wording to mention "both reports" so producers know what
//     finalize will generate.

import { useMemo, useState } from "react";
import { FileText, Loader2, Lock, ShieldCheck, XCircle } from "lucide-react";
import { RiskAnalysis, normaliseStatus } from "@/types/risk-analyzer";
import InsuranceReport from "./InsuranceReport";
import ProducerReport from "./ProducerReport";

type SubTab = "insurance" | "producer";

interface ReportsTabProps {
  analysis: RiskAnalysis | null;
  onFinalize?: () => void;
  onDownloadInsurancePdf?: () => void;
  onDownloadProducerPdf?: () => void;
  onStartNewAnalysis?: () => void;
  onSelectScene?: (sceneId: number) => void;
}

export default function ReportsTab({
  analysis,
  onFinalize,
  onDownloadInsurancePdf,
  onDownloadProducerPdf,
  onStartNewAnalysis,
  onSelectScene,
}: ReportsTabProps) {
  const norm = normaliseStatus(analysis?.status);

  const hasInsurance = useMemo(
    () => !!(analysis?.insurance_report ?? analysis?.compliance_report),
    [analysis?.insurance_report, analysis?.compliance_report],
  );
  const hasProducer = useMemo(
    () => !!analysis?.producer_report,
    [analysis?.producer_report],
  );

  // Default sub-tab: prefer Insurance when present (it's the legacy view
  // producers are used to), otherwise show whichever report exists.
  const [subTab, setSubTab] = useState<SubTab>("insurance");

  // Derive the *effective* sub-tab during render rather than setState'ing
  // inside an effect: if the user has selected a sub-tab that the envelope
  // doesn't actually carry (e.g. they picked Producer on an old finalized
  // analysis that only has insurance), fall back to whichever report exists.
  // Pure derivation here avoids the cascading-render lint and keeps the
  // displayed tab in sync with envelope changes from polling.
  const effectiveSubTab: SubTab =
    subTab === "producer" && !hasProducer && hasInsurance
      ? "insurance"
      : subTab === "insurance" && !hasInsurance && hasProducer
        ? "producer"
        : subTab;

  if (norm === "FINALIZED") {
    const showToggle = hasInsurance && hasProducer;
    return (
      <div className="space-y-3">
        {showToggle && (
          <div className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5">
            <SubTabButton
              active={effectiveSubTab === "insurance"}
              onClick={() => setSubTab("insurance")}
              label="Insurance"
              icon={<ShieldCheck size={12} />}
            />
            <SubTabButton
              active={effectiveSubTab === "producer"}
              onClick={() => setSubTab("producer")}
              label="Producer"
              icon={<FileText size={12} />}
            />
          </div>
        )}

        {effectiveSubTab === "insurance" && (hasInsurance || !hasProducer) ? (
          <InsuranceReport
            analysis={analysis}
            onDownloadPdf={onDownloadInsurancePdf}
          />
        ) : (
          <ProducerReport
            report={analysis?.producer_report ?? null}
            // The download button only needs *some* truthy URL hint; the
            // actual endpoint is resolved by the page handler (it falls
            // back to `getProducerPdfUrl` when the envelope doesn't carry
            // a presigned URL). Passing the envelope URL when present
            // keeps direct presigned links working; otherwise we signal
            // "endpoint available" so the button renders.
            pdfUrl={
              analysis?.producer_pdf_url ?? (hasProducer ? "endpoint" : null)
            }
            onDownloadPdf={onDownloadProducerPdf}
            onSelectScene={onSelectScene}
          />
        )}
      </div>
    );
  }

  if (norm === "AWAITING_APPROVAL") {
    return (
      <EmptyShell
        icon={<ShieldCheck size={20} className="text-emerald-500" />}
        title="Finalize this analysis to generate both reports"
        body="Once you finalize, the score is locked and two reports are produced: an Insurance Risk Analysis (broker-facing, signed PDF) and a Producer Risk Analysis (operational checklist with scene-by-scene action items, crew calls, and pre-production prep)."
      >
        {onFinalize && (
          <button
            type="button"
            onClick={onFinalize}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <Lock size={14} /> Finalize &amp; generate reports
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
            ? "You can still finalize this cancelled run using the partial findings that were captured. Both the insurance and producer reports will reflect what was analysed."
            : "No reports are available for cancelled runs without findings. Start a fresh analysis to produce them."
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
        title="Reports unavailable — analysis failed"
        body="Resume from the status banner above. The insurance and producer reports are only produced after the pipeline reaches the AWAITING_APPROVAL stage and you click Finalize."
      />
    );
  }

  // In-flight: PENDING / CLASSIFYING / MITIGATING / FINALIZING
  return (
    <EmptyShell
      icon={<Loader2 size={20} className="animate-spin text-amber-500" />}
      title="Reports not generated yet"
      body="Both reports are produced when you finalize the analysis. Right now we're still classifying scenes and proposing mitigations — once that finishes you can review the findings and then finalize to lock the reports."
    />
  );
}

interface SubTabButtonProps {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}

function SubTabButton({ active, onClick, label, icon }: SubTabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-emerald-500/15 text-emerald-500"
          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      }`}
    >
      {icon}
      {label}
    </button>
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
