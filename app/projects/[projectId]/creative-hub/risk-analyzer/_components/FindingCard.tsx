"use client";

import { useState } from "react";
import { Check, CheckCircle2, Pencil, RotateCcw, Trash2, Undo2 } from "lucide-react";
import { clsx } from "clsx";
import { RiskFinding } from "@/types/risk-analyzer";
import { APPROVED_BADGE, SEVERITY_COLOR, SOURCE_BADGE, categoryLabel } from "./constants";

interface FindingCardProps {
  finding: RiskFinding;
  /** Disable all actions when the analysis is FINALIZED. */
  readOnly?: boolean;
  onEdit?: (finding: RiskFinding) => void;
  onDelete?: (finding: RiskFinding) => void;
  onRestore?: (finding: RiskFinding) => void;
  onRevert?: (finding: RiskFinding) => void;
  onApprove?: (finding: RiskFinding, approve: boolean) => void;
}

/**
 * Single-finding row. Source-driven badging + action affordances mirror
 * FRONTEND_INTEGRATION.md §7's action matrix.
 */
export default function FindingCard({
  finding,
  readOnly,
  onEdit,
  onDelete,
  onRestore,
  onRevert,
  onApprove,
}: FindingCardProps) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const sevColor = SEVERITY_COLOR[finding.severity];
  const sourceBadge = SOURCE_BADGE[finding.source];
  const isDeleted = finding.deleted_by_user;
  const isApproved = finding.approval_state === "agreed";
  const canRevert = finding.source === "user_modified";
  const hasCriticFlag = finding.source === "ai_critic";

  return (
    <div
      className={clsx(
        "rounded-lg border bg-[var(--surface)] p-3",
        isDeleted
          ? "border-dashed border-[var(--border)] opacity-60"
          : hasCriticFlag
            ? "border-red-500/30"
            : "border-[var(--border)]",
      )}
    >
      {/* Header row: category + severity + badges */}
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: `${sevColor}22`, color: sevColor }}
            >
              {finding.severity}
            </span>
            <span className="text-sm font-semibold text-[var(--text-primary)]">
              {categoryLabel(finding.category_slug, finding.category)}
            </span>
            {sourceBadge && (
              <span
                className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: sourceBadge.bg, color: sourceBadge.color }}
              >
                {sourceBadge.label}
              </span>
            )}
            {isApproved && (
              <span
                className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold"
                style={{ backgroundColor: APPROVED_BADGE.bg, color: APPROVED_BADGE.color }}
              >
                <Check size={10} /> {APPROVED_BADGE.label}
              </span>
            )}
            {typeof finding.confidence === "string" && (
              <span className="rounded border border-[var(--border)] px-1.5 py-0.5 text-[10px] text-[var(--text-muted)]">
                {finding.confidence} conf.
              </span>
            )}
            {finding.audit_flags && finding.audit_flags.length > 0 && (
              <span className="rounded border border-red-500/40 px-1.5 py-0.5 text-[10px] text-red-500">
                {finding.audit_flags.length} flag
                {finding.audit_flags.length === 1 ? "" : "s"}
              </span>
            )}
          </div>
          <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{finding.reason}</p>
          {finding.evidence_quote && (
            <p className="mt-1 text-[11px] italic text-[var(--text-muted)]">
              <span className="font-mono not-italic mr-1 select-none">{">"}</span>
              {finding.evidence_quote}
            </p>
          )}
        </div>

        {!readOnly && (
          <div className="flex flex-shrink-0 items-center gap-1">
            {isDeleted ? (
              <ActionBtn label="Restore" onClick={() => onRestore?.(finding)} icon={<Undo2 size={13} />} />
            ) : (
              <>
                <ActionBtn
                  label={isApproved ? "Unapprove" : "Approve"}
                  onClick={() => onApprove?.(finding, !isApproved)}
                  icon={<CheckCircle2 size={13} />}
                  tone={isApproved ? "approved" : "neutral"}
                />
                <ActionBtn label="Edit" onClick={() => onEdit?.(finding)} icon={<Pencil size={13} />} />
                {canRevert && (
                  <ActionBtn
                    label="Revert to AI"
                    onClick={() => onRevert?.(finding)}
                    icon={<RotateCcw size={13} />}
                  />
                )}
                <ActionBtn
                  label="Delete"
                  onClick={() => setConfirmingDelete(true)}
                  icon={<Trash2 size={13} />}
                  tone="danger"
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Inline delete confirmation */}
      {confirmingDelete && !readOnly && (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-2.5 py-1.5 text-xs">
          <span className="text-[var(--text-secondary)]">
            Removing reduces the risk score — confirm?
          </span>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setConfirmingDelete(false)}
              className="rounded border border-[var(--border)] px-2 py-0.5 text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                onDelete?.(finding);
                setConfirmingDelete(false);
              }}
              className="rounded bg-red-600 px-2 py-0.5 font-semibold text-white hover:bg-red-500"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ActionBtn({
  label,
  onClick,
  icon,
  tone = "neutral",
}: {
  label: string;
  onClick?: () => void;
  icon: React.ReactNode;
  tone?: "neutral" | "danger" | "approved";
}) {
  const toneClass: Record<typeof tone, string> = {
    neutral: "text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]",
    danger: "text-[var(--text-muted)] hover:bg-red-500/10 hover:text-red-500",
    approved: "text-emerald-500 hover:bg-emerald-500/10",
  };
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={clsx(
        "inline-flex items-center justify-center rounded p-1.5 transition-colors",
        toneClass[tone],
      )}
    >
      {icon}
    </button>
  );
}
