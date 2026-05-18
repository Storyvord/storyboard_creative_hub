"use client";

import { RiskEditSummary } from "@/types/risk-analyzer";

interface EditTransparencyTableProps {
  summary: RiskEditSummary | null | undefined;
}

/**
 * AI-vs-user edit diff. Mirrors what's in the signed PDF so producers can
 * preview the lineage on screen. PRD §3 mandate: "the score is the
 * producer's score, not the AI's score" — provenance must be visible.
 */
export default function EditTransparencyTable({ summary }: EditTransparencyTableProps) {
  if (!summary) return null;
  const deltaRaw = summary.delta;
  const deltaNum =
    typeof deltaRaw === "number"
      ? deltaRaw
      : typeof deltaRaw === "string" && deltaRaw.length > 0
        ? Number(deltaRaw)
        : 0;
  const sign = deltaNum > 0 ? "+" : "";
  const deltaColor =
    deltaNum > 0 ? "text-emerald-500" : deltaNum < 0 ? "text-red-500" : "text-[var(--text-muted)]";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <h3 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
        Edit transparency
      </h3>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="AI findings" value={summary.ai_findings_count} />
        <Stat label="User added" value={summary.user_added_count} tint="emerald" />
        <Stat label="User modified" value={summary.user_modified_count} tint="amber" />
        <Stat label="User deleted" value={summary.user_deleted_count} tint="red" />
      </div>
      <div className="mt-3 flex flex-wrap items-baseline gap-2 border-t border-[var(--border)] pt-3 text-xs">
        <span className="text-[var(--text-muted)]">AI baseline:</span>
        <span className="tabular-nums font-semibold text-[var(--text-primary)]">
          {summary.ai_only_score}
        </span>
        <span className="text-[var(--text-muted)]">→ Current:</span>
        <span className="tabular-nums font-semibold text-[var(--text-primary)]">
          {summary.current_score}
        </span>
        <span className={`tabular-nums font-semibold ${deltaColor}`}>
          ({sign}
          {Number.isFinite(deltaNum) ? deltaNum : 0})
        </span>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tint,
}: {
  label: string;
  value: number;
  tint?: "emerald" | "amber" | "red";
}) {
  const tintClass =
    tint === "emerald"
      ? "text-emerald-500"
      : tint === "amber"
        ? "text-amber-500"
        : tint === "red"
          ? "text-red-500"
          : "text-[var(--text-primary)]";
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--background)] px-3 py-2">
      <p className={`text-lg font-bold tabular-nums ${tintClass}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{label}</p>
    </div>
  );
}
