"use client";

// Section components extracted from the original `reports/page.tsx` so the
// per-scene Scene Reports deck can render the exact same UI.
//
// The components are visual-only — every behavioural choice is driven by the
// classifier in `classify.ts`. All styling is inline (`style={{...}}`) and
// theme-aware via the project's CSS variables (`--surface`, `--border`,
// `--text-primary`, ...). Do NOT introduce Tailwind classes here.

import * as React from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { PALETTE, SKIP_KEYS, TT_STYLE, labelKey } from "./classify";

// ── KPI strip (scalar fields at top of report) ────────────────────────────────
export function KPIStrip({ stats }: { stats: [string, unknown][] }) {
  if (stats.length === 0) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(22%, 1fr))", gap: 8 }}>
      {stats.map(([k, v], i) => (
        <div
          key={k}
          style={{
            padding: "10px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: PALETTE[i % PALETTE.length] }} />
          <p
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 4,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {k.replace(/_/g, " ")}
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2, wordBreak: "break-word" }}>
            {String(v)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── Section wrapper (no giant title, just a subtle label) ────────────────────
export function SectionWrap({
  label,
  color,
  children,
  fullWidth,
}: {
  label: string;
  color: string;
  children: React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div
      style={{
        gridColumn: fullWidth ? "1 / -1" : undefined,
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        overflow: "hidden",
        width: "100%",
      }}
    >
      <div
        style={{
          padding: "8px 12px 6px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "var(--text-muted)",
            textTransform: "uppercase",
            letterSpacing: "0.06em",
          }}
        >
          {label.replace(/_/g, " ")}
        </span>
      </div>
      <div style={{ padding: "12px" }}>{children}</div>
    </div>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
export function BarSection({ data }: { data: Record<string, unknown>[] }) {
  const lk = labelKey(data[0]);
  const numKeys = Object.keys(data[0]).filter((k) => typeof data[0][k] === "number");
  return (
    <div style={{ width: "100%", aspectRatio: "16/7", minHeight: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 28, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={lk} tick={{ fontSize: 10, fill: "var(--text-muted)" }} interval={0} angle={-20} textAnchor="end" />
          <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TT_STYLE} cursor={{ fill: "rgba(34,197,94,0.05)" }} />
          {numKeys.length > 1 && <Legend iconSize={9} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />}
          {numKeys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} maxBarSize={40} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Line chart ────────────────────────────────────────────────────────────────
export function LineSection({ data }: { data: Record<string, unknown>[] }) {
  const lk = labelKey(data[0]);
  const numKeys = Object.keys(data[0]).filter((k) => typeof data[0][k] === "number");
  return (
    <div style={{ width: "100%", aspectRatio: "16/7", minHeight: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 28, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={lk} tick={{ fontSize: 10, fill: "var(--text-muted)" }} interval={0} angle={-20} textAnchor="end" />
          <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TT_STYLE} />
          {numKeys.length > 1 && <Legend iconSize={9} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />}
          {numKeys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Pie chart ─────────────────────────────────────────────────────────────────
export function PieSection({ data }: { data: Record<string, unknown>[] }) {
  const lk = labelKey(data[0]);
  const vk =
    Object.keys(data[0]).find((k) => typeof data[0][k] === "number") ?? Object.keys(data[0])[1];
  const rows = data.map((d) => ({ name: String(d[lk] ?? ""), value: Number(d[vk] ?? 0) }));
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", width: "100%" }}>
      <div style={{ width: "45%", aspectRatio: "1/1", minHeight: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} cx="50%" cy="50%" outerRadius="70%" dataKey="value" labelLine={false}>
              {rows.map((_, i) => (
                <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={TT_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
            <span
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                flex: 1,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {r.name}
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{r.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Generic table ─────────────────────────────────────────────────────────────
const WIDE_COL_HINTS = [
  "description",
  "notes",
  "details",
  "summary",
  "reason",
  "comment",
  "remarks",
  "scope",
  "tasks",
  "deliverable",
  "objective",
  "activity",
];

export function TableSection({ data }: { data: unknown[] }) {
  if (data.length === 0) return <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No data.</p>;
  // If array of primitives
  if (typeof data[0] !== "object" || data[0] === null) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {data.map((v, i) => (
          <span
            key={i}
            style={{
              fontSize: 12,
              padding: "3px 10px",
              borderRadius: 6,
              border: "1px solid var(--border)",
              background: "var(--surface-raised)",
              color: "var(--text-secondary)",
            }}
          >
            {String(v)}
          </span>
        ))}
      </div>
    );
  }
  const rows = data as Record<string, unknown>[];
  const cols = Object.keys(rows[0]).filter((c) => !SKIP_KEYS.has(c.toLowerCase()));
  const isWide = (c: string) => WIDE_COL_HINTS.some((h) => c.toLowerCase().includes(h));
  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
        <colgroup>
          {cols.map((c) => (
            <col key={c} style={{ width: isWide(c) ? "30%" : undefined }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {cols.map((c) => (
              <th
                key={c}
                style={{
                  padding: "6px 10px",
                  textAlign: "left",
                  fontSize: 10,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {c.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--surface-raised)]">
              {cols.map((c) => (
                <td
                  key={c}
                  style={{
                    padding: "8px 10px",
                    color: "var(--text-secondary)",
                    verticalAlign: "top",
                    wordBreak: "break-word",
                    whiteSpace: "normal",
                    lineHeight: 1.5,
                  }}
                >
                  {typeof row[c] === "object" && row[c] !== null
                    ? Array.isArray(row[c])
                      ? (row[c] as unknown[]).join(", ")
                      : Object.entries(row[c] as Record<string, unknown>)
                          .map(([k, v]) => `${k}: ${v}`)
                          .join("; ")
                    : String(row[c] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Budget section (KPI row + chart + table) ──────────────────────────────────
export function BudgetSection({ data }: { data: unknown }) {
  const isArr = Array.isArray(data);
  const isObj = !isArr && typeof data === "object" && data !== null;

  // Array of objects → bar chart + table
  if (isArr && (data as unknown[]).length > 0 && typeof (data as unknown[])[0] === "object" && (data as unknown[])[0] !== null) {
    const arr = data as Record<string, unknown>[];
    const numKeys = Object.keys(arr[0]).filter((k) => typeof arr[0][k] === "number");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {numKeys.length > 0 && <BarSection data={arr} />}
        <TableSection data={arr} />
      </div>
    );
  }

  // Array of primitives → tag list
  if (isArr) return <TableSection data={data as unknown[]} />;

  if (isObj) {
    const entries = Object.entries(data as Record<string, unknown>).filter(([k]) => !SKIP_KEYS.has(k.toLowerCase()));
    const scalars = entries.filter(([, v]) => typeof v !== "object" || v === null);
    const nested = entries.filter(([, v]) => typeof v === "object" && v !== null);

    // Collect any array-of-objects sub-sections for charting
    const arraySubSections = nested.filter(
      ([, v]) => Array.isArray(v) && (v as unknown[]).length > 0 && typeof (v as unknown[])[0] === "object",
    );
    const otherNested = nested.filter(([, v]) => !Array.isArray(v));

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {/* KPI cards for scalar values */}
        {scalars.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(22%, 1fr))", gap: 8 }}>
            {scalars.map(([k, v], i) => {
              const isNum = typeof v === "number";
              const formatted = isNum ? (v as number).toLocaleString(undefined, { maximumFractionDigits: 2 }) : String(v);
              return (
                <div
                  key={k}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    background: "var(--surface-raised)",
                    position: "relative",
                    overflow: "hidden",
                    minWidth: 0,
                  }}
                >
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: PALETTE[i % PALETTE.length] }} />
                  <p
                    style={{
                      fontSize: 10,
                      color: "var(--text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.05em",
                      marginBottom: 4,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {k.replace(/_/g, " ")}
                  </p>
                  <p
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: isNum ? PALETTE[i % PALETTE.length] : "var(--text-primary)",
                      lineHeight: 1.2,
                      wordBreak: "break-word",
                    }}
                  >
                    {formatted}
                  </p>
                </div>
              );
            })}
          </div>
        )}
        {/* Sub-array sections: chart + table */}
        {arraySubSections.map(([k, v]) => {
          const arr = v as Record<string, unknown>[];
          const numKeys = Object.keys(arr[0]).filter((kk: string) => typeof arr[0][kk] === "number");
          return (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {k.replace(/_/g, " ")}
              </p>
              {numKeys.length > 0 && <BarSection data={arr} />}
              <TableSection data={arr} />
            </div>
          );
        })}
        {/* Other nested objects */}
        {otherNested.map(([k, v]) => (
          <div key={k}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 6,
              }}
            >
              {k.replace(/_/g, " ")}
            </p>
            <NestedKPIs data={v as Record<string, unknown>} />
          </div>
        ))}
      </div>
    );
  }

  return <ProseSection text={String(data)} />;
}

// ── Timeline section ──────────────────────────────────────────────────────────
export function TimelineSection({ data }: { data: unknown[] }) {
  if (data.length === 0) return null;
  const first = data[0];
  if (typeof first !== "object" || first === null) return <TableSection data={data} />;
  const firstObj = first as Record<string, unknown>;
  const numKeys = Object.keys(firstObj).filter((k) => typeof firstObj[k] === "number");
  const textKeys = Object.keys(firstObj).filter((k) => typeof firstObj[k] === "string" && !SKIP_KEYS.has(k));
  const lk = labelKey(firstObj);
  const rows = data as Record<string, unknown>[];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {numKeys.length > 0 && <LineSection data={rows} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {rows.map((item, i) => {
          const mainLabel = String(item[lk] ?? i + 1);
          const rest = textKeys
            .filter((k) => k !== lk)
            .map((k) => item[k])
            .filter(Boolean);
          const nums = numKeys.map((k) => `${k.replace(/_/g, " ")}: ${item[k]}`);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                gap: 12,
                alignItems: "flex-start",
                padding: "8px 0",
                borderBottom: i < rows.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: PALETTE[i % PALETTE.length],
                  flexShrink: 0,
                  minWidth: 24,
                  marginTop: 1,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    marginBottom: rest.length || nums.length ? 3 : 0,
                    wordBreak: "break-word",
                  }}
                >
                  {mainLabel}
                </p>
                {rest.length > 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-secondary)", wordBreak: "break-word" }}>{rest.join(" · ")}</p>
                )}
                {nums.length > 0 && (
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, wordBreak: "break-word" }}>{nums.join(" · ")}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Crew / cast directory ─────────────────────────────────────────────────────
export function CrewSection({ data }: { data: unknown }) {
  const items: Record<string, unknown>[] = Array.isArray(data)
    ? (data as Record<string, unknown>[])
    : typeof data === "object" && data !== null
    ? Object.entries(data as Record<string, unknown>).map(([k, v]) => ({
        role: k,
        ...(typeof v === "object" && v !== null ? (v as Record<string, unknown>) : { name: v as unknown }),
      }))
    : [];
  if (items.length === 0) return <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No crew data.</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(30%, 1fr))", gap: 8 }}>
      {items.map((person, i) => {
        const nameKey =
          Object.keys(person).find((k) => ["name", "full_name", "person", "member"].some((t) => k.toLowerCase().includes(t))) ??
          Object.keys(person).find((k) => typeof person[k] === "string") ??
          "name";
        const roleKey = Object.keys(person).find(
          (k) => ["role", "position", "title", "job", "department"].some((t) => k.toLowerCase().includes(t)) && k !== nameKey,
        );
        const name = person[nameKey] ?? `Person ${i + 1}`;
        const role = roleKey ? person[roleKey] : undefined;
        const extras = Object.entries(person).filter(
          ([k]) => k !== nameKey && k !== roleKey && !SKIP_KEYS.has(k) && typeof person[k] !== "object",
        );
        const initials = String(name)
          .split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        const color = PALETTE[i % PALETTE.length];
        return (
          <div
            key={i}
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--surface-raised)",
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              minWidth: 0,
            }}
          >
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                background: `${color}20`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 11,
                fontWeight: 700,
                color,
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  marginBottom: role ? 2 : 0,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {String(name)}
              </p>
              {role !== undefined && (
                <p
                  style={{
                    fontSize: 11,
                    color,
                    marginBottom: extras.length ? 4 : 0,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {String(role)}
                </p>
              )}
              {extras.map(([k, v]) => (
                <p key={k} style={{ fontSize: 11, color: "var(--text-muted)", wordBreak: "break-word" }}>
                  <span style={{ fontWeight: 500 }}>{k.replace(/_/g, " ")}: </span>
                  {String(v)}
                </p>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Prose / text ──────────────────────────────────────────────────────────────
export function ProseSection({ text }: { text: string }) {
  return (
    <p
      style={{
        fontSize: 13,
        lineHeight: 1.75,
        color: "var(--text-secondary)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        width: "100%",
      }}
    >
      {text}
    </p>
  );
}

// ── Nested KPI group ──────────────────────────────────────────────────────────
export function NestedKPIs({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data ?? {}).filter(([k]) => !SKIP_KEYS.has(k));
  const scalars = entries.filter(([, v]) => typeof v !== "object" || v === null);
  const nested = entries.filter(([, v]) => typeof v === "object" && v !== null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {scalars.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(22%, 1fr))", gap: 8 }}>
          {scalars.map(([k, v]) => (
            <div
              key={k}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-raised)",
                minWidth: 0,
              }}
            >
              <p
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: 4,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {k.replace(/_/g, " ")}
              </p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", wordBreak: "break-word" }}>{String(v)}</p>
            </div>
          ))}
        </div>
      )}
      {nested.map(([k, v]) => (
        <div key={k}>
          <p
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              marginBottom: 6,
            }}
          >
            {k.replace(/_/g, " ")}
          </p>
          {Array.isArray(v) ? (
            <TableSection data={v as unknown[]} />
          ) : typeof v === "object" && v !== null ? (
            <NestedKPIs data={v as Record<string, unknown>} />
          ) : (
            <ProseSection text={String(v)} />
          )}
        </div>
      ))}
    </div>
  );
}

// ── Risk matrix (3×3 likelihood × impact) ─────────────────────────────────────
// Used when an envelope section explicitly declares `viz_type === "risk_matrix"`.
// Accepts a flexible payload — either:
//   { risks: [{ title, likelihood: "low"|"medium"|"high", impact: ..., notes? }, ...] }
// or just an array of those risk objects directly.
const RISK_LEVELS = ["low", "medium", "high"] as const;
type RiskLevel = (typeof RISK_LEVELS)[number];

function normaliseLevel(value: unknown): RiskLevel {
  const v = String(value ?? "").toLowerCase();
  if (v.includes("high") || v.includes("critical") || v === "3") return "high";
  if (v.includes("med") || v === "2") return "medium";
  return "low";
}

export function RiskMatrixSection({ data }: { data: unknown }) {
  let risks: Record<string, unknown>[] = [];
  if (Array.isArray(data)) {
    risks = data as Record<string, unknown>[];
  } else if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>;
    const arrKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
    if (arrKey) risks = obj[arrKey] as Record<string, unknown>[];
  }

  // Build a matrix[likelihood][impact] = list of risks
  const matrix: Record<RiskLevel, Record<RiskLevel, Record<string, unknown>[]>> = {
    low: { low: [], medium: [], high: [] },
    medium: { low: [], medium: [], high: [] },
    high: { low: [], medium: [], high: [] },
  };
  for (const r of risks) {
    const likelihood = normaliseLevel(r.likelihood ?? r.probability);
    const impact = normaliseLevel(r.impact ?? r.severity);
    matrix[likelihood][impact].push(r);
  }

  const cellColor = (likelihood: RiskLevel, impact: RiskLevel): string => {
    const score =
      (likelihood === "high" ? 2 : likelihood === "medium" ? 1 : 0) +
      (impact === "high" ? 2 : impact === "medium" ? 1 : 0);
    if (score >= 3) return "#ef4444"; // red
    if (score === 2) return "#f97316"; // orange
    return "#22c55e"; // green
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "auto repeat(3, 1fr)", gap: 6 }}>
        <div />
        {RISK_LEVELS.map((impact) => (
          <div
            key={`hdr-${impact}`}
            style={{
              fontSize: 10,
              textAlign: "center",
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            Impact: {impact}
          </div>
        ))}
        {RISK_LEVELS.slice()
          .reverse()
          .map((likelihood) => (
            <React.Fragment key={`row-${likelihood}`}>
              <div
                style={{
                  fontSize: 10,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  alignSelf: "center",
                  paddingRight: 6,
                  whiteSpace: "nowrap",
                }}
              >
                P: {likelihood}
              </div>
              {RISK_LEVELS.map((impact) => {
                const cell = matrix[likelihood][impact];
                const color = cellColor(likelihood, impact);
                return (
                  <div
                    key={`${likelihood}-${impact}`}
                    style={{
                      minHeight: 64,
                      padding: 8,
                      borderRadius: 8,
                      border: `1px solid ${color}40`,
                      background: `${color}10`,
                      display: "flex",
                      flexDirection: "column",
                      gap: 4,
                    }}
                  >
                    {cell.length === 0 ? (
                      <span style={{ fontSize: 10, color: "var(--text-muted)" }}>—</span>
                    ) : (
                      cell.map((r, idx) => (
                        <div
                          key={idx}
                          style={{
                            fontSize: 11,
                            color: "var(--text-primary)",
                            fontWeight: 500,
                            wordBreak: "break-word",
                          }}
                        >
                          • {String(r.title ?? r.name ?? r.risk ?? `Risk ${idx + 1}`)}
                        </div>
                      ))
                    )}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
      </div>
      {risks.length === 0 && (
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No risks reported.</p>
      )}
    </div>
  );
}
