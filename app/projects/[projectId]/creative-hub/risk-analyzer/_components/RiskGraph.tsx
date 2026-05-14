"use client";

// Bipartite "category ↔ scene" graph. Replaces the old radial node graph
// (which producers complained didn't answer any concrete question) with a
// layout that directly shows how each hazard category threads through the
// script's scenes:
//   - LEFT column: risk categories, ranked by finding count desc.
//   - RIGHT column: scenes, ordered by `scene.order`.
//   - One Bezier edge per non-deleted finding from its category → its scene,
//     coloured by severity.
//
// Interaction model:
//   - Hover a node → highlight its incident edges + counterparties, dim the
//     rest. The edge `opacity` jump (0.05 → 0.85) gives the producer an
//     instant read of "where do my pyrotechnics findings actually live?"
//   - Click locks the highlight; click again or click background unlocks.
//   - A side panel shows the connections in textual form with click-throughs
//     into the Scenes tab (category click → filter by slug; scene chip click
//     → expand that scene).
//
// Implementation notes:
//   - Plain SVG, no new deps. The viewBox is fixed at 1000 wide and the
//     parent container is responsive (SVG scales to width). Node Y positions
//     are computed deterministically from rank/order so the layout doesn't
//     shuffle between renders.
//   - We do NOT consume `analysis.graph` from the backend: that payload is
//     scene-centric and not bipartite. We rebuild from `analysis.scenes` so
//     the visualisation tracks user edits (added/deleted findings) without a
//     round trip.

import { useMemo, useState } from "react";
import { Film, ShieldAlert } from "lucide-react";
import { RiskAnalysis, Severity } from "@/types/risk-analyzer";
import { SEVERITY_COLOR, categoryLabel } from "./constants";

interface RiskGraphProps {
  analysis: RiskAnalysis;
  /** Click-through: filter Scenes tab by this category slug. */
  onSelectCategory?: (slug: string) => void;
  /** Click-through: expand this scene in the Scenes tab. */
  onSelectScene?: (sceneId: number) => void;
}

interface CategoryNode {
  slug: string;
  label: string;
  count: number;
  /** Most severe finding in this category — drives the node accent colour. */
  maxSeverity: Severity;
  y: number;
}

interface SceneNode {
  scene_id: number;
  order: number;
  heading: string;
  count: number;
  maxSeverity: Severity | null;
  y: number;
}

interface Edge {
  /** Stable key combining category slug + finding id for React reconciliation. */
  key: string;
  categorySlug: string;
  sceneId: number;
  severity: Severity;
}

// Severity → numeric rank for max() comparisons. Lower index == worse.
const SEV_RANK: Record<Severity, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

// Layout constants. Tuned so 24-scene scripts breathe and 4-scene scripts
// don't look like a single edge across the canvas.
const VB_WIDTH = 1000;
const COL_PAD_Y = 40;
const LEFT_X = 180;
const RIGHT_X = 820;
const NODE_HALF_H = 14;
const MIN_NODE_GAP = 32;

function worseOf(a: Severity, b: Severity): Severity {
  return SEV_RANK[a] < SEV_RANK[b] ? a : b;
}

export default function RiskGraph({
  analysis,
  onSelectCategory,
  onSelectScene,
}: RiskGraphProps) {
  // Selection state: hover is transient, locked is sticky. We resolve the
  // "active" selection by preferring locked over hover so the user can hover
  // a different node to peek without losing their pinned context.
  const [hover, setHover] = useState<{
    type: "category" | "scene";
    id: string;
  } | null>(null);
  const [locked, setLocked] = useState<{
    type: "category" | "scene";
    id: string;
  } | null>(null);

  const active = locked ?? hover;

  const { categories, scenes, edges, height } = useMemo(() => {
    const catMap = new Map<string, CategoryNode>();
    const sceneMap = new Map<number, SceneNode>();
    const edgeList: Edge[] = [];

    for (const scene of analysis.scenes) {
      if (!sceneMap.has(scene.scene_id)) {
        sceneMap.set(scene.scene_id, {
          scene_id: scene.scene_id,
          order: scene.order,
          heading: scene.heading,
          count: 0,
          maxSeverity: null,
          y: 0,
        });
      }
      const sNode = sceneMap.get(scene.scene_id)!;

      for (const f of scene.findings) {
        if (f.deleted_by_user) continue;
        const slug = f.category_slug || f.category || "unknown";
        const existing = catMap.get(slug);
        if (existing) {
          existing.count += 1;
          existing.maxSeverity = worseOf(existing.maxSeverity, f.severity);
        } else {
          catMap.set(slug, {
            slug,
            label: categoryLabel(slug, f.category),
            count: 1,
            maxSeverity: f.severity,
            y: 0,
          });
        }
        sNode.count += 1;
        sNode.maxSeverity = sNode.maxSeverity
          ? worseOf(sNode.maxSeverity, f.severity)
          : f.severity;
        edgeList.push({
          key: `${slug}#${f.id}`,
          categorySlug: slug,
          sceneId: scene.scene_id,
          severity: f.severity,
        });
      }
    }

    // Sort categories by count desc; ties break alphabetically for stability.
    const cats = Array.from(catMap.values()).sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    );
    // Scenes ordered by their script position; drop scenes with zero
    // non-deleted findings so the right column doesn't fill with empty rows.
    const scns = Array.from(sceneMap.values())
      .filter((s) => s.count > 0)
      .sort((a, b) => a.order - b.order);

    // Compute deterministic Y positions. Each column has its own vertical
    // packing so the taller column drives the SVG height.
    const leftSpan = Math.max(1, cats.length);
    const rightSpan = Math.max(1, scns.length);
    const gap = MIN_NODE_GAP;
    cats.forEach((c, i) => {
      c.y = COL_PAD_Y + i * gap;
    });
    scns.forEach((s, i) => {
      s.y = COL_PAD_Y + i * gap;
    });
    const h =
      COL_PAD_Y * 2 + Math.max(leftSpan, rightSpan) * gap - gap + NODE_HALF_H;

    return { categories: cats, scenes: scns, edges: edgeList, height: h };
  }, [analysis.scenes]);

  // Index lookups used for hit-testing edges & active-set membership.
  const catByslug = useMemo(() => {
    const m = new Map<string, CategoryNode>();
    for (const c of categories) m.set(c.slug, c);
    return m;
  }, [categories]);
  const sceneById = useMemo(() => {
    const m = new Map<number, SceneNode>();
    for (const s of scenes) m.set(s.scene_id, s);
    return m;
  }, [scenes]);

  // Pre-compute the set of edges incident on the active node — saves us
  // running an O(E) filter inside the render loop.
  const activeEdgeKeys = useMemo(() => {
    if (!active) return null;
    const set = new Set<string>();
    if (active.type === "category") {
      for (const e of edges) if (e.categorySlug === active.id) set.add(e.key);
    } else {
      const sceneId = Number(active.id);
      for (const e of edges) if (e.sceneId === sceneId) set.add(e.key);
    }
    return set;
  }, [active, edges]);

  // Empty state — finding-free analyses (FINALIZED-clean or in-flight).
  if ((analysis.total_findings_count ?? edges.length) === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
        No risk connections to display — analysis has no findings yet.
      </div>
    );
  }

  const isActive = (
    type: "category" | "scene",
    id: string | number,
  ): boolean =>
    !!active && active.type === type && active.id === String(id);

  const isConnected = (
    type: "category" | "scene",
    id: string | number,
  ): boolean => {
    if (!active) return false;
    if (active.type === type && active.id === String(id)) return true;
    if (active.type === "category" && type === "scene") {
      return edges.some(
        (e) => e.categorySlug === active.id && e.sceneId === Number(id),
      );
    }
    if (active.type === "scene" && type === "category") {
      const sId = Number(active.id);
      return edges.some((e) => e.sceneId === sId && e.categorySlug === id);
    }
    return false;
  };

  const handleNodeClick = (type: "category" | "scene", id: string) => {
    if (locked && locked.type === type && locked.id === id) {
      setLocked(null);
    } else {
      setLocked({ type, id });
    }
  };

  const handleBackgroundClick = () => setLocked(null);

  // ── Side panel content ────────────────────────────────────────────────────
  let panel: React.ReactNode = null;
  if (active?.type === "category") {
    const cat = catByslug.get(active.id);
    if (cat) {
      const connectedScenes = scenes.filter((s) =>
        edges.some(
          (e) => e.categorySlug === active.id && e.sceneId === s.scene_id,
        ),
      );
      panel = (
        <SidePanel
          title={cat.label}
          subtitle={`${cat.count} ${cat.count === 1 ? "finding" : "findings"} · max severity ${cat.maxSeverity}`}
          accent={SEVERITY_COLOR[cat.maxSeverity]}
          icon={<ShieldAlert size={14} />}
        >
          <p className="mb-2 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Appears in {connectedScenes.length}{" "}
            {connectedScenes.length === 1 ? "scene" : "scenes"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {connectedScenes.map((s) => (
              <button
                key={s.scene_id}
                type="button"
                onClick={() => onSelectScene?.(s.scene_id)}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] hover:border-emerald-500/40 hover:text-emerald-500"
                title={s.heading}
              >
                <Film size={10} /> Scene {s.order}
              </button>
            ))}
          </div>
        </SidePanel>
      );
    }
  } else if (active?.type === "scene") {
    const sceneNode = sceneById.get(Number(active.id));
    if (sceneNode) {
      const connectedCats = categories.filter((c) =>
        edges.some(
          (e) => e.sceneId === sceneNode.scene_id && e.categorySlug === c.slug,
        ),
      );
      panel = (
        <SidePanel
          title={`Scene ${sceneNode.order}`}
          subtitle={sceneNode.heading}
          accent={
            sceneNode.maxSeverity ? SEVERITY_COLOR[sceneNode.maxSeverity] : "#94a3b8"
          }
          icon={<Film size={14} />}
        >
          <p className="mb-2 text-[11px] uppercase tracking-wider text-[var(--text-muted)]">
            Carries {sceneNode.count}{" "}
            {sceneNode.count === 1 ? "hazard" : "hazards"} across{" "}
            {connectedCats.length}{" "}
            {connectedCats.length === 1 ? "category" : "categories"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {connectedCats.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => onSelectCategory?.(c.slug)}
                className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] bg-[var(--surface-hover)] px-2 py-0.5 text-[11px] text-[var(--text-secondary)] hover:border-emerald-500/40 hover:text-emerald-500"
              >
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: SEVERITY_COLOR[c.maxSeverity] }}
                />
                {c.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onSelectScene?.(sceneNode.scene_id)}
              className="inline-flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-500 hover:bg-emerald-500/20"
            >
              Open scene →
            </button>
          </div>
        </SidePanel>
      );
    }
  } else {
    panel = (
      <SidePanel
        title="Risk Graph"
        subtitle="Hover or click a node to explore"
        accent="#10b981"
        icon={<ShieldAlert size={14} />}
      >
        <p className="text-[11px] text-[var(--text-muted)]">
          Each curve is a single finding linking a hazard category (left) to
          the scene where it occurs (right). Edge colour encodes severity.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
          {(["Critical", "High", "Medium", "Low"] as Severity[]).map((sev) => (
            <span key={sev} className="inline-flex items-center gap-1">
              <span
                className="inline-block h-2 w-3 rounded-sm"
                style={{ backgroundColor: SEVERITY_COLOR[sev] }}
              />
              <span className="text-[var(--text-secondary)]">{sev}</span>
            </span>
          ))}
        </div>
      </SidePanel>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
      <section className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] p-3">
        <header className="mb-2 flex items-baseline justify-between">
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            Category ↔ Scene connections
          </h3>
          <p className="text-[11px] text-[var(--text-muted)]">
            {edges.length} {edges.length === 1 ? "finding" : "findings"} ·{" "}
            {categories.length}{" "}
            {categories.length === 1 ? "category" : "categories"} ·{" "}
            {scenes.length} {scenes.length === 1 ? "scene" : "scenes"}
          </p>
        </header>
        <svg
          viewBox={`0 0 ${VB_WIDTH} ${height}`}
          width="100%"
          height={height}
          role="img"
          aria-label="Bipartite risk graph"
          onClick={handleBackgroundClick}
          style={{ display: "block" }}
        >
          {/* Column labels */}
          <text
            x={LEFT_X}
            y={20}
            textAnchor="end"
            className="fill-[var(--text-muted)]"
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Categories
          </text>
          <text
            x={RIGHT_X}
            y={20}
            textAnchor="start"
            className="fill-[var(--text-muted)]"
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 1,
              textTransform: "uppercase",
            }}
          >
            Scenes
          </text>

          {/* Edges first so nodes paint on top. We draw idle edges in a
              first pass and active edges in a second pass so the highlight
              is never visually occluded by a dimmed neighbour. */}
          {edges.map((e) => {
            const cat = catByslug.get(e.categorySlug);
            const scn = sceneById.get(e.sceneId);
            if (!cat || !scn) return null;
            const isHit = activeEdgeKeys?.has(e.key) ?? false;
            // When nothing is active everything sits at idle 0.35; when
            // something IS active, non-hit edges drop to 0.05 per spec.
            const opacity = active ? (isHit ? 0.85 : 0.05) : 0.35;
            const strokeW = isHit ? 1.6 : 0.9;
            const midX = (LEFT_X + RIGHT_X) / 2;
            const d = `M ${LEFT_X} ${cat.y} C ${midX} ${cat.y}, ${midX} ${scn.y}, ${RIGHT_X} ${scn.y}`;
            return (
              <path
                key={e.key}
                d={d}
                stroke={SEVERITY_COLOR[e.severity]}
                strokeWidth={strokeW}
                fill="none"
                opacity={opacity}
                style={{ transition: "opacity 120ms ease, stroke-width 120ms ease" }}
              />
            );
          })}

          {/* Left column: category nodes */}
          {categories.map((c) => {
            const dim = active && !isActive("category", c.slug) && !isConnected("category", c.slug);
            return (
              <g
                key={c.slug}
                opacity={dim ? 0.25 : 1}
                style={{ cursor: "pointer", transition: "opacity 120ms ease" }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  handleNodeClick("category", c.slug);
                }}
                onMouseEnter={() => setHover({ type: "category", id: c.slug })}
                onMouseLeave={() => setHover(null)}
              >
                <rect
                  x={LEFT_X - 168}
                  y={c.y - NODE_HALF_H}
                  width={168}
                  height={NODE_HALF_H * 2}
                  rx={6}
                  fill="var(--surface-hover)"
                  stroke={SEVERITY_COLOR[c.maxSeverity]}
                  strokeWidth={isActive("category", c.slug) ? 2 : 1}
                />
                <text
                  x={LEFT_X - 8}
                  y={c.y + 3}
                  textAnchor="end"
                  className="fill-[var(--text-primary)]"
                  style={{ fontSize: 11, fontWeight: 600 }}
                >
                  {truncate(c.label, 22)}
                </text>
                <circle
                  cx={LEFT_X - 158}
                  cy={c.y}
                  r={3.5}
                  fill={SEVERITY_COLOR[c.maxSeverity]}
                />
                <text
                  x={LEFT_X - 148}
                  y={c.y + 3}
                  textAnchor="start"
                  className="fill-[var(--text-muted)]"
                  style={{ fontSize: 10, fontWeight: 700 }}
                >
                  {c.count}
                </text>
              </g>
            );
          })}

          {/* Right column: scene nodes */}
          {scenes.map((s) => {
            const dim = active && !isActive("scene", String(s.scene_id)) && !isConnected("scene", s.scene_id);
            const dotColor = s.maxSeverity ? SEVERITY_COLOR[s.maxSeverity] : "#94a3b8";
            return (
              <g
                key={s.scene_id}
                opacity={dim ? 0.25 : 1}
                style={{ cursor: "pointer", transition: "opacity 120ms ease" }}
                onClick={(ev) => {
                  ev.stopPropagation();
                  handleNodeClick("scene", String(s.scene_id));
                }}
                onMouseEnter={() =>
                  setHover({ type: "scene", id: String(s.scene_id) })
                }
                onMouseLeave={() => setHover(null)}
              >
                <rect
                  x={RIGHT_X}
                  y={s.y - NODE_HALF_H}
                  width={168}
                  height={NODE_HALF_H * 2}
                  rx={6}
                  fill="var(--surface-hover)"
                  stroke={dotColor}
                  strokeWidth={isActive("scene", String(s.scene_id)) ? 2 : 1}
                />
                <circle cx={RIGHT_X + 10} cy={s.y} r={4} fill={dotColor} />
                <text
                  x={RIGHT_X + 20}
                  y={s.y + 3}
                  textAnchor="start"
                  className="fill-[var(--text-primary)]"
                  style={{ fontSize: 11, fontWeight: 600 }}
                >
                  Scene {s.order}
                </text>
                <text
                  x={RIGHT_X + 160}
                  y={s.y + 3}
                  textAnchor="end"
                  className="fill-[var(--text-muted)]"
                  style={{ fontSize: 10, fontWeight: 700 }}
                >
                  {s.count}
                </text>
              </g>
            );
          })}
        </svg>
      </section>

      <aside>{panel}</aside>
    </div>
  );
}

// Truncate long category labels to keep the left column tidy. The full label
// is still discoverable through the side panel on hover/click.
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

interface SidePanelProps {
  title: string;
  subtitle?: string;
  accent: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}

function SidePanel({ title, subtitle, accent, icon, children }: SidePanelProps) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <header className="mb-3 flex items-start gap-2 border-b border-[var(--border)] pb-3">
        <span
          className="mt-0.5 inline-flex h-6 w-6 items-center justify-center rounded-md"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-[var(--text-primary)]">
            {title}
          </h4>
          {subtitle && (
            <p className="mt-0.5 truncate text-[11px] text-[var(--text-muted)]">
              {subtitle}
            </p>
          )}
        </div>
      </header>
      <div>{children}</div>
    </div>
  );
}
