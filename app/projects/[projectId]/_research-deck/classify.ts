// Shared classifier + primitives used by both the project Research Deck
// (`reports/page.tsx`) and the per-scene Scene Reports deck.
//
// These helpers are framework-free: pure functions + constants. The React
// components live in `sections.tsx` and `DeckRenderer.tsx`.

// ── Colour palette ───────────────────────────────────────────────────────────
export const PALETTE = [
  "#22c55e",
  "#3b82f6",
  "#f97316",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#ef4444",
  "#64748b",
  "#06b6d4",
];

// ── Keys that are project metadata — never render as report sections ──────────
export const SKIP_KEYS = new Set([
  "name",
  "project",
  "project_name",
  "project_id",
  "title",
  "id",
  "report_id",
  "report_type",
  "created_at",
  "updated_at",
  // Scene-report envelope housekeeping fields. These are wrapper metadata
  // surfaced separately in the deck header, never as their own section.
  "tab_key",
  "tab_type",
  "tab_display_name",
  "executive_summary",
  "structured_data",
  "sections",
  "citations",
  "scene_id",
  "scene_order",
  "scene_name",
  "generated_at",
  "legacy_markdown",
]);

// ── Tooltip style (recharts) ──────────────────────────────────────────────────
export const TT_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
};

// ── Section semantic classifier ───────────────────────────────────────────────
export type SectionKind =
  | "prose"
  | "kpi_group"
  | "crew"
  | "budget"
  | "timeline"
  | "chart_bar"
  | "chart_line"
  | "chart_pie"
  | "table"
  | "nested_kpis"
  | "risk_matrix";

export function classifySection(key: string, value: unknown): SectionKind {
  const k = key.toLowerCase();
  if (typeof value === "string") return "prose";
  if (value === null || value === undefined) return "prose";
  const isArr = Array.isArray(value);
  const isObj = !isArr && typeof value === "object";

  // Crew / casting
  if (
    ["crew", "cast", "casting", "personnel", "members", "team", "staff", "recommended_crew", "crew_recommendations"].some(
      (t) => k.includes(t),
    )
  )
    return "crew";

  // Budget
  if (
    ["budget", "cost", "finance", "expense", "revenue", "financial", "pricing", "monetary"].some((t) => k.includes(t))
  ) {
    if (isObj || isArr) return "budget";
  }

  // Timeline / logistics / schedule
  if (
    ["timeline", "schedule", "logistics", "plan", "phase", "milestone", "shooting_schedule", "production_plan"].some(
      (t) => k.includes(t),
    )
  ) {
    if (isArr) return "timeline";
  }

  // Object with all-numeric values → KPI group
  if (isObj) {
    const vals = Object.values(value as object);
    if (vals.length > 0 && vals.every((v) => typeof v === "number" || typeof v === "string")) return "nested_kpis";
    return "nested_kpis";
  }

  if (isArr) {
    const arr = value as unknown[];
    if (arr.length === 0) return "table";
    const first = arr[0] as Record<string, unknown> | unknown;
    if (typeof first !== "object" || first === null) return "table";
    const obj = first as Record<string, unknown>;
    const numKeys = Object.keys(obj).filter((kk) => typeof obj[kk] === "number");
    const dateKey = Object.keys(obj).find((kk) =>
      ["date", "time", "day", "week", "month", "year", "period"].some((t) => kk.toLowerCase().includes(t)),
    );
    if (dateKey && numKeys.length > 0) return "chart_line";
    if (numKeys.length === 0) return "table";
    if (arr.length <= 7 && numKeys.length === 1) return "chart_pie";
    return "chart_bar";
  }

  return "prose";
}

// ── Shared: label key heuristic ───────────────────────────────────────────────
export function labelKey(obj: Record<string, unknown>): string {
  const strKeys = Object.keys(obj).filter((k) => typeof obj[k] === "string");
  const prefer = ["name", "title", "label", "role", "position", "category", "type", "phase", "department", "location"];
  for (const p of prefer) {
    const f = strKeys.find((k) => k.toLowerCase().includes(p));
    if (f) return f;
  }
  return strKeys[0] ?? Object.keys(obj)[0];
}

// Map the explicit `viz_type` hint (STO-1066 envelope) to a SectionKind so
// envelope sections route through the same component dispatcher used for the
// classifier. Returns null when the hint is unrecognised so callers fall back
// to the heuristic `classifySection`.
export function vizTypeToKind(vizType: unknown): SectionKind | null {
  // Defensive: backend payloads sometimes deliver `viz_type` as a non-string
  // (number, boolean, nested object) when the field is mis-populated. Coerce
  // to a normalised string and bail on anything that isn't string-castable
  // rather than crashing the whole deck render.
  if (vizType === null || vizType === undefined) return null;
  const s = typeof vizType === "string" ? vizType : String(vizType);
  if (!s) return null;
  switch (s.toLowerCase()) {
    case "prose":
    case "narrative":
    case "summary":
      return "prose";
    case "table":
      return "table";
    case "metric_card":
    case "kpi":
    case "metrics":
      return "nested_kpis";
    case "risk_matrix":
      return "risk_matrix";
    case "bar_chart":
    case "bar":
      return "chart_bar";
    case "line_chart":
    case "line":
      return "chart_line";
    case "pie_chart":
    case "pie":
      return "chart_pie";
    case "timeline":
      return "timeline";
    case "crew":
      return "crew";
    case "budget":
      return "budget";
    default:
      return null;
  }
}
