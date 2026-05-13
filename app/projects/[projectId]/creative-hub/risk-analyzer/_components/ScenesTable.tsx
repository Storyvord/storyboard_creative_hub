"use client";

// Producer-facing scene-by-scene risk table. Replaces the Overview drill-down
// list with a real sortable/filterable surface — and uses the optional
// `scene.has_findings` hint so a cancelled-with-no-findings run reports
// "No risk identified" instead of a misleading max-score.

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  ExternalLink,
  Filter,
  X,
} from "lucide-react";
import Link from "next/link";
import { RiskFinding, RiskScene, Severity, Source } from "@/types/risk-analyzer";
import FindingCard from "./FindingCard";
import MitigationPanel from "./MitigationPanel";
import { RISK_CATEGORIES, SEVERITIES, SEVERITY_COLOR, categoryLabel } from "./constants";

type SortKey = "order" | "heading" | "exposure" | "count";

interface ScenesTableProps {
  scenes: RiskScene[];
  projectId: string;
  readOnly?: boolean;
  /** Category slug to pre-filter to (set by Hazards-tab click-through). */
  initialCategoryFilter?: string | null;
  /** Scene ID to expand on first render (set by Top-N click-through). */
  initialExpandedSceneId?: number | null;
  onEditFinding?: (sceneId: number, finding: RiskFinding) => void;
  onAddFinding?: (sceneId: number) => void;
  onDeleteFinding?: (finding: RiskFinding) => void;
  onRestoreFinding?: (finding: RiskFinding) => void;
  onRevertFinding?: (finding: RiskFinding) => void;
  onApproveFinding?: (finding: RiskFinding, approve: boolean) => void;
  onPatchMitigation?: (
    mitigationId: number,
    body: {
      recommendation?: string;
      equipment_needed?: string;
      personnel_required?: string;
    },
  ) => Promise<void> | void;
  onCreateMitigation?: (
    findingId: number,
    body: {
      recommendation: string;
      equipment_needed?: string;
      personnel_required?: string;
    },
  ) => Promise<void> | void;
  onRevertMitigation?: (mitigationId: number) => Promise<void> | void;
  onUploadEvidence?: (findingId: number, file: File) => Promise<void> | void;
}

const SOURCE_OPTIONS: Array<{ value: Source; label: string }> = [
  { value: "ai", label: "AI" },
  { value: "ai_critic", label: "AI · Critic" },
  { value: "ai_metadata_rule", label: "AI · Rule" },
  { value: "user_added", label: "User added" },
  { value: "user_modified", label: "User modified" },
];

function totalFindings(scene: RiskScene): number {
  return scene.findings.filter((f) => !f.deleted_by_user).length;
}

function sceneHasFindings(scene: RiskScene): boolean {
  return scene.has_findings ?? scene.findings.some((f) => !f.deleted_by_user);
}

export default function ScenesTable({
  scenes,
  projectId,
  readOnly,
  initialCategoryFilter,
  initialExpandedSceneId,
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
}: ScenesTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("order");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [severityFilters, setSeverityFilters] = useState<Set<Severity>>(
    () => new Set(),
  );
  const [sourceFilters, setSourceFilters] = useState<Set<Source>>(
    () => new Set(),
  );
  const [categoryFilter, setCategoryFilter] = useState<string>(
    initialCategoryFilter ?? "",
  );
  const [expanded, setExpanded] = useState<Record<number, boolean>>(() =>
    initialExpandedSceneId !== null && initialExpandedSceneId !== undefined
      ? { [initialExpandedSceneId]: true }
      : {},
  );

  const filtered = useMemo(() => {
    return scenes.filter((scene) => {
      const visible = scene.findings.filter((f) => !f.deleted_by_user);
      // Apply finding-level filters — a scene matches when at least one of
      // its non-deleted findings passes every active filter.
      const sevOk =
        severityFilters.size === 0 ||
        visible.some((f) => severityFilters.has(f.severity));
      const srcOk =
        sourceFilters.size === 0 ||
        visible.some((f) => sourceFilters.has(f.source));
      const catOk =
        !categoryFilter ||
        visible.some(
          (f) => (f.category_slug || "").toLowerCase() === categoryFilter,
        );
      return sevOk && srcOk && catOk;
    });
  }, [scenes, severityFilters, sourceFilters, categoryFilter]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return filtered.slice().sort((a, b) => {
      switch (sortKey) {
        case "heading":
          return a.heading.localeCompare(b.heading) * dir;
        case "exposure":
          return (
            ((a.exposure_contribution ?? 0) - (b.exposure_contribution ?? 0)) *
            dir
          );
        case "count":
          return (totalFindings(a) - totalFindings(b)) * dir;
        case "order":
        default:
          return ((a.order ?? 0) - (b.order ?? 0)) * dir;
      }
    });
  }, [filtered, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function toggleSet<T>(set: Set<T>, value: T): Set<T> {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    return next;
  }

  const activeFilterCount =
    severityFilters.size + sourceFilters.size + (categoryFilter ? 1 : 0);

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)]">
      {/* Filter bar */}
      <header className="flex flex-wrap items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          <Filter size={12} /> Filter
        </div>
        <div className="flex flex-wrap items-center gap-1">
          {SEVERITIES.map((sev) => {
            const on = severityFilters.has(sev);
            return (
              <button
                key={sev}
                type="button"
                onClick={() =>
                  setSeverityFilters((s) => toggleSet(s, sev))
                }
                className="rounded-full px-2 py-0.5 text-[10px] font-semibold transition-colors"
                style={{
                  backgroundColor: on
                    ? SEVERITY_COLOR[sev]
                    : `${SEVERITY_COLOR[sev]}22`,
                  color: on ? "#fff" : SEVERITY_COLOR[sev],
                }}
              >
                {sev}
              </button>
            );
          })}
        </div>
        <select
          value=""
          onChange={(e) => {
            const v = e.target.value as Source | "";
            if (v) setSourceFilters((s) => toggleSet(s, v));
          }}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[11px] text-[var(--text-secondary)]"
        >
          <option value="">+ Source</option>
          {SOURCE_OPTIONS.filter((o) => !sourceFilters.has(o.value)).map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        {[...sourceFilters].map((src) => (
          <span
            key={src}
            className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-500"
          >
            {SOURCE_OPTIONS.find((o) => o.value === src)?.label ?? src}
            <button
              type="button"
              onClick={() => setSourceFilters((s) => toggleSet(s, src))}
              aria-label={`Remove ${src} filter`}
            >
              <X size={10} />
            </button>
          </span>
        ))}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[11px] text-[var(--text-secondary)]"
        >
          <option value="">All categories</option>
          {RISK_CATEGORIES.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.label}
            </option>
          ))}
        </select>
        {activeFilterCount > 0 && (
          <button
            type="button"
            onClick={() => {
              setSeverityFilters(new Set());
              setSourceFilters(new Set());
              setCategoryFilter("");
            }}
            className="ml-auto inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            <X size={10} /> Clear ({activeFilterCount})
          </button>
        )}
      </header>

      {/* Table header */}
      <div className="grid grid-cols-[44px_minmax(0,1fr)_120px_72px_72px_44px] gap-2 border-b border-[var(--border)] px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
        <SortableHeader
          label="#"
          active={sortKey === "order"}
          dir={sortDir}
          onClick={() => toggleSort("order")}
        />
        <SortableHeader
          label="Heading"
          active={sortKey === "heading"}
          dir={sortDir}
          onClick={() => toggleSort("heading")}
        />
        <span>Severity</span>
        <SortableHeader
          label="Exposure"
          active={sortKey === "exposure"}
          dir={sortDir}
          onClick={() => toggleSort("exposure")}
          align="right"
        />
        <SortableHeader
          label="Findings"
          active={sortKey === "count"}
          dir={sortDir}
          onClick={() => toggleSort("count")}
          align="right"
        />
        <span />
      </div>

      {sorted.length === 0 ? (
        <div className="px-4 py-6 text-center text-xs text-[var(--text-muted)]">
          No scenes match the current filters.
        </div>
      ) : (
        <ul className="divide-y divide-[var(--border)]">
          {sorted.map((scene) => {
            const isOpen = !!expanded[scene.scene_id];
            const total = totalFindings(scene);
            const hasFindings = sceneHasFindings(scene);
            return (
              <li key={scene.scene_id}>
                <div
                  className="grid cursor-pointer grid-cols-[44px_minmax(0,1fr)_120px_72px_72px_44px] items-center gap-2 px-4 py-2.5 hover:bg-[var(--surface-hover)]"
                  onClick={() =>
                    setExpanded((m) => ({
                      ...m,
                      [scene.scene_id]: !m[scene.scene_id],
                    }))
                  }
                >
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--text-muted)]">
                    {isOpen ? (
                      <ChevronDown size={12} />
                    ) : (
                      <ChevronRight size={12} />
                    )}
                    {scene.order}
                  </span>
                  <span className="min-w-0 truncate text-xs font-medium text-[var(--text-primary)]">
                    {scene.heading}
                  </span>
                  <span className="flex flex-wrap items-center gap-1">
                    {hasFindings ? (
                      SEVERITIES.map((sev) => {
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
                      })
                    ) : (
                      <span className="text-[10px] italic text-[var(--text-muted)]">
                        No risk identified
                      </span>
                    )}
                  </span>
                  <span className="text-right text-[11px] tabular-nums text-[var(--text-secondary)]">
                    {hasFindings
                      ? scene.exposure_contribution?.toFixed?.(1) ??
                        scene.exposure_contribution
                      : "—"}
                  </span>
                  <span className="text-right text-[11px] tabular-nums text-[var(--text-secondary)]">
                    {hasFindings ? total : 0}
                  </span>
                  <span className="flex justify-end">
                    <Link
                      href={`/projects/${projectId}/creative-hub/scenes/${scene.scene_id}`}
                      onClick={(e) => e.stopPropagation()}
                      aria-label={`Open scene ${scene.order} detail page`}
                      className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--surface)] hover:text-emerald-500"
                    >
                      <ExternalLink size={12} />
                    </Link>
                  </span>
                </div>

                {isOpen && (
                  <div className="space-y-2 bg-[var(--background)] px-4 py-3">
                    {scene.findings.filter((f) => !f.deleted_by_user).length ===
                    0 ? (
                      <p className="text-xs italic text-[var(--text-muted)]">
                        No risk identified for this scene.
                      </p>
                    ) : (
                      scene.findings
                        .filter((f) => !f.deleted_by_user)
                        .map((f) => {
                          const mit =
                            scene.mitigations.find(
                              (m) => m.finding_id === f.id,
                            ) ?? null;
                          return (
                            <div key={f.id}>
                              <FindingCard
                                finding={f}
                                readOnly={readOnly}
                                onEdit={(fnd) =>
                                  onEditFinding?.(scene.scene_id, fnd)
                                }
                                onDelete={onDeleteFinding}
                                onRestore={onRestoreFinding}
                                onRevert={onRevertFinding}
                                onApprove={onApproveFinding}
                              />
                              <MitigationPanel
                                finding={f}
                                mitigation={mit}
                                readOnly={readOnly}
                                onPatch={onPatchMitigation}
                                onCreate={onCreateMitigation}
                                onRevert={onRevertMitigation}
                                onUploadEvidence={onUploadEvidence}
                              />
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
                        + Add finding
                      </button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {categoryFilter && (
        <footer className="border-t border-[var(--border)] px-4 py-2 text-[11px] text-[var(--text-muted)]">
          Filtered to category:{" "}
          <span className="font-semibold text-[var(--text-secondary)]">
            {categoryLabel(categoryFilter)}
          </span>
        </footer>
      )}
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  align?: "left" | "right";
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
  align,
}: SortableHeaderProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
        active ? "text-[var(--text-primary)]" : "text-[var(--text-muted)]"
      } ${align === "right" ? "justify-end" : ""}`}
    >
      {label}
      {active &&
        (dir === "asc" ? <ChevronUp size={10} /> : <ChevronDown size={10} />)}
    </button>
  );
}
