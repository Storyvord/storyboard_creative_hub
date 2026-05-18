"use client";

// Top-N riskiest scenes for the Overview tab — ranked by
// `exposure_contribution` descending. Click-through hands a sceneId back to
// the parent so the dashboard can switch to the Scenes tab and scroll the
// row into view.

import { ChevronRight } from "lucide-react";
import { RiskScene } from "@/types/risk-analyzer";
import { SEVERITIES, SEVERITY_COLOR } from "./constants";

interface TopRiskScenesProps {
  scenes: RiskScene[];
  limit?: number;
  onSelectScene?: (sceneId: number) => void;
}

export default function TopRiskScenes({
  scenes,
  limit = 5,
  onSelectScene,
}: TopRiskScenesProps) {
  const ranked = scenes
    .filter((s) => {
      const hasAny = s.has_findings ?? s.findings.some((f) => !f.deleted_by_user);
      return hasAny;
    })
    .slice()
    .sort(
      (a, b) =>
        (b.exposure_contribution ?? 0) - (a.exposure_contribution ?? 0),
    )
    .slice(0, limit);

  if (ranked.length === 0) {
    return (
      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <h3 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
          Top riskiest scenes
        </h3>
        <p className="text-xs text-[var(--text-muted)]">
          No scenes have findings yet.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <header className="border-b border-[var(--border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Top riskiest scenes
        </h3>
      </header>
      <ul className="divide-y divide-[var(--border)]">
        {ranked.map((scene) => {
          const total = scene.findings.filter((f) => !f.deleted_by_user).length;
          return (
            <li key={scene.scene_id}>
              <button
                type="button"
                onClick={() => onSelectScene?.(scene.scene_id)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--surface-hover)]"
              >
                <span className="flex-shrink-0 text-[10px] font-semibold text-[var(--text-muted)]">
                  Scene {scene.order}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-[var(--text-primary)]">
                  {scene.heading}
                </span>
                <span className="flex flex-shrink-0 items-center gap-1">
                  {SEVERITIES.map((sev) => {
                    const n = scene.severity_breakdown?.[sev] ?? 0;
                    if (n === 0) return null;
                    return (
                      <span
                        key={sev}
                        className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums"
                        style={{
                          backgroundColor: `${SEVERITY_COLOR[sev]}22`,
                          color: SEVERITY_COLOR[sev],
                        }}
                        title={`${n} ${sev}`}
                      >
                        {n}
                      </span>
                    );
                  })}
                  <span className="ml-1.5 text-[10px] tabular-nums text-[var(--text-muted)]">
                    {scene.exposure_contribution?.toFixed?.(1) ??
                      scene.exposure_contribution}{" "}
                    exp · {total} {total === 1 ? "finding" : "findings"}
                  </span>
                </span>
                <ChevronRight
                  size={12}
                  className="flex-shrink-0 text-[var(--text-muted)]"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
