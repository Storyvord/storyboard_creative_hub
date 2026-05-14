"use client";

// Thin wrapper around `ComplianceSection` that:
//   - Pulls the report from either `insurance_report` (new field) or
//     `compliance_report` (back-compat alias) so the UI works against both
//     pre- and post-dual-report backends.
//   - Uses the explicit `finalized_pdf_url` if the envelope carries one;
//     otherwise falls back to the helper URL so older finalized analyses
//     still get a working "Download" button.
//
// The header above ComplianceSection gives the report a distinct visual
// identity (cool-blue accent + ShieldCheck icon) so it can never be
// confused for the amber ProducerReport when the user is mid-scroll.
//
// Text-rendering contract (defence-in-depth): every ``report.*`` string —
// executive_summary, compliance_statement, mitigation_verification,
// residual_risks[] — flows into JSX text children only via
// ComplianceSection. We deliberately do NOT use dangerouslySetInnerHTML,
// do NOT pass any report field into an ``href``, and do NOT pipe report
// text through a markdown renderer. The upstream LLM is treated as an
// untrusted source. If a future change adds a markdown renderer here,
// configure it with disallowedElements / skipHtml and no rehype-raw.

import { Download, ShieldCheck } from "lucide-react";
import { RiskAnalysis } from "@/types/risk-analyzer";
import ComplianceSection from "./ComplianceSection";

interface InsuranceReportProps {
  analysis: RiskAnalysis | null;
  onDownloadPdf?: () => void;
}

export default function InsuranceReport({
  analysis,
  onDownloadPdf,
}: InsuranceReportProps) {
  // Prefer the dedicated `insurance_report` field; fall back to the legacy
  // `compliance_report` alias so finalized analyses created before the
  // dual-report rollout still render.
  const report =
    analysis?.insurance_report ?? analysis?.compliance_report ?? null;
  // Pass a truthy sentinel when the report exists so the download button
  // renders even on envelopes that don't carry a presigned URL — the page
  // handler resolves the actual endpoint URL via `getInsurancePdfUrl`.
  const pdfUrl = analysis?.finalized_pdf_url ?? (report ? "endpoint" : null);

  return (
    <div className="space-y-3">
      {/* Identity header — cool-blue accent mirrors the PDF cover and
          puts visual distance between this view and the amber Producer
          report sibling. */}
      <header className="flex flex-col gap-2 rounded-xl border border-l-4 border-blue-500 border-[var(--border)] bg-[var(--surface)] p-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
            <ShieldCheck size={18} />
          </span>
          <div>
            <h3 className="text-sm font-semibold text-[var(--text-primary)]">
              Insurance Risk Analysis
            </h3>
            <p className="mt-0.5 text-[11px] text-[var(--text-muted)]">
              Broker / Underwriter facing — formal compliance &amp; residual
              risk.
            </p>
          </div>
        </div>
        {pdfUrl && onDownloadPdf && (
          <button
            type="button"
            onClick={onDownloadPdf}
            className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-md bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
          >
            <Download size={12} /> Download Insurance PDF
          </button>
        )}
      </header>

      <ComplianceSection
        report={report}
        // Hide the duplicate inline button — the prominent header
        // button above is the canonical download CTA now.
        pdfUrl={null}
        onDownloadPdf={onDownloadPdf}
      />
    </div>
  );
}
