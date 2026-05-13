"use client";

import { useMemo, useState } from "react";
import { RiskGraph as RiskGraphData, RiskGraphNode, Severity } from "@/types/risk-analyzer";
import { SEVERITIES, SEVERITY_COLOR } from "./constants";

/**
 * Plain-SVG radial layout for the risk graph. v1 intentionally avoids a
 * force-directed layout lib — scene nodes ring the outer circle and
 * risk-category nodes ring an inner circle, with edges drawn straight
 * between them. Location and action nodes share the slate ring with the
 * risks (smaller).
 */

interface RiskGraphProps {
  graph: RiskGraphData;
}

const SIZE = 520;
const CENTER = SIZE / 2;
const OUTER_R = 220;
const INNER_R = 110;

export default function RiskGraph({ graph }: RiskGraphProps) {
  const [severityFilter, setSeverityFilter] = useState<Set<Severity>>(new Set());
  const [hoverNode, setHoverNode] = useState<string | null>(null);

  const { sceneNodes, riskNodes, otherNodes } = useMemo(() => {
    const scenes: RiskGraphNode[] = [];
    const risks: RiskGraphNode[] = [];
    const others: RiskGraphNode[] = [];
    for (const n of graph.nodes ?? []) {
      if (n.group === "scene") scenes.push(n);
      else if (n.group === "risk") risks.push(n);
      else others.push(n);
    }
    return { sceneNodes: scenes, riskNodes: risks, otherNodes: others };
  }, [graph.nodes]);

  // Filter scenes by severity (ANDed via "has any edge to a risk of selected sev").
  const visibleSceneIds = useMemo(() => {
    if (severityFilter.size === 0) return new Set(sceneNodes.map((n) => n.id));
    const ok = new Set<string>();
    for (const e of graph.edges ?? []) {
      if (!e.severity) continue;
      if (severityFilter.has(e.severity)) ok.add(e.source);
    }
    return ok;
  }, [severityFilter, sceneNodes, graph.edges]);

  // Compute node positions: scenes on the outer ring, risks on the inner ring,
  // others on the inner ring after risks.
  const positions = useMemo(() => {
    const pos = new Map<string, { x: number; y: number }>();
    const visibleScenes = sceneNodes.filter((n) => visibleSceneIds.has(n.id));
    visibleScenes.forEach((n, i) => {
      const angle = (i / Math.max(visibleScenes.length, 1)) * 2 * Math.PI - Math.PI / 2;
      pos.set(n.id, {
        x: CENTER + Math.cos(angle) * OUTER_R,
        y: CENTER + Math.sin(angle) * OUTER_R,
      });
    });
    const innerList = [...riskNodes, ...otherNodes];
    innerList.forEach((n, i) => {
      const angle = (i / Math.max(innerList.length, 1)) * 2 * Math.PI - Math.PI / 2;
      pos.set(n.id, {
        x: CENTER + Math.cos(angle) * INNER_R,
        y: CENTER + Math.sin(angle) * INNER_R,
      });
    });
    return pos;
  }, [sceneNodes, riskNodes, otherNodes, visibleSceneIds]);

  const toggleSeverity = (s: Severity) => {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });
  };

  if ((graph.nodes?.length ?? 0) === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
        Graph is empty — no risks classified yet.
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      {/* Filters */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          Filter severity:
        </span>
        {SEVERITIES.map((s) => {
          const active = severityFilter.has(s);
          return (
            <button
              key={s}
              type="button"
              onClick={() => toggleSeverity(s)}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors ${
                active ? "" : "opacity-50 hover:opacity-100"
              }`}
              style={{
                borderColor: SEVERITY_COLOR[s],
                backgroundColor: active ? `${SEVERITY_COLOR[s]}22` : "transparent",
                color: SEVERITY_COLOR[s],
              }}
            >
              {s}
            </button>
          );
        })}
        {severityFilter.size > 0 && (
          <button
            type="button"
            onClick={() => setSeverityFilter(new Set())}
            className="ml-1 text-[11px] text-[var(--text-muted)] hover:text-[var(--text-primary)]"
          >
            Clear
          </button>
        )}
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          width="100%"
          height={SIZE}
          style={{ maxWidth: SIZE }}
          aria-label="Risk graph"
        >
          {/* Edges */}
          <g stroke="var(--border)" strokeOpacity={0.6}>
            {(graph.edges ?? []).map((e, i) => {
              const a = positions.get(e.source);
              const b = positions.get(e.target);
              if (!a || !b) return null;
              const stroke =
                e.severity && SEVERITY_COLOR[e.severity]
                  ? SEVERITY_COLOR[e.severity]
                  : "#94a3b8";
              const isHover = hoverNode === e.source || hoverNode === e.target;
              return (
                <line
                  key={i}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={stroke}
                  strokeOpacity={isHover ? 0.9 : 0.35}
                  strokeWidth={isHover ? 2 : 1}
                />
              );
            })}
          </g>

          {/* Nodes */}
          <g>
            {[...sceneNodes, ...riskNodes, ...otherNodes].map((n) => {
              const p = positions.get(n.id);
              if (!p) return null;
              const r = Math.max(6, Math.min((n.size ?? 12) / 2, 18));
              const hovered = hoverNode === n.id;
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x}, ${p.y})`}
                  onMouseEnter={() => setHoverNode(n.id)}
                  onMouseLeave={() => setHoverNode(null)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    r={r + (hovered ? 2 : 0)}
                    fill={n.color}
                    stroke={hovered ? "#fff" : "var(--background)"}
                    strokeWidth={2}
                  />
                  {hovered && (
                    <g>
                      <rect
                        x={r + 6}
                        y={-9}
                        rx={4}
                        ry={4}
                        width={Math.min(200, n.label.length * 6 + 12)}
                        height={18}
                        fill="var(--surface)"
                        stroke="var(--border)"
                      />
                      <text
                        x={r + 12}
                        y={4}
                        fontSize={11}
                        fill="var(--text-primary)"
                      >
                        {n.label.length > 30 ? `${n.label.slice(0, 30)}…` : n.label}
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-[var(--text-muted)]">
        {(graph.legend ?? []).map((l, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: l.color ?? "#6366f1" }}
            />
            {l.label}
          </span>
        ))}
      </div>
    </div>
  );
}
