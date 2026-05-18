"use client";

// Top-N most common hazard categories for the Overview tab. Aggregates
// findings by `category_slug`, sorts by count desc, surfaces a max-severity
// badge so producers can scan "what dominates this script" in one glance.

import { useMemo } from "react";
import { RiskAnalysis, Severity } from "@/types/risk-analyzer";
import { SEVERITIES, SEVERITY_COLOR, categoryLabel } from "./constants";

interface TopHazardsProps {
  analysis: RiskAnalysis;
  limit?: number;
  onSelectCategory?: (slug: string) => void;
}

interface HazardRow {
  slug: string;
  label: string;
  count: number;
  maxSeverity: Severity;
}

function severityRank(s: Severity): number {
  // Critical = 0 (worst), Low = 3 (best).
  return SEVERITIES.indexOf(s);
}

export default function TopHazards({
  analysis,
  limit = 5,
  onSelectCategory,
}: TopHazardsProps) {
  const rows = useMemo<HazardRow[]>(() => {
    const acc: Record<string, HazardRow> = {};
    for (const scene of analysis.scenes) {
      for (const f of scene.findings) {
        if (f.deleted_by_user) continue;
        const slug = f.category_slug || f.category || "unknown";
        const label = categoryLabel(slug, f.category);
        const existing = acc[slug];
        if (existing) {
          existing.count += 1;
          if (severityRank(f.severity) < severityRank(existing.maxSeverity)) {
            existing.maxSeverity = f.severity;
          }
        } else {
          acc[slug] = {
            slug,
            label,
            count: 1,
            maxSeverity: f.severity,
          };
        }
      }
    }
    return Object.values(acc)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  }, [analysis.scenes, limit]);

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
          Top hazards
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          No hazards classified yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <header className="border-b border-[var(--border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Most common hazards
        </h3>
      </header>
      <ul className="divide-y divide-[var(--border)]">
        {rows.map((row) => (
          <li key={row.slug}>
            <button
              type="button"
              onClick={() => onSelectCategory?.(row.slug)}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--surface-hover)]"
            >
              <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--text-primary)]">
                {row.label}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                style={{
                  backgroundColor: `${SEVERITY_COLOR[row.maxSeverity]}22`,
                  color: SEVERITY_COLOR[row.maxSeverity],
                }}
              >
                {row.maxSeverity}
              </span>
              <span className="ml-1 w-10 flex-shrink-0 text-right text-[11px] tabular-nums font-semibold text-[var(--text-secondary)]">
                {row.count}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
