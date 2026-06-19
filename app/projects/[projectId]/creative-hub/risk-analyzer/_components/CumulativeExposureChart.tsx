"use client";

import {
  CartesianGrid,
  Legend,
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
 * Two-line chart over scenes (scene-order ascending):
 *
 *   1. Projected score (cumulative) — left axis. The running insurability
 *      score `MAX × exp(-Σexposure / K)`; only ever falls as exposure
 *      accumulates. Reference bands at 850 (Standard) / 650 (Elevated).
 *   2. Scene exposure (per scene) — right axis. Each scene's OWN risk
 *      magnitude (`exposure_contribution`), independent of the running
 *      total. This is what tells you a single scene is calm even when the
 *      cumulative score has already bottomed out from earlier scenes.
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

const SCORE_COLOR = "#22c55e";
const EXPOSURE_COLOR = "#ef4444";

function ChartTooltip({ active, payload }: TooltipPayloadShape) {
  if (!active || !payload || payload.length === 0) return null;
  const datum = payload[0].payload;
  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs shadow-lg">
      <p className="font-semibold text-[var(--text-primary)] mb-1">
        Scene {datum.order} · {datum.heading}
      </p>
      <p className="text-[var(--text-secondary)]">
        Scene exposure:{" "}
        <span className="tabular-nums font-medium" style={{ color: EXPOSURE_COLOR }}>
          {datum.exposure_contribution.toFixed(1)}
        </span>
      </p>
      <p className="text-[var(--text-secondary)]">
        Projected score (cumulative):{" "}
        <span className="tabular-nums font-medium" style={{ color: SCORE_COLOR }}>
          {Math.round(datum.projected_score)}
        </span>
      </p>
      <p className="text-[var(--text-muted)]">
        Cumulative exposure:{" "}
        <span className="tabular-nums">{datum.cumulative_deduction.toFixed(1)}</span>
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
          Risk by scene
        </h3>
        <p className="text-[11px] text-[var(--text-muted)]">
          Cumulative score vs per-scene exposure · bands at 850 / 650
        </p>
      </div>
      <div className="h-[260px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" opacity={0.4} />
            <XAxis
              dataKey="order"
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fontSize: 11, fill: "var(--text-muted)" }}
            />
            <YAxis
              yAxisId="score"
              domain={[100, 900]}
              ticks={[100, 300, 500, 650, 850, 900]}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fontSize: 11, fill: SCORE_COLOR }}
              width={36}
            />
            <YAxis
              yAxisId="exposure"
              orientation="right"
              domain={[0, "auto"]}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              tick={{ fontSize: 11, fill: EXPOSURE_COLOR }}
              width={36}
            />
            <ReferenceLine yAxisId="score" y={850} stroke="#10b981" strokeDasharray="4 4" />
            <ReferenceLine yAxisId="score" y={650} stroke="#f59e0b" strokeDasharray="4 4" />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "var(--text-muted)", strokeWidth: 1 }} />
            <Legend
              verticalAlign="top"
              align="left"
              height={28}
              iconType="plainline"
              wrapperStyle={{ fontSize: 11, paddingBottom: 4 }}
            />
            <Line
              yAxisId="score"
              name="Projected score (cumulative)"
              type="monotone"
              dataKey="projected_score"
              stroke={SCORE_COLOR}
              strokeWidth={2}
              dot={{ r: 2, fill: SCORE_COLOR }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="exposure"
              name="Scene exposure (per scene)"
              type="monotone"
              dataKey="exposure_contribution"
              stroke={EXPOSURE_COLOR}
              strokeWidth={2}
              dot={{ r: 2, fill: EXPOSURE_COLOR }}
              activeDot={{ r: 5 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
