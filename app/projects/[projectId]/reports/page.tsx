"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Loader2, BookOpen, RefreshCw, Plus, X, BarChart2, TrendingUp, PieChart as PieIcon,
  Layers, ChevronDown, ChevronUp, Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getGeneratedReports, getAvailableReports, generateReports, createCustomReport,
} from "@/services/project";
import { ProjectReport, AvailableReport } from "@/types/project";
import { useTaskPoller } from "@/hooks/useTaskPoller";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";

// ── Colour palette for charts ──────────────────────────────────────────────
const CHART_COLORS = ["#22c55e", "#3b82f6", "#f97316", "#a855f7", "#ec4899", "#14b8a6", "#eab308", "#ef4444"];

// ── JSON → chart type heuristic ─────────────────────────────────────────────
type ChartKind = "bar" | "line" | "pie" | "stat" | "table" | "nested";

function detectChartKind(data: any): ChartKind {
  if (!data) return "stat";
  if (Array.isArray(data)) {
    if (data.length === 0) return "stat";
    const first = data[0];
    if (typeof first !== "object" || first === null) return "stat";
    const keys = Object.keys(first);
    const numericKeys = keys.filter((k) => typeof first[k] === "number");
    if (numericKeys.length === 0) return "table";
    const timeKey = keys.find((k) =>
      ["date", "time", "day", "week", "month", "year", "created_at", "updated_at"].some((t) => k.toLowerCase().includes(t))
    );
    if (timeKey) return "line";
    // If only 2 keys (label + value), prefer pie for small arrays
    if (keys.length === 2 && data.length <= 8 && numericKeys.length === 1) return "pie";
    return "bar";
  }
  if (typeof data === "object") {
    const vals = Object.values(data);
    if (vals.every((v) => typeof v === "number")) {
      return Object.keys(data).length <= 8 ? "pie" : "bar";
    }
    if (vals.some((v) => typeof v === "object" && v !== null)) return "nested";
    return "stat";
  }
  return "stat";
}

// ── Chart renderer ────────────────────────────────────────────────────────
function SmartChart({ data, title }: { data: any; title?: string }) {
  const kind = detectChartKind(data);

  if (kind === "bar") {
    const rows: any[] = Array.isArray(data) ? data : Object.entries(data).map(([k, v]) => ({ key: k, value: v }));
    const keys = Object.keys(rows[0] ?? {}).filter((k) => typeof rows[0][k] === "number");
    const labelKey = Object.keys(rows[0] ?? {}).find((k) => typeof rows[0][k] === "string") || Object.keys(rows[0] ?? {})[0];
    return (
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={rows} margin={{ top: 4, right: 12, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={labelKey} tick={{ fontSize: 11, fill: "var(--text-muted)" }} interval={0} angle={-20} textAnchor="end" />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
          <Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
          {keys.length > 1 && <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />}
          {keys.map((k, i) => <Bar key={k} dataKey={k} fill={CHART_COLORS[i % CHART_COLORS.length]} radius={[3, 3, 0, 0]} />)}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (kind === "line") {
    const rows: any[] = Array.isArray(data) ? data : [];
    const keys = Object.keys(rows[0] ?? {}).filter((k) => typeof rows[0][k] === "number");
    const labelKey = Object.keys(rows[0] ?? {}).find((k) =>
      ["date", "time", "day", "week", "month", "year", "created_at"].some((t) => k.toLowerCase().includes(t))
    ) || Object.keys(rows[0] ?? {})[0];
    return (
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={rows} margin={{ top: 4, right: 12, left: 0, bottom: 24 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis dataKey={labelKey} tick={{ fontSize: 11, fill: "var(--text-muted)" }} interval={0} angle={-20} textAnchor="end" />
          <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} />
          <Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
          {keys.length > 1 && <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />}
          {keys.map((k, i) => (
            <Line key={k} type="monotone" dataKey={k} stroke={CHART_COLORS[i % CHART_COLORS.length]} strokeWidth={2} dot={false} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (kind === "pie") {
    const rows: { name: string; value: number }[] = Array.isArray(data)
      ? data.map((item: any) => {
          const keys = Object.keys(item);
          const valKey = keys.find((k) => typeof item[k] === "number") || keys[1];
          const labelKey = keys.find((k) => typeof item[k] === "string") || keys[0];
          return { name: String(item[labelKey] ?? ""), value: Number(item[valKey] ?? 0) };
        })
      : Object.entries(data).map(([k, v]) => ({ name: k, value: Number(v) }));

    return (
      <ResponsiveContainer width="100%" height={260}>
        <PieChart>
          <Pie data={rows} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
            {rows.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
          </Pie>
          <Tooltip contentStyle={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (kind === "stat") {
    const entries = typeof data === "object" && data !== null ? Object.entries(data) : [["value", data]];
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {entries.map(([k, v]) => (
          <div key={k} className="rounded-lg p-3 border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
            <p className="text-xs mb-1 truncate" style={{ color: "var(--text-muted)" }}>{k.replace(/_/g, " ")}</p>
            <p className="text-lg font-bold truncate" style={{ color: "var(--text-primary)" }}>{String(v)}</p>
          </div>
        ))}
      </div>
    );
  }

  if (kind === "table") {
    const rows: any[] = Array.isArray(data) ? data : [];
    const cols = rows.length > 0 ? Object.keys(rows[0]) : [];
    return (
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr>
              {cols.map((c) => <th key={c} className="px-3 py-2 text-left font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--border)" }}>{c.replace(/_/g, " ")}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} style={{ borderBottom: "1px solid var(--border)" }}>
                {cols.map((c) => <td key={c} className="px-3 py-2" style={{ color: "var(--text-secondary)" }}>{String(row[c] ?? "")}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  // nested: render each sub-key as its own chart card
  if (kind === "nested") {
    const entries = Object.entries(data as Record<string, any>);
    return (
      <div className="space-y-4">
        {entries.map(([k, v]) => (
          <div key={k}>
            <p className="text-xs font-semibold mb-2 capitalize" style={{ color: "var(--text-secondary)" }}>{k.replace(/_/g, " ")}</p>
            <SmartChart data={v} />
          </div>
        ))}
      </div>
    );
  }

  return null;
}

// ── Section (collapsible data block within a report tab) ──────────────────
function DataSection({ sectionKey, sectionData }: { sectionKey: string; sectionData: any }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
      <button
        onClick={() => setOpen((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold capitalize" style={{ color: "var(--text-primary)" }}>
          {sectionKey.replace(/_/g, " ")}
        </span>
        {open ? <ChevronUp size={15} style={{ color: "var(--text-muted)" }} /> : <ChevronDown size={15} style={{ color: "var(--text-muted)" }} />}
      </button>
      {open && (
        <div className="px-4 pb-4">
          <SmartChart data={sectionData} />
        </div>
      )}
    </div>
  );
}

// ── Report tab content ────────────────────────────────────────────────────
function ReportTabContent({ report }: { report: ProjectReport }) {
  const data = report.data;

  if (!data) {
    return (
      <div className="flex flex-col items-center gap-2 py-16" style={{ color: "var(--text-muted)" }}>
        <Layers size={32} className="opacity-40" />
        <p className="text-sm">No data available for this report.</p>
      </div>
    );
  }

  // If data is an object with multiple top-level keys that are themselves objects/arrays, render as sections
  if (typeof data === "object" && !Array.isArray(data)) {
    const entries = Object.entries(data as Record<string, any>);
    const isSectioned = entries.length > 1 && entries.some(([, v]) => typeof v === "object" && v !== null);
    if (isSectioned) {
      return (
        <div className="space-y-4">
          {entries.map(([k, v]) => <DataSection key={k} sectionKey={k} sectionData={v} />)}
        </div>
      );
    }
  }

  return (
    <div className="rounded-xl border p-4" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
      <SmartChart data={data} />
    </div>
  );
}

// ── Custom report creation modal ──────────────────────────────────────────
function NewCustomReportModal({
  projectId,
  systemReports,
  onClose,
  onCreated,
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

  const toggleDep = (n: string) =>
    setDeps((prev) => prev.includes(n) ? prev.filter((d) => d !== n) : [...prev, n]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Name is required."); return; }
    setSaving(true);
    try {
      await createCustomReport({
        project_id: projectId,
        name: name.trim(),
        display_name: displayName.trim() || undefined,
        prompt_template: promptTemplate.trim() || undefined,
        dependencies: deps.length > 0 ? deps : undefined,
      });
      toast.success("Custom report created!");
      onCreated();
      onClose();
    } catch (e: any) {
      const msg = Object.values(e?.response?.data || {}).flat().join(" ") || "Failed to create custom report.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ borderColor: "var(--border)", background: "var(--surface)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>New Custom Report</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Name (lowercase, underscores) <span className="text-red-400">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="my_custom_report" className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Display Name</label>
            <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="My Custom Report" className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: "var(--text-secondary)" }}>Prompt Template</label>
            <textarea value={promptTemplate} onChange={(e) => setPromptTemplate(e.target.value)} rows={4} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none" />
          </div>
          {systemReports.length > 0 && (
            <div>
              <label className="block text-xs font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Dependencies (system reports)</label>
              <div className="flex flex-wrap gap-2">
                {systemReports.map((r) => (
                  <label key={r.id} className="flex items-center gap-1.5 text-xs cursor-pointer px-2 py-1 rounded border transition-colors" style={{ borderColor: deps.includes(r.name) ? "rgb(16,185,129)" : "var(--border)", color: deps.includes(r.name) ? "rgb(52,211,153)" : "var(--text-muted)", background: deps.includes(r.name) ? "rgba(16,185,129,0.1)" : "var(--surface-raised)" }}>
                    <input type="checkbox" checked={deps.includes(r.name)} onChange={() => toggleDep(r.name)} className="accent-emerald-500" />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm" style={{ color: "var(--text-secondary)" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
            {saving && <Loader2 size={13} className="animate-spin" />}
            Create
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Generate panel (slide-in drawer) ─────────────────────────────────────
function GeneratePanel({
  systemReports,
  customReports,
  onGenerate,
  generating,
  isPolling,
  onClose,
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
  const all = [...systemReports, ...customReports];

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="ml-auto w-80 h-full shadow-2xl flex flex-col" style={{ background: "var(--surface)", borderLeft: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Generate Reports</h3>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {systemReports.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>System</p>
              <div className="space-y-1">
                {systemReports.map((r) => (
                  <label key={r.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${selected.includes(r.name) ? "border-emerald-500/40 bg-emerald-500/5" : ""}`} style={!selected.includes(r.name) ? { borderColor: "var(--border)", background: "var(--surface-raised)" } : undefined}>
                    <input type="checkbox" checked={selected.includes(r.name)} onChange={() => toggle(r.name)} className="accent-emerald-500" />
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{r.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {customReports.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Custom</p>
              <div className="space-y-1">
                {customReports.map((r) => (
                  <label key={r.id} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${selected.includes(r.name) ? "border-emerald-500/40 bg-emerald-500/5" : ""}`} style={!selected.includes(r.name) ? { borderColor: "var(--border)", background: "var(--surface-raised)" } : undefined}>
                    <input type="checkbox" checked={selected.includes(r.name)} onChange={() => toggle(r.name)} className="accent-emerald-500" />
                    <span className="text-xs px-1 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20 mr-1">custom</span>
                    <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{r.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          {all.length === 0 && <p className="text-sm" style={{ color: "var(--text-muted)" }}>No reports available.</p>}
        </div>
        <div className="p-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={() => onGenerate(selected)}
            disabled={generating || isPolling || selected.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {(generating || isPolling) ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
            {isPolling ? "Generating…" : `Generate (${selected.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────
type ReportTab = "system" | "custom" | string; // string = report id

export default function ResearchDeckPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [generatedReports, setGeneratedReports] = useState<ProjectReport[]>([]);
  const [systemReports, setSystemReports] = useState<AvailableReport[]>([]);
  const [customReports, setCustomReports] = useState<AvailableReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>("system");
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

  useEffect(() => {
    loadAll().finally(() => setLoading(false));
  }, [loadAll]);

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

  // Build tab list: "System" tab + each completed system report + "Custom" tab + each completed custom report + "+" new custom
  type TabDef = { id: string; label: string; icon?: React.ElementType };
  const tabs: TabDef[] = [
    { id: "system", label: "System Reports", icon: BarChart2 },
    ...systemGenerated.map((r) => ({ id: `report-${r.id}`, label: r.display_name || r.name || `Report #${r.id}` })),
    { id: "custom", label: "Custom Reports", icon: Sparkles },
    ...customGenerated.map((r) => ({ id: `report-${r.id}`, label: r.display_name || r.name || `Report #${r.id}` })),
  ];

  const activeReport = generatedReports.find((r) => `report-${r.id}` === activeTab);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin h-6 w-6" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: "var(--background)" }}>
      {/* Header */}
      <div className="px-8 pt-8 pb-0 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6" style={{ color: "var(--text-muted)" }} />
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Research Deck</h1>
        </div>
        <div className="flex items-center gap-2">
          {isPolling && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
              <Loader2 size={13} className="animate-spin text-emerald-400" />
              <span className="text-xs text-emerald-400">Generating…</span>
            </div>
          )}
          <button
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-md transition-colors"
          >
            <RefreshCw size={13} />
            Generate
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="px-8 mt-5 overflow-x-auto flex-shrink-0">
        <div className="flex items-center gap-0 border-b min-w-max" style={{ borderColor: "var(--border)" }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px whitespace-nowrap ${
                  active ? "border-emerald-500 text-emerald-400" : "border-transparent"
                }`}
                style={!active ? { color: "var(--text-muted)" } : undefined}
              >
                {Icon && <Icon size={13} />}
                {tab.label}
              </button>
            );
          })}
          {/* "+" tab to create new custom report */}
          <button
            onClick={() => setShowNewCustom(true)}
            className="flex items-center gap-1 px-3 py-2.5 text-sm border-b-2 border-transparent transition-colors -mb-px"
            style={{ color: "var(--text-muted)" }}
            title="New custom report"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto px-8 py-6">
        {/* "System Reports" overview tab */}
        {activeTab === "system" && (
          <div className="space-y-4 max-w-4xl">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              System-generated analytical reports for this project. Click a report tab above to explore visualisations.
            </p>
            {systemGenerated.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-dashed" style={{ borderColor: "var(--border)" }}>
                <BarChart2 size={36} className="opacity-30" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No system reports generated yet.</p>
                <button onClick={() => setShowGenerate(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md transition-colors hover:border-emerald-500/50 hover:text-emerald-400" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                  <RefreshCw size={13} /> Generate Reports
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {systemGenerated.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveTab(`report-${r.id}`)}
                    className="text-left p-4 rounded-xl border transition-colors hover:border-emerald-500/40"
                    style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <TrendingUp size={14} className="text-emerald-400" />
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{r.display_name || r.name}</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(r.created_at).toLocaleDateString()} · {r.status}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* "Custom Reports" overview tab */}
        {activeTab === "custom" && (
          <div className="space-y-4 max-w-4xl">
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Custom AI-generated reports using your own prompt templates.</p>
              <button onClick={() => setShowNewCustom(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-sm border rounded-md transition-colors hover:border-emerald-500/50 hover:text-emerald-400" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                <Plus size={13} /> New Custom Report
              </button>
            </div>
            {customGenerated.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-16 rounded-xl border border-dashed" style={{ borderColor: "var(--border)" }}>
                <Sparkles size={36} className="opacity-30" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>No custom reports yet. Create one to get started.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {customGenerated.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setActiveTab(`report-${r.id}`)}
                    className="text-left p-4 rounded-xl border transition-colors hover:border-blue-500/40"
                    style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs px-1 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">custom</span>
                      <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{r.display_name || r.name}</span>
                    </div>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {new Date(r.created_at).toLocaleDateString()} · {r.status}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Individual report tab */}
        {activeReport && (
          <div className="max-w-4xl space-y-2">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
                  {activeReport.display_name || activeReport.name || `Report #${activeReport.id}`}
                </h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  Generated {new Date(activeReport.created_at).toLocaleDateString()} · {activeReport.status}
                  {activeReport.report_type === "custom" && <span className="ml-2 px-1 py-0.5 rounded border bg-blue-500/10 text-blue-400 border-blue-500/20">custom</span>}
                </p>
              </div>
            </div>
            {activeReport.status.toLowerCase() !== "success" ? (
              <div className="flex items-center gap-2 p-4 rounded-xl border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
                <Loader2 size={14} className="animate-spin" style={{ color: "var(--text-muted)" }} />
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Report status: {activeReport.status}. Data will appear once generation completes.</p>
              </div>
            ) : (
              <ReportTabContent report={activeReport} />
            )}
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
        <NewCustomReportModal
          projectId={projectId}
          systemReports={systemReports}
          onClose={() => setShowNewCustom(false)}
          onCreated={loadAll}
        />
      )}
    </div>
  );
}
