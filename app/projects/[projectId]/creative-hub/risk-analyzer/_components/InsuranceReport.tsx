"use client";

// Thin wrapper around `ComplianceSection` that:
//   - Pulls the report from either `insurance_report` (new field) or
//     `compliance_report` (back-compat alias) so the UI works against both
//     pre- and post-dual-report backends.
//   - Uses the explicit `finalized_pdf_url` if the envelope carries one;
//     otherwise falls back to the helper URL so older finalized analyses
//     still get a working "Download" button.

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
  const pdfUrl =
    analysis?.finalized_pdf_url ?? (report ? "endpoint" : null);

  return (
    <ComplianceSection
      report={report}
      pdfUrl={pdfUrl}
      onDownloadPdf={onDownloadPdf}
    />
  );
}
