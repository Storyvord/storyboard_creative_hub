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
import { FileText, Loader2, Lock, RefreshCw, ShieldCheck, XCircle } from "lucide-react";
import {
  RiskAnalysis,
  RiskAnalysisStatus,
  normaliseStatus,
} from "@/types/risk-analyzer";
import InsuranceReport from "./InsuranceReport";
import ProducerReport from "./ProducerReport";

type SubTab = "insurance" | "producer";

interface ReportsTabProps {
  analysis: RiskAnalysis | null;
  /**
   * Live status from the polling hook. Preferred over `analysis.status`
   * for picking the empty-state copy — the results envelope can lag the
   * live pipeline phase (e.g. status flipped to FINALIZING but envelope
   * still shows AWAITING_APPROVAL). When omitted we fall back to the
   * envelope's status.
   */
  liveStatus?: RiskAnalysisStatus | null;
  onFinalize?: () => void;
  onDownloadInsurancePdf?: () => void;
  onDownloadProducerPdf?: () => void;
  onStartNewAnalysis?: () => void;
  onSelectScene?: (sceneId: number) => void;
  /**
   * Manual envelope refresh. Surfaced to the user via the defensive
   * FINALIZED-but-empty loader so they can recover from a stale-cache
   * edge case without a full page reload.
   */
  onRefresh?: () => void;
}

export default function ReportsTab({
  analysis,
  liveStatus,
  onFinalize,
  onDownloadInsurancePdf,
  onDownloadProducerPdf,
  onStartNewAnalysis,
  onSelectScene,
  onRefresh,
}: ReportsTabProps) {
  const envelopeNorm = normaliseStatus(analysis?.status);
  // Use the live status when provided so the in-flight loader reflects the
  // *current* pipeline phase, not the stale envelope phase. We still use
  // the envelope status for the FINALIZED render branch since the envelope
  // is the source of truth for the report payloads.
  const norm: RiskAnalysisStatus | null = liveStatus ?? envelopeNorm;

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

  // Honor the user's selection — do NOT silently coerce when their picked
  // report isn't yet available. The render branch below shows a
  // "report will appear when finalize completes" affordance inside the
  // missing-report panel, and the toggle button surfaces aria-disabled
  // when its report is absent so the click feedback is unambiguous.
  const effectiveSubTab: SubTab = subTab;

  // FINALIZED is a terminal state — the envelope is frozen and the
  // backend hardening in `results.build_results_envelope` guarantees both
  // report keys are present (producer_report may be null on legacy
  // snapshots). Render the report view UNCONDITIONALLY here so a
  // post-finalize poll race can't flash the "Reports not generated yet"
  // loader. We branch on `envelopeNorm` (the envelope's own status) rather
  // than `norm` because the live status may briefly show FINALIZING after
  // a resumed task even while the envelope is already FINALIZED — and
  // we want the report view as soon as the envelope is good.
  if (envelopeNorm === "FINALIZED") {
    // Defensive: backend says FINALIZED but the envelope hasn't been
    // populated yet (cache race, or stale read between status flip and
    // envelope write). Show a recoverable loader, NOT the empty report
    // shell — the user can click "Refresh now" or the polling loop's
    // next tick will hydrate it.
    if (!hasInsurance && !hasProducer) {
      return (
        <EmptyShell
          icon={<Loader2 size={20} className="animate-spin text-amber-500" />}
          title="Loading reports…"
          body="Finalize is complete on the server but we haven't received the report payloads yet. They usually appear within a few seconds — if not, refresh."
        >
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:border-emerald-500/40 hover:text-emerald-500"
            >
              <RefreshCw size={14} /> Refresh now
            </button>
          )}
        </EmptyShell>
      );
    }
    return (
      <div className="space-y-3">
        {/* Toggle is always rendered on FINALIZED so the user can switch
            between reports. When a side's report isn't present yet we
            mark its button `aria-disabled` (purely visual — clicks still
            work and surface the "report will appear" affordance below)
            so screen readers and keyboard users get unambiguous feedback. */}
        <div
          role="tablist"
          aria-label="Reports — Insurance or Producer"
          className="inline-flex rounded-md border border-[var(--border)] bg-[var(--surface)] p-0.5"
        >
          <SubTabButton
            active={effectiveSubTab === "insurance"}
            unavailable={!hasInsurance}
            onClick={() => setSubTab("insurance")}
            label="Insurance"
            icon={<ShieldCheck size={12} />}
          />
          <SubTabButton
            active={effectiveSubTab === "producer"}
            unavailable={!hasProducer}
            onClick={() => setSubTab("producer")}
            label="Producer"
            icon={<FileText size={12} />}
          />
        </div>

        {effectiveSubTab === "insurance" ? (
          hasInsurance ? (
            <InsuranceReport
              analysis={analysis}
              onDownloadPdf={onDownloadInsurancePdf}
            />
          ) : (
            <EmptyShell
              icon={<Loader2 size={20} className="animate-spin text-amber-500" />}
              title="Insurance report will appear when finalize completes"
              body="The Insurance Risk Analysis is generated alongside the Producer report when finalize finishes (compliance LLM + PDF render takes 1-3 min). This page refreshes automatically — switch to the Producer tab in the meantime if it's already available."
            />
          )
        ) : hasProducer ? (
          <ProducerReport
            report={analysis?.producer_report ?? null}
            pdfUrl={
              analysis?.producer_pdf_url ?? (hasProducer ? "endpoint" : null)
            }
            onDownloadPdf={onDownloadProducerPdf}
            onSelectScene={onSelectScene}
          />
        ) : (
          <EmptyShell
            icon={<Loader2 size={20} className="animate-spin text-amber-500" />}
            title="Producer report will appear when finalize completes"
            body="The Producer Risk Analysis (scene-by-scene action items, crew calls, pre-production prep) is generated alongside the Insurance report. This page refreshes automatically — switch to the Insurance tab in the meantime if it's already available."
          />
        )}
      </div>
    );
  }

  if (norm === "AWAITING_APPROVAL") {
    return (
      <EmptyShell
        icon={<ShieldCheck size={20} className="text-emerald-500" />}
        title="Finalize this analysis to generate the reports"
        body="Finalize locks the score and produces two reports: an Insurance Risk Analysis (broker-facing, signed PDF) and a Producer Risk Analysis (operational checklist with scene-by-scene action items, crew calls, and pre-production prep)."
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

  if (norm === "FINALIZING") {
    return (
      <EmptyShell
        icon={<Loader2 size={20} className="animate-spin text-emerald-500" />}
        title="Generating reports — this typically takes 1–3 minutes"
        body="We're running the compliance LLM for both the insurance and producer reports, then rendering the signed PDFs. The page refreshes automatically; no action needed."
      />
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

  // In-flight: PENDING / CLASSIFYING / MITIGATING
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
  /**
   * True when the corresponding report is not yet present in the envelope
   * (mid-finalize race). We keep the click handler live so the panel
   * below renders the "report will appear when finalize completes"
   * affordance — but surface `aria-disabled` and dim the button so the
   * unavailability is unambiguous to keyboard / screen-reader users.
   */
  unavailable?: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}

function SubTabButton({
  active,
  unavailable = false,
  onClick,
  label,
  icon,
}: SubTabButtonProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-pressed={active}
      aria-selected={active}
      aria-disabled={unavailable || undefined}
      title={
        unavailable
          ? `${label} report will appear when finalize completes`
          : undefined
      }
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-semibold transition-colors ${
        active
          ? "bg-emerald-500/15 text-emerald-500"
          : "text-[var(--text-muted)] hover:text-[var(--text-primary)]"
      } ${unavailable ? "opacity-60" : ""}`}
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
