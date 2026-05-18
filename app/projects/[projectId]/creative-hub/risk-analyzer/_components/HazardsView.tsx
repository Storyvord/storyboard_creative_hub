"use client";

// Replaces the engineering-centric radial node graph with two views a
// producer can actually act on:
//   1. Horizontal bar chart: count of findings per category, coloured by
//      max severity present in that category.
//   2. Category × scene-order heatmap: shows "Act 2 is full of weapons
//      hazards" patterns at a glance. Built as a CSS grid (recharts'
//      ScatterChart is too heavyweight for a sparse matrix).

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RiskAnalysis, Severity } from "@/types/risk-analyzer";
import { SEVERITIES, SEVERITY_COLOR, categoryLabel } from "./constants";

interface HazardsViewProps {
  analysis: RiskAnalysis;
  /** Click a category bar → jump to Scenes filtered by that slug. */
  onSelectCategory?: (slug: string) => void;
}

interface CategoryRow {
  slug: string;
  label: string;
  count: number;
  maxSeverity: Severity;
  color: string;
}

function rankSev(s: Severity): number {
  return SEVERITIES.indexOf(s);
}

interface BarTooltipPayload {
  active?: boolean;
  payload?: Array<{
    payload: CategoryRow;
  }>;
}

function BarTooltip({ active, payload }: BarTooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs">
      <p className="font-semibold text-[var(--text-primary)]">{row.label}</p>
      <p className="mt-0.5 tabular-nums text-[var(--text-secondary)]">
        {row.count} {row.count === 1 ? "finding" : "findings"}
      </p>
      <p
        className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: row.color }}
      >
        max: {row.maxSeverity}
      </p>
    </div>
  );
}

export default function HazardsView({
  analysis,
  onSelectCategory,
}: HazardsViewProps) {
  const rows = useMemo<CategoryRow[]>(() => {
    const acc: Record<string, CategoryRow> = {};
    for (const scene of analysis.scenes) {
      for (const f of scene.findings) {
        if (f.deleted_by_user) continue;
        const slug = f.category_slug || f.category || "unknown";
        const existing = acc[slug];
        if (existing) {
          existing.count += 1;
          if (rankSev(f.severity) < rankSev(existing.maxSeverity)) {
            existing.maxSeverity = f.severity;
            existing.color = SEVERITY_COLOR[f.severity];
          }
        } else {
          acc[slug] = {
            slug,
            label: categoryLabel(slug, f.category),
            count: 1,
            maxSeverity: f.severity,
            color: SEVERITY_COLOR[f.severity],
          };
        }
      }
    }
    return Object.values(acc).sort((a, b) => b.count - a.count);
  }, [analysis.scenes]);

  // Heatmap matrix: rows = category, cols = scene.order. Cell value is the
  // count of findings; intensity tracks max severity in that cell.
  const matrix = useMemo(() => {
    const orders = analysis.scenes
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((s) => s.order);
    const data: Record<string, Record<number, { count: number; sev: Severity }>> =
      {};
    for (const scene of analysis.scenes) {
      for (const f of scene.findings) {
        if (f.deleted_by_user) continue;
        const slug = f.category_slug || f.category || "unknown";
        if (!data[slug]) data[slug] = {};
        const cell = data[slug][scene.order];
        if (cell) {
          cell.count += 1;
          if (rankSev(f.severity) < rankSev(cell.sev)) cell.sev = f.severity;
        } else {
          data[slug][scene.order] = { count: 1, sev: f.severity };
        }
      }
    }
    return { orders, data };
  }, [analysis.scenes]);

  if (rows.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
        No hazards classified yet.
      </div>
    );
  }

  // Bar chart height scales with row count so labels stay legible.
  const chartHeight = Math.max(220, rows.length * 30);

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <header className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Findings by category
          </h3>
          <p className="text-[11px] text-[var(--text-muted)]">
            Click a bar to filter the Scenes tab
          </p>
        </header>
        <div style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              layout="vertical"
              data={rows}
              margin={{ top: 4, right: 16, bottom: 4, left: 8 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="var(--border)"
                horizontal={false}
              />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: "var(--text-muted)", fontSize: 10 }}
                axisLine={{ stroke: "var(--border)" }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="label"
                width={170}
                tick={{ fill: "var(--text-secondary)", fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<BarTooltip />}
                cursor={{ fill: "var(--surface-hover)", opacity: 0.4 }}
              />
              <Bar
                dataKey="count"
                radius={[0, 3, 3, 0]}
                onClick={(d: unknown) => {
                  const row = (d as { payload?: CategoryRow })?.payload;
                  if (row) onSelectCategory?.(row.slug);
                }}
                cursor="pointer"
              >
                {rows.map((r) => (
                  <Cell key={r.slug} fill={r.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <header className="mb-3 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Category × scene heatmap
          </h3>
          <p className="text-[11px] text-[var(--text-muted)]">
            Colour = severity, number = findings in that scene
          </p>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full border-separate border-spacing-0 text-[10px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 text-left font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  Category
                </th>
                {matrix.orders.map((o) => (
                  <th
                    key={o}
                    className="px-1 py-1 text-center font-semibold tabular-nums text-[var(--text-muted)]"
                  >
                    {o}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.slug}>
                  <td
                    className="sticky left-0 z-10 bg-[var(--surface)] px-2 py-1 text-[var(--text-secondary)]"
                    title={row.label}
                  >
                    <span className="line-clamp-1">{row.label}</span>
                  </td>
                  {matrix.orders.map((o) => {
                    const cell = matrix.data[row.slug]?.[o];
                    if (!cell) {
                      return (
                        <td
                          key={o}
                          className="border border-[var(--border)] px-1 py-1 text-center text-[var(--text-muted)]"
                        />
                      );
                    }
                    return (
                      <td
                        key={o}
                        className="border border-[var(--border)] px-1 py-1 text-center font-semibold tabular-nums text-white"
                        style={{
                          backgroundColor: SEVERITY_COLOR[cell.sev],
                          // Slightly soften the cell when count is 1 so heavy
                          // hot-spots stand out visually.
                          opacity: cell.count > 1 ? 1 : 0.7,
                        }}
                        title={`${row.label} · Scene ${o} · ${cell.count} ${cell.sev}`}
                      >
                        {cell.count}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-[10px]">
          <span className="font-semibold uppercase tracking-wider text-[var(--text-muted)]">
            Severity
          </span>
          {SEVERITIES.map((sev) => (
            <span key={sev} className="inline-flex items-center gap-1.5">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: SEVERITY_COLOR[sev] }}
              />
              <span className="text-[var(--text-secondary)]">{sev}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
