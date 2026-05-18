"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Plus } from "lucide-react";
import { RiskFinding, RiskScene } from "@/types/risk-analyzer";
import FindingCard from "./FindingCard";
import MitigationPanel from "./MitigationPanel";
import { SEVERITIES, SEVERITY_COLOR } from "./constants";

interface SceneDrillDownListProps {
  scenes: RiskScene[];
  readOnly?: boolean;
  onEditFinding?: (sceneId: number, finding: RiskFinding) => void;
  onAddFinding?: (sceneId: number) => void;
  onDeleteFinding?: (finding: RiskFinding) => void;
  onRestoreFinding?: (finding: RiskFinding) => void;
  onRevertFinding?: (finding: RiskFinding) => void;
  onApproveFinding?: (finding: RiskFinding, approve: boolean) => void;
  onPatchMitigation?: (mitigationId: number, body: { recommendation?: string; equipment_needed?: string; personnel_required?: string }) => Promise<void> | void;
  onCreateMitigation?: (findingId: number, body: { recommendation: string; equipment_needed?: string; personnel_required?: string }) => Promise<void> | void;
  onRevertMitigation?: (mitigationId: number) => Promise<void> | void;
  onUploadEvidence?: (findingId: number, file: File) => Promise<void> | void;
}

/**
 * One expandable card per scene with severity-breakdown chips, findings,
 * and mitigations. Click the card header to expand/collapse; click the
 * severity chip set to filter to just that severity within the scene.
 */
export default function SceneDrillDownList({
  scenes,
  readOnly,
  onEditFinding,
  onAddFinding,
  onDeleteFinding,
  onRestoreFinding,
  onRevertFinding,
  onApproveFinding,
  onPatchMitigation,
  onCreateMitigation,
  onRevertMitigation,
  onUploadEvidence,
}: SceneDrillDownListProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});
  const [showDeleted, setShowDeleted] = useState(false);

  const sorted = useMemo(
    () => scenes.slice().sort((a, b) => a.order - b.order),
    [scenes],
  );

  if (sorted.length === 0) {
    return (
      <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
        No scenes to display.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
        <h3 className="text-sm font-semibold text-[var(--text-primary)]">
          Scene findings ({sorted.length} {sorted.length === 1 ? "scene" : "scenes"})
        </h3>
        <button
          type="button"
          onClick={() => setShowDeleted((v) => !v)}
          className="inline-flex items-center gap-1 rounded px-2 py-1 text-[11px] text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
        >
          {showDeleted ? <EyeOff size={12} /> : <Eye size={12} />}
          {showDeleted ? "Hide deleted" : "Show deleted"}
        </button>
      </header>

      <ul className="divide-y divide-[var(--border)]">
        {sorted.map((scene) => {
          const isOpen = !!expanded[scene.scene_id];
          const totalFindings = scene.findings.reduce(
            (acc, f) => acc + (f.deleted_by_user ? 0 : 1),
            0,
          );
          const visibleFindings = scene.findings.filter(
            (f) => showDeleted || !f.deleted_by_user,
          );
          return (
            <li key={scene.scene_id}>
              <button
                type="button"
                onClick={() => setExpanded((m) => ({ ...m, [scene.scene_id]: !m[scene.scene_id] }))}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-[var(--surface-hover)]"
              >
                <span className="flex-shrink-0 text-[var(--text-muted)]">
                  {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </span>
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
                  <span className="ml-1.5 text-[10px] text-[var(--text-muted)]">
                    {totalFindings} {totalFindings === 1 ? "finding" : "findings"}
                  </span>
                </span>
              </button>

              {isOpen && (
                <div className="space-y-2 bg-[var(--background)] px-4 py-3">
                  {visibleFindings.length === 0 ? (
                    <p className="text-xs italic text-[var(--text-muted)]">
                      No findings in this scene.
                    </p>
                  ) : (
                    visibleFindings.map((f) => {
                      const mit = scene.mitigations.find((m) => m.finding_id === f.id) ?? null;
                      return (
                        <div key={f.id}>
                          <FindingCard
                            finding={f}
                            readOnly={readOnly}
                            onEdit={(fnd) => onEditFinding?.(scene.scene_id, fnd)}
                            onDelete={(fnd) => onDeleteFinding?.(fnd)}
                            onRestore={(fnd) => onRestoreFinding?.(fnd)}
                            onRevert={(fnd) => onRevertFinding?.(fnd)}
                            onApprove={(fnd, approve) => onApproveFinding?.(fnd, approve)}
                          />
                          {!f.deleted_by_user && (
                            <MitigationPanel
                              finding={f}
                              mitigation={mit}
                              readOnly={readOnly}
                              onPatch={onPatchMitigation}
                              onCreate={onCreateMitigation}
                              onRevert={onRevertMitigation}
                              onUploadEvidence={onUploadEvidence}
                            />
                          )}
                        </div>
                      );
                    })
                  )}

                  {!readOnly && (
                    <button
                      type="button"
                      onClick={() => onAddFinding?.(scene.scene_id)}
                      className="mt-2 inline-flex items-center gap-1 rounded-md border border-dashed border-[var(--border)] px-2 py-1 text-xs text-[var(--text-muted)] hover:border-emerald-500/40 hover:text-emerald-500"
                    >
                      <Plus size={12} /> Add finding
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
