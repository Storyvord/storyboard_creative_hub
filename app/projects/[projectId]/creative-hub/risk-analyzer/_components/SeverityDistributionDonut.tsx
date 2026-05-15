"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { RiskSeverityBreakdown } from "@/types/risk-analyzer";
import { SEVERITIES, SEVERITY_COLOR } from "./constants";

interface SeverityDistributionDonutProps {
  distribution: RiskSeverityBreakdown;
  totalLabel?: string;
}

interface DonutTooltipPayload {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number; payload: { color: string } }>;
}

function DonutTooltip({ active, payload }: DonutTooltipPayload) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0];
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-xs">
      <span className="font-semibold" style={{ color: p.payload.color }}>
        {p.name}
      </span>
      <span className="ml-2 tabular-nums text-[var(--text-secondary)]">{p.value}</span>
    </div>
  );
}

export default function SeverityDistributionDonut({
  distribution,
  totalLabel = "findings",
}: SeverityDistributionDonutProps) {
  const data = SEVERITIES.map((sev) => ({
    name: sev,
    value: distribution[sev] ?? 0,
    color: SEVERITY_COLOR[sev],
  }));
  const total = data.reduce((acc, d) => acc + d.value, 0);
  const empty = total === 0;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Severity distribution
        </h3>
        <p className="text-[11px] text-[var(--text-muted)]">
          {total} total {totalLabel}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative h-[180px] w-[180px] flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={empty ? [{ name: "empty", value: 1, color: "var(--surface-hover)" }] : data}
                dataKey="value"
                innerRadius={55}
                outerRadius={80}
                strokeWidth={0}
                isAnimationActive={false}
              >
                {(empty ? [{ name: "empty", value: 1, color: "var(--surface-hover)" }] : data).map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              {!empty && <Tooltip content={<DonutTooltip />} />}
            </PieChart>
          </ResponsiveContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold tabular-nums text-[var(--text-primary)]">{total}</span>
            <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)]">{totalLabel}</span>
          </div>
        </div>
        <ul className="flex flex-1 flex-col gap-1.5">
          {data.map((d) => (
            <li key={d.name} className="flex items-center gap-2 text-xs">
              <span
                className="inline-block h-2.5 w-2.5 rounded-sm"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-[var(--text-secondary)]">{d.name}</span>
              <span className="ml-auto tabular-nums text-[var(--text-muted)]">{d.value}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
