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

// ── Detect data shape ────────────────────────────────────────────────────────
type Shape = "bar" | "line" | "pie" | "radar" | "stat" | "list" | "text" | "nested";

function detectShape(data: any): Shape {
  if (data === null || data === undefined) return "text";
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") return "text";
  if (Array.isArray(data)) {
    if (data.length === 0) return "list";
    if (data.every((v) => typeof v === "string" || typeof v === "number")) return "list";
    const first = data[0];
    if (typeof first !== "object") return "list";
    const numericKeys = Object.keys(first).filter((k) => typeof first[k] === "number");
    if (numericKeys.length === 0) return "list";
    const hasTime = Object.keys(first).some((k) =>
      ["date", "time", "day", "week", "month", "year", "created_at", "period"].some((t) => k.toLowerCase().includes(t))
    );
    if (hasTime) return "line";
    if (data.length <= 7 && numericKeys.length === 1) return "pie";
    if (data.length <= 8 && numericKeys.length >= 3) return "radar";
    return "bar";
  }
  if (typeof data === "object") {
    const entries = Object.entries(data);
    if (entries.every(([, v]) => typeof v === "number")) {
      return entries.length <= 7 ? "pie" : "bar";
    }
    if (entries.some(([, v]) => typeof v === "object" && v !== null)) return "nested";
    if (entries.every(([, v]) => typeof v === "string" || typeof v === "number")) return "stat";
    return "stat";
  }
  return "text";
}

// ── Chart components ─────────────────────────────────────────────────────────
function ChartView({ data, shape }: { data: any; shape: Shape }) {
  if (shape === "bar") {
    const rows: any[] = Array.isArray(data) ? data : Object.entries(data).map(([k, v]) => ({ _key: k, value: v }));
    const numericKeys = rows.length > 0 ? Object.keys(rows[0]).filter((k) => typeof rows[0][k] === "number") : [];
    const labelKey = rows.length > 0
      ? (Object.keys(rows[0]).find((k) => typeof rows[0][k] === "string") ?? "_key" ?? Object.keys(rows[0])[0])
      : "";
    return (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={rows} margin={{ top: 8, right: 16, bottom: 32, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={labelKey} tick={{ fontSize: 11, fill: "var(--text-muted)" }} interval={0} angle={-25} textAnchor="end" />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
          <Tooltip
            contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }}
            cursor={{ fill: "rgba(34,197,94,0.06)" }}
          />
          {numericKeys.length > 1 && <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
          {numericKeys.map((k, i) => (
            <Bar key={k} dataKey={k} fill={PALETTE[i % PALETTE.length]} radius={[4, 4, 0, 0]} maxBarSize={48} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (shape === "line") {
    const rows: any[] = Array.isArray(data) ? data : [];
    const numericKeys = rows.length > 0 ? Object.keys(rows[0]).filter((k) => typeof rows[0][k] === "number") : [];
    const labelKey = rows.length > 0
      ? Object.keys(rows[0]).find((k) =>
          ["date", "time", "day", "week", "month", "year", "created_at", "period"].some((t) => k.toLowerCase().includes(t))
        ) ?? Object.keys(rows[0])[0]
      : "";
    return (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={rows} margin={{ top: 8, right: 16, bottom: 32, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
          <XAxis dataKey={labelKey} tick={{ fontSize: 11, fill: "var(--text-muted)" }} interval={0} angle={-25} textAnchor="end" />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, boxShadow: "0 4px 20px rgba(0,0,0,0.2)" }} />
          {numericKeys.length > 1 && <Legend iconSize={10} wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />}
          {numericKeys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (shape === "pie") {
    const rows: { name: string; value: number }[] = Array.isArray(data)
      ? data.map((item: any) => {
          const keys = Object.keys(item);
          const valKey = keys.find((k) => typeof item[k] === "number") ?? keys[1];
          const lKey = keys.find((k) => typeof item[k] === "string") ?? keys[0];
          return { name: String(item[lKey] ?? ""), value: Number(item[valKey] ?? 0) };
        })
      : Object.entries(data).map(([k, v]) => ({ name: k, value: Number(v) }));

    const RADIAN = Math.PI / 180;
    const renderLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }: any) => {
      const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
      const x = cx + radius * Math.cos(-midAngle * RADIAN);
      const y = cy + radius * Math.sin(-midAngle * RADIAN);
      if (percent < 0.06) return null;
      return (
        <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={600}>
          {`${(percent * 100).toFixed(0)}%`}
        </text>
      );
    };

    return (
      <div style={{ display: "flex", gap: 24, alignItems: "center", flexWrap: "wrap" }}>
        <ResponsiveContainer width={220} height={220}>
          <PieChart>
            <Pie data={rows} cx="50%" cy="50%" outerRadius={95} dataKey="value" labelLine={false} label={renderLabel}>
              {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
            </Pie>
            <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
          </PieChart>
        </ResponsiveContainer>
        <div style={{ flex: 1, minWidth: 140, display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((row, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: PALETTE[i % PALETTE.length], flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: "var(--text-secondary)", flex: 1 }}>{row.name}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{row.value.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (shape === "radar") {
    const rows: any[] = Array.isArray(data) ? data : [];
    const numericKeys = rows.length > 0 ? Object.keys(rows[0]).filter((k) => typeof rows[0][k] === "number") : [];
    const labelKey = rows.length > 0 ? Object.keys(rows[0]).find((k) => typeof rows[0][k] === "string") ?? Object.keys(rows[0])[0] : "";
    return (
      <ResponsiveContainer width="100%" height={260}>
        <RadarChart data={rows}>
          <PolarGrid stroke="var(--border)" />
          <PolarAngleAxis dataKey={labelKey} tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
          <Tooltip contentStyle={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
          {numericKeys.map((k, i) => (
            <Radar key={k} dataKey={k} stroke={PALETTE[i % PALETTE.length]} fill={PALETTE[i % PALETTE.length]} fillOpacity={0.15} />
          ))}
          {numericKeys.length > 1 && <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />}
        </RadarChart>
      </ResponsiveContainer>
    );
  }

  return null;
}

// ── Stat cards ───────────────────────────────────────────────────────────────
function StatCards({ data }: { data: Record<string, any> }) {
  const entries = Object.entries(data).filter(([, v]) => typeof v !== "object" || v === null);
  if (entries.length === 0) return null;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 12 }}>
      {entries.map(([k, v]) => (
        <div
          key={k}
          style={{
            padding: "16px 18px",
            borderRadius: 12,
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
          }}
        >
          <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            {k.replace(/_/g, " ")}
          </p>
          <p style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
            {String(v)}
          </p>
        </div>
      ))}
    </div>
  );
}

// ── List view ────────────────────────────────────────────────────────────────
function ListView({ data }: { data: any[] }) {
  return (
    <ul style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {data.map((item, i) => (
        <li
          key={i}
          style={{
            padding: "8px 12px",
            borderRadius: 8,
            background: "var(--surface-raised)",
            border: "1px solid var(--border)",
            fontSize: 13,
            color: "var(--text-primary)",
            display: "flex",
            alignItems: "flex-start",
            gap: 8,
          }}
        >
          <span style={{ color: "#22c55e", fontWeight: 700, flexShrink: 0, marginTop: 1 }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          {typeof item === "object" ? (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 16px" }}>
              {Object.entries(item).map(([k, v]) => (
                <span key={k}>
                  <span style={{ color: "var(--text-muted)", fontSize: 11 }}>{k}: </span>
                  <span style={{ color: "var(--text-primary)", fontSize: 12 }}>{String(v)}</span>
                </span>
              ))}
            </div>
          ) : (
            <span>{String(item)}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

// ── Editable text block ──────────────────────────────────────────────────────
function EditableTextBlock({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = textareaRef.current.scrollHeight + "px";
    }
  }, [editing]);

  if (editing) {
    return (
      <div>
        <textarea
          ref={textareaRef}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
          style={{
            width: "100%",
            background: "var(--surface-raised)",
            border: "1px solid #22c55e",
            borderRadius: 8,
            padding: "10px 12px",
            fontSize: 14,
            lineHeight: 1.7,
            color: "var(--text-primary)",
            resize: "none",
            outline: "none",
            minHeight: 80,
          }}
        />
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <button
            onClick={() => { onChange(draft); setEditing(false); }}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              padding: "5px 12px", borderRadius: 6, fontSize: 12, fontWeight: 600,
              background: "#22c55e", color: "#fff", border: "none", cursor: "pointer",
            }}
          >
            <Check size={12} /> Save
          </button>
          <button
            onClick={() => { setDraft(value); setEditing(false); }}
            style={{
              padding: "5px 12px", borderRadius: 6, fontSize: 12,
              background: "none", color: "var(--text-muted)", border: "1px solid var(--border)", cursor: "pointer",
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={() => setEditing(true)}
      style={{
        position: "relative",
        padding: "10px 12px",
        borderRadius: 8,
        border: "1px solid transparent",
        cursor: "text",
        transition: "all 0.15s",
        lineHeight: 1.7,
        fontSize: 14,
        color: "var(--text-primary)",
        whiteSpace: "pre-wrap",
      }}
      className="group hover:border-[var(--border)] hover:bg-[var(--surface-raised)]"
    >
      {value || <span style={{ color: "var(--text-muted)", fontStyle: "italic" }}>Click to add content…</span>}
      <span
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ position: "absolute", top: 8, right: 8 }}
      >
        <Edit3 size={12} color="var(--text-muted)" />
      </span>
    </div>
  );
}

// ── Section icon picker ──────────────────────────────────────────────────────
function sectionIcon(key: string) {
  const k = key.toLowerCase();
  if (["summary", "overview", "description", "synopsis", "story"].some((t) => k.includes(t))) return <FileText size={15} />;
  if (["character", "cast", "crew", "team", "people"].some((t) => k.includes(t))) return <Sparkles size={15} />;
  if (["scene", "shot", "location", "place"].some((t) => k.includes(t))) return <Activity size={15} />;
  if (["budget", "cost", "finance", "revenue", "profit"].some((t) => k.includes(t))) return <TrendingUp size={15} />;
  if (["genre", "tone", "theme", "mood", "style"].some((t) => k.includes(t))) return <PieIcon size={15} />;
  if (["timeline", "schedule", "plan", "phase"].some((t) => k.includes(t))) return <Activity size={15} />;
  return <Layers size={15} />;
}

// ── Report section block ─────────────────────────────────────────────────────
function ReportSection({
  sectionKey,
  sectionData,
  edits,
  onEdit,
  accent,
}: {
  sectionKey: string;
  sectionData: any;
  edits: Record<string, string>;
  onEdit: (path: string, value: string) => void;
  accent: string;
}) {
  const [open, setOpen] = useState(true);
  const shape = detectShape(sectionData);

  const hasChart = ["bar", "line", "pie", "radar"].includes(shape);
  const hasStats = shape === "stat" && typeof sectionData === "object" && !Array.isArray(sectionData);
  const hasList = shape === "list" && Array.isArray(sectionData);
  const hasText = shape === "text";
  const hasNested = shape === "nested";

  // For text/string values, allow editing
  const editKey = `section:${sectionKey}`;
  const displayText = edits[editKey] ?? (hasText ? String(sectionData) : "");

  return (
    <section
      style={{
        borderRadius: 16,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        overflow: "hidden",
      }}
    >
      {/* Section header */}
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px 24px",
          background: "none",
          border: "none",
          cursor: "pointer",
          borderBottom: open ? "1px solid var(--border)" : "none",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: `${accent}18`,
              color: accent,
              flexShrink: 0,
            }}
          >
            {sectionIcon(sectionKey)}
          </span>
          <span style={{ fontSize: 15, fontWeight: 600, color: "var(--text-primary)", textAlign: "left" }}>
            {sectionKey.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
          </span>
        </div>
        <span style={{ color: "var(--text-muted)" }}>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open && (
        <div style={{ padding: "20px 24px" }}>
          {hasText && (
            <EditableTextBlock
              value={displayText}
              onChange={(v) => onEdit(editKey, v)}
            />
          )}

          {hasStats && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <StatCards data={sectionData} />
              {/* Also editable notes */}
              {edits[editKey] !== undefined && (
                <EditableTextBlock value={edits[editKey]} onChange={(v) => onEdit(editKey, v)} />
              )}
              <button
                onClick={() => onEdit(editKey, edits[editKey] ?? "")}
                style={{
                  alignSelf: "flex-start",
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 11, color: "var(--text-muted)",
                  background: "none", border: "1px dashed var(--border)", borderRadius: 6,
                  padding: "4px 10px", cursor: "pointer",
                }}
              >
                <Edit3 size={10} /> Add notes
              </button>
            </div>
          )}

          {hasChart && (
            <div>
              <ChartView data={sectionData} shape={shape} />
              {edits[editKey] !== undefined && (
                <div style={{ marginTop: 16 }}>
                  <EditableTextBlock value={edits[editKey]} onChange={(v) => onEdit(editKey, v)} />
                </div>
              )}
              <button
                onClick={() => onEdit(editKey, edits[editKey] ?? "")}
                style={{
                  marginTop: 12,
                  display: "flex", alignItems: "center", gap: 4,
                  fontSize: 11, color: "var(--text-muted)",
                  background: "none", border: "1px dashed var(--border)", borderRadius: 6,
                  padding: "4px 10px", cursor: "pointer",
                }}
              >
                <Edit3 size={10} /> Add analysis notes
              </button>
            </div>
          )}

          {hasList && <ListView data={sectionData} />}

          {hasNested && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {Object.entries(sectionData as Record<string, any>).map(([k, v]) => (
                <div key={k}>
                  <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                    {k.replace(/_/g, " ")}
                  </p>
                  <ReportSection
                    sectionKey={k}
                    sectionData={v}
                    edits={edits}
                    onEdit={onEdit}
                    accent={accent}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

// ── Generate panel ───────────────────────────────────────────────────────────
function GeneratePanel({
  systemReports, customReports, onGenerate, generating, isPolling, onClose,
}: {
  systemReports: AvailableReport[];
  customReports: AvailableReport[];
  onGenerate: (selected: string[]) => void;
  generating: boolean;
  isPolling: boolean;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const toggle = (n: string) => setSelected((p) => p.includes(n) ? p.filter((x) => x !== n) : [...p, n]);

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div
        className="ml-auto h-full flex flex-col shadow-2xl"
        style={{ width: 320, background: "var(--surface)", borderLeft: "1px solid var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Generate Reports</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {systemReports.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>System</p>
              {systemReports.map((r) => (
                <label key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer mb-1.5 transition-colors ${selected.includes(r.name) ? "border-emerald-500/40 bg-emerald-500/5" : ""}`} style={!selected.includes(r.name) ? { borderColor: "var(--border)", background: "var(--surface-raised)" } : undefined}>
                  <input type="checkbox" checked={selected.includes(r.name)} onChange={() => toggle(r.name)} className="accent-emerald-500" />
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{r.name.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
          )}
          {customReports.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Custom</p>
              {customReports.map((r) => (
                <label key={r.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer mb-1.5 transition-colors ${selected.includes(r.name) ? "border-blue-500/40 bg-blue-500/5" : ""}`} style={!selected.includes(r.name) ? { borderColor: "var(--border)", background: "var(--surface-raised)" } : undefined}>
                  <input type="checkbox" checked={selected.includes(r.name)} onChange={() => toggle(r.name)} className="accent-blue-500" />
                  <span className="text-xs px-1.5 py-0.5 rounded border border-blue-500/30 bg-blue-500/10 text-blue-400 mr-1">custom</span>
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{r.name.replace(/_/g, " ")}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => onGenerate(selected)}
            disabled={generating || isPolling || selected.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {(generating || isPolling) ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {isPolling ? "Generating…" : `Generate (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── New custom report modal ──────────────────────────────────────────────────
function NewCustomModal({
  projectId, systemReports, onClose, onCreated,
}: {
  projectId: string;
  systemReports: AvailableReport[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [promptTemplate, setPromptTemplate] = useState("");
  const [deps, setDeps] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    try {
      await createCustomReport({ project_id: projectId, name: name.trim(), display_name: displayName.trim() || undefined, prompt_template: promptTemplate.trim() || undefined, dependencies: deps.length > 0 ? deps : undefined });
      toast.success("Custom report created!");
      onCreated();
      onClose();
    } catch (e: any) {
      toast.error(Object.values(e?.response?.data || {}).flat().join(" ") || "Failed to create.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ borderColor: "var(--border)", background: "var(--surface)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>New Custom Report</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Internal name <span className="text-red-400">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="my_report" className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Display name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="My Report" className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Prompt template</label>
            <textarea value={promptTemplate} onChange={(e) => setPromptTemplate(e.target.value)} rows={4} className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none" />
          </div>
          {systemReports.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Dependencies</label>
              <div className="flex flex-wrap gap-2">
                {systemReports.map((r) => (
                  <label key={r.id} className="flex items-center gap-1.5 text-xs cursor-pointer px-2 py-1 rounded-md border transition-colors" style={{ borderColor: deps.includes(r.name) ? "rgb(16,185,129)" : "var(--border)", color: deps.includes(r.name) ? "rgb(52,211,153)" : "var(--text-muted)", background: deps.includes(r.name) ? "rgba(16,185,129,0.1)" : "var(--surface-raised)" }}>
                    <input type="checkbox" checked={deps.includes(r.name)} onChange={() => setDeps((p) => p.includes(r.name) ? p.filter((d) => d !== r.name) : [...p, r.name])} className="accent-emerald-500" />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm" style={{ color: "var(--text-secondary)" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors">
            {saving && <Loader2 size={13} className="animate-spin" />} Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report document view ─────────────────────────────────────────────────────
function ReportDocument({ report }: { report: ProjectReport }) {
  const [edits, setEdits] = useState<Record<string, string>>({});

  const handleEdit = useCallback((path: string, value: string) => {
    setEdits((prev) => ({ ...prev, [path]: value }));
  }, []);

  const data = report.data;

  if (!data || report.status.toLowerCase() !== "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-24 rounded-2xl border border-dashed" style={{ borderColor: "var(--border)" }}>
        {report.status.toLowerCase() === "pending" || report.status.toLowerCase() === "processing" ? (
          <>
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Report is being generated…</p>
          </>
        ) : report.status.toLowerCase() === "failed" ? (
          <>
            <BarChart2 size={28} className="opacity-30" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Generation failed. Try regenerating.</p>
          </>
        ) : (
          <>
            <BarChart2 size={28} className="opacity-30" style={{ color: "var(--text-muted)" }} />
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No data available.</p>
          </>
        )}
      </div>
    );
  }

  // Identify top-level structure
  const isTopLevelObject = typeof data === "object" && !Array.isArray(data);
  const sections = isTopLevelObject ? Object.entries(data as Record<string, any>) : null;

  // Extract scalar/stat fields to show as hero stats at top
  const heroStats: Record<string, any> = {};
  const sectionEntries: [string, any][] = [];

  if (sections) {
    sections.forEach(([k, v]) => {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        heroStats[k] = v;
      } else {
        sectionEntries.push([k, v]);
      }
    });
  }

  const accent = report.report_type === "custom" ? "#3b82f6" : "#22c55e";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Hero stats strip */}
      {Object.keys(heroStats).length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: 12,
          }}
        >
          {Object.entries(heroStats).map(([k, v], i) => (
            <div
              key={k}
              style={{
                padding: "18px 20px",
                borderRadius: 14,
                background: "var(--surface)",
                border: "1px solid var(--border)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: PALETTE[i % PALETTE.length],
                  borderRadius: "14px 14px 0 0",
                }}
              />
              <p style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
                {k.replace(/_/g, " ")}
              </p>
              <p style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.1 }}>
                {String(v)}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Section cards */}
      {sectionEntries.length > 0 ? (
        sectionEntries.map(([k, v], i) => (
          <ReportSection
            key={k}
            sectionKey={k}
            sectionData={v}
            edits={edits}
            onEdit={handleEdit}
            accent={PALETTE[i % PALETTE.length]}
          />
        ))
      ) : !sections ? (
        // Root data is array/primitive
        <div style={{ borderRadius: 16, border: "1px solid var(--border)", background: "var(--surface)", padding: "20px 24px" }}>
          <ChartView data={data} shape={detectShape(data)} />
        </div>
      ) : null}
    </div>
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
      <div style={{ flex: 1, overflowY: "auto", padding: "28px 32px" }}>
        {/* Overview tab */}
        {activeTab === "overview" && (
          <div style={{ maxWidth: 1100 }}>
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
          <div style={{ maxWidth: 1100 }}>
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
