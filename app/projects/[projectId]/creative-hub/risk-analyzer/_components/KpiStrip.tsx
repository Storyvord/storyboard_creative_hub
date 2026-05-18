"use client";

// Producer-friendly KPI cards on the Overview tab. Replaces the
// "every-scene-equals-max-score" misleading default with concrete counts
// that mean something to a non-engineer. Falls back gracefully when the
// new backend hints (`total_findings_count` etc.) aren't present yet.

import { AlertTriangle, DollarSign, Film, ListChecks } from "lucide-react";
import { RiskAnalysis, Severity } from "@/types/risk-analyzer";
import { SEVERITIES, SEVERITY_COLOR } from "./constants";

interface KpiStripProps {
  analysis: RiskAnalysis;
}

function highestSeverityPresent(analysis: RiskAnalysis): Severity | null {
  const dist = analysis.summary_stats?.severity_distribution;
  if (!dist) return null;
  for (const sev of SEVERITIES) {
    if ((dist[sev] ?? 0) > 0) return sev;
  }
  return null;
}

function totalFindings(analysis: RiskAnalysis): number {
  if (typeof analysis.total_findings_count === "number") {
    return analysis.total_findings_count;
  }
  const dist = analysis.summary_stats?.severity_distribution;
  if (dist) {
    return Object.values(dist).reduce(
      (acc, n) => acc + (typeof n === "number" ? n : 0),
      0,
    );
  }
  return analysis.scenes.reduce(
    (acc, s) => acc + s.findings.filter((f) => !f.deleted_by_user).length,
    0,
  );
}

function scenesWithFindings(analysis: RiskAnalysis): number {
  if (typeof analysis.scenes_with_findings_count === "number") {
    return analysis.scenes_with_findings_count;
  }
  return analysis.scenes.reduce(
    (acc, s) =>
      acc +
      (s.has_findings ??
      s.findings.some((f) => !f.deleted_by_user)
        ? 1
        : 0),
    0,
  );
}

export default function KpiStrip({ analysis }: KpiStripProps) {
  const total = totalFindings(analysis);
  const scenesHit = scenesWithFindings(analysis);
  const totalScenes =
    analysis.summary_stats?.total_scenes_parsed ?? analysis.scenes.length;
  const highest = highestSeverityPresent(analysis);
  const lowK = analysis.insurance?.premium_low_k;
  const highK = analysis.insurance?.premium_high_k;
  const premiumLine =
    lowK !== undefined && highK !== undefined
      ? `$${lowK}k – $${highK}k`
      : lowK !== undefined
        ? `$${lowK}k+`
        : "—";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Card
        label="Total findings"
        value={total.toLocaleString()}
        icon={<ListChecks size={14} className="text-emerald-500" />}
      />
      <Card
        label="Scenes with risk"
        value={
          totalScenes > 0
            ? `${scenesHit} / ${totalScenes}`
            : scenesHit.toString()
        }
        icon={<Film size={14} className="text-emerald-500" />}
      />
      <Card
        label="Highest severity"
        value={highest ?? "None"}
        valueColor={highest ? SEVERITY_COLOR[highest] : undefined}
        icon={
          <AlertTriangle
            size={14}
            style={{ color: highest ? SEVERITY_COLOR[highest] : undefined }}
            className={highest ? "" : "text-[var(--text-muted)]"}
          />
        }
      />
      <Card
        label="Est. premium"
        value={premiumLine}
        icon={<DollarSign size={14} className="text-emerald-500" />}
      />
    </div>
  );
}

interface CardProps {
  label: string;
  value: string;
  valueColor?: string;
  icon: React.ReactNode;
}

function Card({ label, value, valueColor, icon }: CardProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3">
      <div className="mb-1 flex items-center gap-1.5">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {label}
        </span>
      </div>
      <p
        className="text-xl font-bold tabular-nums text-[var(--text-primary)]"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </p>
    </div>
  );
}
