"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RiskScene } from "@/types/risk-analyzer";

/**
 * Line chart of `projected_score` per scene in scene-order ascending.
 * Reference bands at the 850 (Standard) and 650 (Elevated) thresholds
 * make it visually obvious where the running score crosses each band.
 */

interface CumulativeExposureChartProps {
  scenes: RiskScene[];
}

interface ChartDatum {
  order: number;
  heading: string;
  projected_score: number;
  cumulative_deduction: number;
  exposure_contribution: number;
}

interface TooltipPayloadShape {
  active?: boolean;
  payload?: Array<{ payload: ChartDatum }>;
}

function ChartTooltip({ active, payload }: TooltipPayloadShape) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload;
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-[var(--text-primary)] mb-1">
        Scene {datum.order} · {datum.heading}
      </p>
      <p className="text-[var(--text-secondary)]">
        Projected score: <span className="tabular-nums font-medium">{Math.round(datum.projected_score)}</span>
      </p>
      <p className="text-[var(--text-muted)]">
        Δ exposure: <span className="tabular-nums">{datum.exposure_contribution.toFixed(1)}</span>
      </p>
      <p className="text-[var(--text-muted)]">
        Cumulative: <span className="tabular-nums">{datum.cumulative_deduction.toFixed(1)}</span>
      </p>
    </div>
  );
}

export default function CumulativeExposureChart({ scenes }: CumulativeExposureChartProps) {
  if (!scenes || scenes.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
        No scene data yet.
      </div>
    );
  }
  const data: ChartDatum[] = scenes
    .slice()
    .sort((a, b) => a.order - b.order)
    .map((s) => ({
      order: s.order,
      heading: s.heading,
      projected_score: s.projected_score,
      cumulative_deduction: s.cumulative_deduction,
      exposure_contribution: s.exposure_contribution,
    }));

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Cumulative exposure
        </h3>
        <p className="text-[11px] text-[var(--text-muted)]">
          Projected score per scene · bands at 850 / 650
        </p>
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" opacity={0.4} />
            <XAxis
              dataKey="order"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            />
            <YAxis
              domain={[100, 900]}
              ticks={[100, 300, 500, 650, 850, 900]}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            />
            <ReferenceLine y={850} stroke="#10b981" strokeDasharray="4 4" />
            <ReferenceLine y={650} stroke="#f59e0b" strokeDasharray="4 4" />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--text-muted)", strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="projected_score"
              stroke="#22c55e"
              strokeWidth={2}
              dot={{ r: 3, fill: "#22c55e" }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
