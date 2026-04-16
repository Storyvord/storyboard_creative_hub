"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import {
  Loader2, BookOpen, RefreshCw, Plus, X, TrendingUp, BarChart2,
  Sparkles, ChevronDown, ChevronUp, Edit3, Check, PieChart as PieIcon,
  Activity, FileText, Layers,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getGeneratedReports, getAvailableReports, generateReports, createCustomReport,
} from "@/services/project";
import { ProjectReport, AvailableReport } from "@/types/project";
import { useTaskPoller } from "@/hooks/useTaskPoller";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer,
} from "recharts";

// ── Colour palette ───────────────────────────────────────────────────────────
const PALETTE = ["#22c55e", "#3b82f6", "#f97316", "#a855f7", "#ec4899", "#14b8a6", "#eab308", "#ef4444", "#64748b", "#06b6d4"];

// ── Keys that are project metadata — never render as report sections ──────────
const SKIP_KEYS = new Set(["name","project","project_name","project_id","title","id","report_id","report_type","created_at","updated_at"]);

// ── Section semantic classifier ───────────────────────────────────────────────
type SectionKind = "prose" | "kpi_group" | "crew" | "budget" | "timeline" | "chart_bar" | "chart_line" | "chart_pie" | "table" | "nested_kpis";

function classifySection(key: string, value: any): SectionKind {
  const k = key.toLowerCase();
  if (typeof value === "string") return "prose";
  if (value === null || value === undefined) return "prose";
  const isArr = Array.isArray(value);
  const isObj = !isArr && typeof value === "object";

  // Crew / casting
  if (["crew","cast","casting","personnel","members","team","staff","recommended_crew","crew_recommendations"].some(t => k.includes(t))) return "crew";

  // Budget
  if (["budget","cost","finance","expense","revenue","financial","pricing","monetary"].some(t => k.includes(t))) {
    if (isObj || isArr) return "budget";
  }

  // Timeline / logistics / schedule
  if (["timeline","schedule","logistics","plan","phase","milestone","shooting_schedule","production_plan"].some(t => k.includes(t))) {
    if (isArr) return "timeline";
  }

  // Object with all-numeric values → KPI group
  if (isObj) {
    const vals = Object.values(value as object);
    if (vals.length > 0 && vals.every(v => typeof v === "number" || typeof v === "string")) return "nested_kpis";
    return "nested_kpis";
  }

  if (isArr) {
    if ((value as any[]).length === 0) return "table";
    const first = (value as any[])[0];
    if (typeof first !== "object" || first === null) return "table";
    const numKeys = Object.keys(first).filter(k => typeof first[k] === "number");
    const dateKey = Object.keys(first).find(k => ["date","time","day","week","month","year","period"].some(t => k.toLowerCase().includes(t)));
    if (dateKey && numKeys.length > 0) return "chart_line";
    if (numKeys.length === 0) return "table";
    if ((value as any[]).length <= 7 && numKeys.length === 1) return "chart_pie";
    return "chart_bar";
  }

  return "prose";
}

// ── Tooltip style ─────────────────────────────────────────────────────────────
const TT_STYLE = { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 16px rgba(0,0,0,0.2)" };

// ── Shared: label key heuristic ───────────────────────────────────────────────
function labelKey(obj: Record<string, any>): string {
  const strKeys = Object.keys(obj).filter(k => typeof obj[k] === "string");
  const prefer = ["name","title","label","role","position","category","type","phase","department","location"];
  for (const p of prefer) { const f = strKeys.find(k => k.toLowerCase().includes(p)); if (f) return f; }
  return strKeys[0] ?? Object.keys(obj)[0];
}

// ── KPI strip (scalar fields at top of report) ────────────────────────────────
function KPIStrip({ stats }: { stats: [string, any][] }) {
  if (stats.length === 0) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(22%, 1fr))", gap: 8 }}>
      {stats.map(([k, v], i) => (
        <div key={k} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: PALETTE[i % PALETTE.length] }} />
          <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {k.replace(/_/g, " ")}
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2, wordBreak: "break-word" }}>{String(v)}</p>
        </div>
      ))}
    </div>
  );
}

// ── Section wrapper (no giant title, just a subtle label) ────────────────────
function SectionWrap({ label, color, children, fullWidth }: { label: string; color: string; children: React.ReactNode; fullWidth?: boolean }) {
  return (
    <div style={{ gridColumn: fullWidth ? "1 / -1" : undefined, borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", overflow: "hidden", width: "100%" }}>
      <div style={{ padding: "8px 12px 6px", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 6 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
          {label.replace(/_/g, " ")}
        </span>
      </div>
      <div style={{ padding: "12px" }}>{children}</div>
    </div>
  );
}

// ── Bar chart ─────────────────────────────────────────────────────────────────
function BarSection({ data }: { data: any[] }) {
  const lk = labelKey(data[0]);
  const numKeys = Object.keys(data[0]).filter(k => typeof data[0][k] === "number");
  return (
    <div style={{ width: "100%", aspectRatio: "16/7", minHeight: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 28, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={lk} tick={{ fontSize: 10, fill: "var(--text-muted)" }} interval={0} angle={-20} textAnchor="end" />
          <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TT_STYLE} cursor={{ fill: "rgba(34,197,94,0.05)" }} />
          {numKeys.length > 1 && <Legend iconSize={9} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />}
          {numKeys.map((k, i) => <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} radius={[3,3,0,0]} maxBarSize={40} />)}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Line chart ────────────────────────────────────────────────────────────────
function LineSection({ data }: { data: any[] }) {
  const lk = labelKey(data[0]);
  const numKeys = Object.keys(data[0]).filter(k => typeof data[0][k] === "number");
  return (
    <div style={{ width: "100%", aspectRatio: "16/7", minHeight: 180 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 28, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={lk} tick={{ fontSize: 10, fill: "var(--text-muted)" }} interval={0} angle={-20} textAnchor="end" />
          <YAxis tick={{ fontSize: 10, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={TT_STYLE} />
          {numKeys.length > 1 && <Legend iconSize={9} wrapperStyle={{ fontSize: 10, paddingTop: 4 }} />}
          {numKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} activeDot={{ r: 4 }} />)}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Pie chart ─────────────────────────────────────────────────────────────────
function PieSection({ data }: { data: any[] }) {
  const lk = labelKey(data[0]);
  const vk = Object.keys(data[0]).find(k => typeof data[0][k] === "number") ?? Object.keys(data[0])[1];
  const rows = data.map(d => ({ name: String(d[lk] ?? ""), value: Number(d[vk] ?? 0) }));
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center", width: "100%" }}>
      <div style={{ width: "45%", aspectRatio: "1/1", minHeight: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={rows} cx="50%" cy="50%" outerRadius="70%" dataKey="value" labelLine={false}>
              {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip contentStyle={TT_STYLE} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 5 }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.name}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{r.value.toLocaleString()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Generic table ─────────────────────────────────────────────────────────────
// Columns that likely contain long prose — give them proportionally more width
const WIDE_COL_HINTS = ["description","notes","details","summary","reason","comment","remarks","scope","tasks","deliverable","objective","activity"];

function TableSection({ data }: { data: any[] }) {
  if (data.length === 0) return <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No data.</p>;
  // If array of primitives
  if (typeof data[0] !== "object" || data[0] === null) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {data.map((v, i) => (
          <span key={i} style={{ fontSize: 12, padding: "3px 10px", borderRadius: 6, border: "1px solid var(--border)", background: "var(--surface-raised)", color: "var(--text-secondary)" }}>
            {String(v)}
          </span>
        ))}
      </div>
    );
  }
  const cols = Object.keys(data[0]).filter(c => !SKIP_KEYS.has(c.toLowerCase()));
  // Decide column widths: wide columns get 2× weight via minWidth
  const isWide = (c: string) => WIDE_COL_HINTS.some(h => c.toLowerCase().includes(h));
  return (
    <div style={{ width: "100%", overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, tableLayout: "fixed" }}>
        <colgroup>
          {cols.map(c => (
            <col key={c} style={{ width: isWide(c) ? "30%" : undefined }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ borderBottom: "1px solid var(--border)" }}>
            {cols.map(c => (
              <th key={c} style={{ padding: "6px 10px", textAlign: "left", fontSize: 10, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {c.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: "1px solid var(--border)" }} className="hover:bg-[var(--surface-raised)]">
              {cols.map(c => (
                <td key={c} style={{ padding: "8px 10px", color: "var(--text-secondary)", verticalAlign: "top", wordBreak: "break-word", whiteSpace: "normal", lineHeight: 1.5 }}>
                  {typeof row[c] === "object" && row[c] !== null
                    ? Array.isArray(row[c])
                      ? (row[c] as any[]).join(", ")
                      : Object.entries(row[c] as Record<string,any>).map(([k,v]) => `${k}: ${v}`).join("; ")
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
function BudgetSection({ data }: { data: any }) {
  const isArr = Array.isArray(data);
  const isObj = !isArr && typeof data === "object" && data !== null;

  // Array of objects → bar chart + table
  if (isArr && data.length > 0 && typeof data[0] === "object" && data[0] !== null) {
    const numKeys = Object.keys(data[0]).filter(k => typeof data[0][k] === "number");
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {numKeys.length > 0 && <BarSection data={data} />}
        <TableSection data={data} />
      </div>
    );
  }

  // Array of primitives → tag list
  if (isArr) return <TableSection data={data} />;

  if (isObj) {
    const entries = Object.entries(data as Record<string, any>).filter(([k]) => !SKIP_KEYS.has(k.toLowerCase()));
    const scalars = entries.filter(([, v]) => typeof v !== "object" || v === null);
    const nested = entries.filter(([, v]) => typeof v === "object" && v !== null);

    // Collect any array-of-objects sub-sections for charting
    const arraySubSections = nested.filter(([, v]) => Array.isArray(v) && v.length > 0 && typeof v[0] === "object");
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
                <div key={k} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-raised)", position: "relative", overflow: "hidden", minWidth: 0 }}>
                  <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: PALETTE[i % PALETTE.length] }} />
                  <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.replace(/_/g, " ")}</p>
                  <p style={{ fontSize: 14, fontWeight: 700, color: isNum ? PALETTE[i % PALETTE.length] : "var(--text-primary)", lineHeight: 1.2, wordBreak: "break-word" }}>{formatted}</p>
                </div>
              );
            })}
          </div>
        )}
        {/* Sub-array sections: chart + table */}
        {arraySubSections.map(([k, v], i) => {
          const numKeys = Object.keys(v[0]).filter((kk: string) => typeof v[0][kk] === "number");
          return (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>{k.replace(/_/g, " ")}</p>
              {numKeys.length > 0 && <BarSection data={v} />}
              <TableSection data={v} />
            </div>
          );
        })}
        {/* Other nested objects */}
        {otherNested.map(([k, v]) => (
          <div key={k}>
            <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{k.replace(/_/g, " ")}</p>
            <NestedKPIs data={v} />
          </div>
        ))}
      </div>
    );
  }

  return <ProseSection text={String(data)} />;
}

// ── Timeline section ──────────────────────────────────────────────────────────
function TimelineSection({ data }: { data: any[] }) {
  if (data.length === 0) return null;
  const first = data[0];
  if (typeof first !== "object") return <TableSection data={data} />;
  const numKeys = Object.keys(first).filter(k => typeof first[k] === "number");
  const textKeys = Object.keys(first).filter(k => typeof first[k] === "string" && !SKIP_KEYS.has(k));
  const lk = labelKey(first);
  // has both text and number → table + chart
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {numKeys.length > 0 && <LineSection data={data} />}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {data.map((item, i) => {
          const mainLabel = String(item[lk] ?? i + 1);
          const rest = textKeys.filter(k => k !== lk).map(k => item[k]).filter(Boolean);
          const nums = numKeys.map(k => `${k.replace(/_/g," ")}: ${item[k]}`);
          return (
            <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: "8px 0", borderBottom: i < data.length - 1 ? "1px solid var(--border)" : "none" }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: PALETTE[i % PALETTE.length], flexShrink: 0, minWidth: 24, marginTop: 1 }}>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", marginBottom: rest.length || nums.length ? 3 : 0, wordBreak: "break-word" }}>{mainLabel}</p>
                {rest.length > 0 && <p style={{ fontSize: 12, color: "var(--text-secondary)", wordBreak: "break-word" }}>{rest.join(" · ")}</p>}
                {nums.length > 0 && <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, wordBreak: "break-word" }}>{nums.join(" · ")}</p>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Crew / cast directory ─────────────────────────────────────────────────────
function CrewSection({ data }: { data: any }) {
  const items: any[] = Array.isArray(data) ? data : typeof data === "object" && data !== null ? Object.entries(data).map(([k,v]) => ({ role: k, ...(typeof v === "object" ? v : { name: v }) })) : [];
  if (items.length === 0) return <p style={{ fontSize: 12, color: "var(--text-muted)" }}>No crew data.</p>;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(30%, 1fr))", gap: 8 }}>
      {items.map((person, i) => {
        const nameKey = Object.keys(person).find(k => ["name","full_name","person","member"].some(t => k.toLowerCase().includes(t))) ?? Object.keys(person).find(k => typeof person[k] === "string") ?? "name";
        const roleKey = Object.keys(person).find(k => ["role","position","title","job","department"].some(t => k.toLowerCase().includes(t)) && k !== nameKey);
        const name = person[nameKey] ?? `Person ${i+1}`;
        const role = roleKey ? person[roleKey] : undefined;
        const extras = Object.entries(person).filter(([k]) => k !== nameKey && k !== roleKey && !SKIP_KEYS.has(k) && typeof person[k] !== "object");
        const initials = String(name).split(" ").map((n:string) => n[0]).join("").toUpperCase().slice(0,2);
        const color = PALETTE[i % PALETTE.length];
        return (
          <div key={i} style={{ padding: "10px 12px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface-raised)", display: "flex", gap: 10, alignItems: "flex-start", minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: "50%", background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color, flexShrink: 0 }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: role ? 2 : 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(name)}</p>
              {role && <p style={{ fontSize: 11, color, marginBottom: extras.length ? 4 : 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{String(role)}</p>}
              {extras.map(([k,v]) => (
                <p key={k} style={{ fontSize: 11, color: "var(--text-muted)", wordBreak: "break-word" }}>
                  <span style={{ fontWeight: 500 }}>{k.replace(/_/g," ")}: </span>{String(v)}
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
function ProseSection({ text }: { text: string }) {
  return (
    <p style={{ fontSize: 13, lineHeight: 1.75, color: "var(--text-secondary)", whiteSpace: "pre-wrap", wordBreak: "break-word", width: "100%" }}>{text}</p>
  );
}

// ── Nested KPI group ──────────────────────────────────────────────────────────
function NestedKPIs({ data }: { data: Record<string,any> }) {
  const entries = Object.entries(data).filter(([k]) => !SKIP_KEYS.has(k));
  const scalars = entries.filter(([,v]) => typeof v !== "object" || v === null);
  const nested = entries.filter(([,v]) => typeof v === "object" && v !== null);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {scalars.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(22%, 1fr))", gap: 8 }}>
          {scalars.map(([k,v], i) => (
            <div key={k} style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-raised)", minWidth: 0 }}>
              <p style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.replace(/_/g," ")}</p>
              <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", wordBreak: "break-word" }}>{String(v)}</p>
            </div>
          ))}
        </div>
      )}
      {nested.map(([k,v]) => (
        <div key={k}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{k.replace(/_/g," ")}</p>
          {Array.isArray(v) ? <TableSection data={v} /> : typeof v === "object" ? <NestedKPIs data={v} /> : <ProseSection text={String(v)} />}
        </div>
      ))}
    </div>
  );
}


// ── Report document — PowerBI-style dashboard ────────────────────────────────
function ReportDocument({ report }: { report: ProjectReport }) {
  const data = report.data;

  if (!data || report.status.toLowerCase() !== "success") {
    return (
      <div style={{ textAlign: "center", padding: "64px 0", borderRadius: 12, border: "2px dashed var(--border)" }}>
        {["pending","processing"].includes(report.status.toLowerCase()) ? (
          <><Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 10px", color: "var(--text-muted)" }} /><p style={{ fontSize: 13, color: "var(--text-muted)" }}>Generating report…</p></>
        ) : report.status.toLowerCase() === "failed" ? (
          <><BarChart2 size={24} style={{ margin: "0 auto 10px", opacity: 0.2, color: "var(--text-muted)" }} /><p style={{ fontSize: 13, color: "var(--text-muted)" }}>Generation failed. Try regenerating.</p></>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No data available.</p>
        )}
      </div>
    );
  }

  if (typeof data !== "object" || Array.isArray(data)) {
    return <div style={{ borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", padding: "16px" }}><TableSection data={Array.isArray(data) ? data : [data]} /></div>;
  }

  const entries = Object.entries(data as Record<string, any>).filter(([k]) => !SKIP_KEYS.has(k.toLowerCase()));

  // Split scalars (→ KPI strip) vs complex (→ sections)
  const scalars: [string, any][] = entries.filter(([, v]) => typeof v !== "object" || v === null);
  const sections: [string, any][] = entries.filter(([, v]) => typeof v === "object" && v !== null);

  // Separate chart-friendly sections (half-width) from full-width ones
  const halfWidthKinds: SectionKind[] = ["chart_bar", "chart_line", "chart_pie"];
  const classified = sections.map(([k, v]) => ({ key: k, value: v, kind: classifySection(k, v) }));

  // Build rows: pair up adjacent chart sections side-by-side; everything else full-width
  type Row = { type: "kpi" } | { type: "pair"; a: typeof classified[0]; b: typeof classified[0] } | { type: "single"; item: typeof classified[0] };
  const rows: Row[] = [];
  if (scalars.length > 0) rows.push({ type: "kpi" });

  let i = 0;
  while (i < classified.length) {
    const cur = classified[i];
    const next = classified[i + 1];
    if (halfWidthKinds.includes(cur.kind) && next && halfWidthKinds.includes(next.kind)) {
      rows.push({ type: "pair", a: cur, b: next });
      i += 2;
    } else {
      rows.push({ type: "single", item: cur });
      i++;
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
      {rows.map((row, ri) => {
        if (row.type === "kpi") return <KPIStrip key="kpi" stats={scalars} />;
        if (row.type === "pair") return (
          <div key={ri} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, width: "100%" }}>
            <SectionBlock item={row.a} colorIdx={ri * 2} />
            <SectionBlock item={row.b} colorIdx={ri * 2 + 1} />
          </div>
        );
        return <SectionBlock key={ri} item={row.item} colorIdx={ri} />;
      })}
    </div>
  );
}

// ── Section block dispatcher ──────────────────────────────────────────────────
function SectionBlock({ item, colorIdx }: { item: { key: string; value: any; kind: SectionKind }; colorIdx: number }) {
  const color = PALETTE[colorIdx % PALETTE.length];
  const { key, value, kind } = item;

  if (kind === "crew") return (
    <SectionWrap label={key} color={color} fullWidth>
      <CrewSection data={value} />
    </SectionWrap>
  );

  if (kind === "budget") return (
    <SectionWrap label={key} color={color} fullWidth>
      <BudgetSection data={value} />
    </SectionWrap>
  );

  if (kind === "timeline") return (
    <SectionWrap label={key} color={color} fullWidth>
      <TimelineSection data={value} />
    </SectionWrap>
  );

  if (kind === "chart_bar" && Array.isArray(value) && value.length > 0 && typeof value[0] === "object") return (
    <SectionWrap label={key} color={color}>
      <BarSection data={value} />
    </SectionWrap>
  );

  if (kind === "chart_line" && Array.isArray(value) && value.length > 0) return (
    <SectionWrap label={key} color={color}>
      <LineSection data={value} />
    </SectionWrap>
  );

  if (kind === "chart_pie" && Array.isArray(value) && value.length > 0) return (
    <SectionWrap label={key} color={color}>
      <PieSection data={value} />
    </SectionWrap>
  );

  if (kind === "table") return (
    <SectionWrap label={key} color={color} fullWidth>
      <TableSection data={Array.isArray(value) ? value : [value]} />
    </SectionWrap>
  );

  if (kind === "nested_kpis") return (
    <SectionWrap label={key} color={color} fullWidth>
      <NestedKPIs data={value} />
    </SectionWrap>
  );

  if (kind === "prose") return (
    <SectionWrap label={key} color={color} fullWidth>
      <ProseSection text={typeof value === "string" ? value : JSON.stringify(value, null, 2)} />
    </SectionWrap>
  );

  // fallback
  return (
    <SectionWrap label={key} color={color} fullWidth>
      <NestedKPIs data={typeof value === "object" ? value : { value }} />
    </SectionWrap>
  );
}


// ── Main page ────────────────────────────────────────────────────────────────
export default function ResearchDeckPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [generatedReports, setGeneratedReports] = useState<ProjectReport[]>([]);
  const [systemReports, setSystemReports] = useState<AvailableReport[]>([]);
  const [customReports, setCustomReports] = useState<AvailableReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const [showGenerate, setShowGenerate] = useState(false);
  const [showNewCustom, setShowNewCustom] = useState(false);

  const loadAll = useCallback(async () => {
    const [gen, avail] = await Promise.all([
      getGeneratedReports(projectId),
      getAvailableReports(projectId),
    ]);
    setGeneratedReports(gen);
    setSystemReports(avail.system_reports ?? []);
    setCustomReports(avail.custom_reports ?? []);
  }, [projectId]);

  useEffect(() => { loadAll().finally(() => setLoading(false)); }, [loadAll]);

  const handlePollSuccess = useCallback(async () => {
    setPendingTaskId(null);
    toast.success("Reports generated!");
    await loadAll();
  }, [loadAll]);

  const handlePollFailure = useCallback((error?: string) => {
    setPendingTaskId(null);
    toast.error(error === "Timed out" ? "Report generation timed out." : "Report generation failed.");
  }, []);

  const { isPolling } = useTaskPoller(pendingTaskId, handlePollSuccess, handlePollFailure);

  const handleGenerate = async (selected: string[]) => {
    if (selected.length === 0) { toast.error("Select at least one report."); return; }
    setGenerating(true);
    setShowGenerate(false);
    try {
      const result = await generateReports(projectId, selected);
      if (result.task_id) {
        setPendingTaskId(result.task_id);
      } else {
        toast.success(result.message ?? "Generation queued.");
        await loadAll();
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Failed to generate reports.");
    } finally {
      setGenerating(false);
    }
  };

  const systemGenerated = generatedReports.filter((r) => r.report_type !== "custom");
  const customGenerated = generatedReports.filter((r) => r.report_type === "custom");
  const activeReport = generatedReports.find((r) => `report-${r.id}` === activeTab);

  // Build tab list
  const tabs = [
    { id: "overview", label: "Overview", icon: <BookOpen size={13} /> },
    ...systemGenerated.map((r) => ({
      id: `report-${r.id}`,
      label: r.display_name || r.name || `Report #${r.id}`,
      icon: <BarChart2 size={13} />,
      type: "system",
    })),
    ...customGenerated.map((r) => ({
      id: `report-${r.id}`,
      label: r.display_name || r.name || `Report #${r.id}`,
      icon: <Sparkles size={13} />,
      type: "custom",
    })),
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin h-6 w-6" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--background)" }}>
      {/* Top bar */}
      <div
        style={{
          padding: "24px 32px 0",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <BookOpen size={18} color="#22c55e" />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>Research Deck</h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {generatedReports.length} report{generatedReports.length !== 1 ? "s" : ""} generated
            </p>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {isPolling && (
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: "1px solid rgba(34,197,94,0.3)", background: "rgba(34,197,94,0.05)" }}>
              <Loader2 size={13} className="animate-spin" color="#22c55e" />
              <span style={{ fontSize: 12, color: "#22c55e" }}>Generating…</span>
            </div>
          )}
          <button
            onClick={() => setShowNewCustom(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 14px",
              borderRadius: 8, border: "1px solid var(--border)",
              background: "var(--surface-raised)",
              fontSize: 13, fontWeight: 500, color: "var(--text-secondary)",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <Plus size={14} /> Custom
          </button>
          <button
            onClick={() => setShowGenerate(true)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px",
              borderRadius: 8, border: "none",
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              fontSize: 13, fontWeight: 600, color: "#fff",
              cursor: "pointer", boxShadow: "0 4px 14px rgba(34,197,94,0.3)",
              transition: "all 0.15s",
            }}
          >
            <RefreshCw size={14} /> Generate
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div
        style={{
          padding: "16px 32px 0",
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
          overflowX: "auto",
        }}
      >
        <div style={{ display: "flex", gap: 2, minWidth: "max-content" }}>
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            const isCustomTab = (tab as any).type === "custom";
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  padding: "9px 16px",
                  borderRadius: "8px 8px 0 0",
                  border: active ? "1px solid var(--border)" : "1px solid transparent",
                  borderBottom: active ? "1px solid var(--background)" : "1px solid transparent",
                  marginBottom: active ? -1 : 0,
                  background: active ? "var(--background)" : "transparent",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? (isCustomTab ? "#3b82f6" : "#22c55e") : "var(--text-muted)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  whiteSpace: "nowrap",
                }}
              >
                <span style={{ color: active ? (isCustomTab ? "#3b82f6" : "#22c55e") : "var(--text-muted)" }}>
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
          {/* + tab */}
          <button
            onClick={() => setShowNewCustom(true)}
            title="New custom report"
            style={{
              padding: "9px 12px",
              borderRadius: "8px 8px 0 0",
              border: "1px solid transparent",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
              display: "flex", alignItems: "center",
            }}
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }}>
        {/* Overview tab */}
        {activeTab === "overview" && (
          <div style={{ width: "100%" }}>
            {/* Summary cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 28 }}>
              {[
                { label: "System Reports", value: systemGenerated.length, icon: <BarChart2 size={18} />, color: "#22c55e" },
                { label: "Custom Reports", value: customGenerated.length, icon: <Sparkles size={18} />, color: "#3b82f6" },
                { label: "Available to Generate", value: systemReports.length + customReports.length, icon: <RefreshCw size={18} />, color: "#f97316" },
              ].map((card) => (
                <div key={card.label} style={{ padding: "20px 24px", borderRadius: 14, border: "1px solid var(--border)", background: "var(--surface)", display: "flex", alignItems: "center", gap: 16 }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: `${card.color}18`, color: card.color, flexShrink: 0 }}>
                    {card.icon}
                  </div>
                  <div>
                    <p style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>{card.value}</p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>{card.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Report grid */}
            {generatedReports.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 0", borderRadius: 16, border: "2px dashed var(--border)" }}>
                <BookOpen size={40} style={{ margin: "0 auto 16px", opacity: 0.2, color: "var(--text-muted)" }} />
                <p style={{ fontSize: 16, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>No reports yet</p>
                <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 20 }}>Generate your first research report to see insights here.</p>
                <button
                  onClick={() => setShowGenerate(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "10px 20px", borderRadius: 8, background: "linear-gradient(135deg,#22c55e,#16a34a)", color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}
                >
                  <RefreshCw size={14} /> Generate Reports
                </button>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14 }}>
                {generatedReports.map((r, i) => {
                  const isCustom = r.report_type === "custom";
                  const color = isCustom ? "#3b82f6" : PALETTE[i % PALETTE.length];
                  return (
                    <button
                      key={r.id}
                      onClick={() => setActiveTab(`report-${r.id}`)}
                      style={{
                        textAlign: "left",
                        padding: "20px",
                        borderRadius: 14,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        cursor: "pointer",
                        transition: "all 0.15s",
                        position: "relative",
                        overflow: "hidden",
                      }}
                      className="hover:border-emerald-500/30 hover:shadow-lg"
                    >
                      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: color, borderRadius: "14px 14px 0 0" }} />
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 10 }}>
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", color, flexShrink: 0 }}>
                          {isCustom ? <Sparkles size={16} /> : <BarChart2 size={16} />}
                        </div>
                        <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, border: `1px solid ${color}30`, color, background: `${color}10`, whiteSpace: "nowrap" }}>
                          {isCustom ? "custom" : "system"}
                        </span>
                      </div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                        {r.display_name || r.name}
                      </p>
                      <p style={{ fontSize: 11, color: "var(--text-muted)" }}>
                        {new Date(r.created_at).toLocaleDateString()} · {r.status}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Individual report */}
        {activeReport && (
          <div style={{ width: "100%" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
              {activeReport.report_type === "custom"
                ? <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6", background: "rgba(59,130,246,0.1)" }}>custom</span>
                : <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e", background: "rgba(34,197,94,0.1)" }}>system</span>
              }
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{new Date(activeReport.created_at).toLocaleDateString()}</span>
            </div>
            <ReportDocument report={activeReport} />
          </div>
        )}
      </div>

      {showGenerate && (
        <GeneratePanel
          systemReports={systemReports}
          customReports={customReports}
          onGenerate={handleGenerate}
          generating={generating}
          isPolling={isPolling}
          onClose={() => setShowGenerate(false)}
        />
      )}
      {showNewCustom && (
        <NewCustomModal
          projectId={projectId}
          systemReports={systemReports}
          onClose={() => setShowNewCustom(false)}
          onCreated={loadAll}
        />
      )}
    </div>
  );
}
