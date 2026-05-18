"use client";

import { RiskEditSummary, RiskInsurance } from "@/types/risk-analyzer";
import { scoreColor } from "./constants";

/**
 * Radial score gauge. Hand-rolled SVG (recharts' RadialBarChart adds layout
 * weight we don't need for a single-value gauge). The score range 100–900
 * maps to a 270° arc starting at -225° clockwise.
 *
 * Palette per FRONTEND_INTEGRATION.md §5:
 *   ≥850 green #10b981   650–849 amber #f59e0b   <650 red #ef4444
 */

interface ScoreGaugeProps {
  score: number;
  insurance: RiskInsurance;
  editSummary?: RiskEditSummary | null;
}

const SCORE_MIN = 100;
const SCORE_MAX = 900;
const ARC_START_DEG = -225;
const ARC_END_DEG = 45; // 270° sweep
const ARC_RADIUS = 78;
const SIZE = 200;
const CENTER = SIZE / 2;
const STROKE = 14;

function polar(angleDeg: number, r: number) {
  const a = (angleDeg * Math.PI) / 180;
  return { x: CENTER + r * Math.cos(a), y: CENTER + r * Math.sin(a) };
}

function arcPath(startDeg: number, endDeg: number, r: number): string {
  const start = polar(startDeg, r);
  const end = polar(endDeg, r);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function scoreToAngle(score: number): number {
  const clamped = Math.min(Math.max(score, SCORE_MIN), SCORE_MAX);
  const t = (clamped - SCORE_MIN) / (SCORE_MAX - SCORE_MIN);
  return ARC_START_DEG + t * (ARC_END_DEG - ARC_START_DEG);
}

export default function ScoreGauge({ score, insurance, editSummary }: ScoreGaugeProps) {
  const color = scoreColor(score);
  const fullArc = arcPath(ARC_START_DEG, ARC_END_DEG, ARC_RADIUS);
  const valueArc = arcPath(ARC_START_DEG, scoreToAngle(score), ARC_RADIUS);

  const aiBaseline = editSummary?.ai_only_score;
  const deltaRaw = editSummary?.delta;
  const deltaNum =
    typeof deltaRaw === "number"
      ? deltaRaw
      : typeof deltaRaw === "string" && deltaRaw.length > 0
        ? Number(deltaRaw)
        : 0;
  const hasDelta = Number.isFinite(deltaNum) && deltaNum !== 0;
  const deltaSign = deltaNum > 0 ? "+" : "";

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex flex-col items-center sm:flex-row sm:items-stretch sm:gap-6">
        <div className="relative flex-shrink-0">
          <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden>
            <path
              d={fullArc}
              fill="none"
              stroke="var(--surface-hover)"
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
            <path
              d={valueArc}
              fill="none"
              stroke={color}
              strokeWidth={STROKE}
              strokeLinecap="round"
            />
            {aiBaseline !== undefined && hasDelta && (
              <circle
                cx={polar(scoreToAngle(aiBaseline), ARC_RADIUS).x}
                cy={polar(scoreToAngle(aiBaseline), ARC_RADIUS).y}
                r={4}
                fill="var(--surface)"
                stroke="var(--text-muted)"
                strokeWidth={2}
              />
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums" style={{ color }}>
              {Math.round(score)}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Risk score
            </span>
          </div>
        </div>

        <div className="mt-4 flex flex-1 flex-col justify-center gap-2 sm:mt-0">
          <div className="flex items-center gap-2">
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider"
              style={{ backgroundColor: `${color}22`, color }}
            >
              {insurance.tier}
            </span>
            <span className="text-[11px] text-[var(--text-muted)]">
              ×{insurance.multiplier?.toFixed?.(2) ?? insurance.multiplier} multiplier
            </span>
          </div>

          {(insurance.premium_low_k !== undefined || insurance.premium_high_k !== undefined) && (
            <p className="text-xs text-[var(--text-secondary)]">
              Premium range:{" "}
              <span className="font-semibold">
                ${insurance.premium_low_k ?? "—"}k – ${insurance.premium_high_k ?? "—"}k
              </span>
            </p>
          )}

          {insurance.tier_riders && (
            <p className="text-[11px] text-[var(--text-muted)]">
              Riders: <span className="text-[var(--text-secondary)]">{insurance.tier_riders}</span>
            </p>
          )}

          {hasDelta && aiBaseline !== undefined && (
            <p className="text-[11px] text-[var(--text-muted)] mt-1">
              AI baseline: <span className="tabular-nums">{aiBaseline}</span> → current:{" "}
              <span className="tabular-nums">{score}</span>{" "}
              <span
                className={deltaNum > 0 ? "text-emerald-500" : "text-red-500"}
              >
                ({deltaSign}
                {deltaNum.toFixed(0)})
              </span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
