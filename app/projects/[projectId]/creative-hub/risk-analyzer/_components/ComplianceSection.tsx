"use client";

import { FileText, ShieldCheck } from "lucide-react";
import { ComplianceReport } from "@/types/risk-analyzer";

interface ComplianceSectionProps {
  report: ComplianceReport | null | undefined;
  pdfUrl?: string | null;
  /** Called when the user clicks Download — parent calls window.open. */
  onDownloadPdf?: () => void;
}

/**
 * Renders the 4 fields of `compliance_report` plus a download-PDF button.
 * The compliance block is only available after the analysis is FINALIZED.
 */
export default function ComplianceSection({
  report,
  pdfUrl,
  onDownloadPdf,
}: ComplianceSectionProps) {
  if (!report) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
        Compliance report will appear once the analysis is finalized.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5">
      <header className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-emerald-500" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Compliance Report
          </h3>
        </div>
        {pdfUrl && onDownloadPdf && (
          <button
            type="button"
            onClick={onDownloadPdf}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            <FileText size={12} /> Download Signed PDF
          </button>
        )}
      </header>

      <div className="space-y-4">
        <Section title="Executive summary" body={report.executive_summary} />
        <Section title="Compliance statement" body={report.compliance_statement} />
        <Section title="Mitigation verification" body={report.mitigation_verification} />

        {report.residual_risks && report.residual_risks.length > 0 && (
          <div>
            <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Residual risks
            </h4>
            <ul className="ml-4 list-disc space-y-1 text-xs text-[var(--text-secondary)]">
              {report.residual_risks.map((r, i) => (
                <li key={i}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div>
      <h4 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        {title}
      </h4>
      <p className="whitespace-pre-line text-xs text-[var(--text-secondary)]">{body}</p>
    </div>
  );
}
