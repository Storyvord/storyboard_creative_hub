"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Loader2, BarChart2, RefreshCw, CheckSquare, Plus, X, Copy, Check } from "lucide-react";
import { toast } from "react-toastify";
import {
  getGeneratedReports, getAvailableReports, generateReports, createCustomReport,
} from "@/services/project";
import { ProjectReport, AvailableReport } from "@/types/project";
import { useTaskPoller } from "@/hooks/useTaskPoller";

type Tab = "generated" | "available";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    processing: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  const cls = map[status.toLowerCase()] ?? "bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border)]";
  return <span className={`text-xs px-2 py-0.5 rounded border ${cls}`}>{status}</span>;
}

function DataModal({ report, onClose }: { report: ProjectReport; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const json = JSON.stringify(report.data, null, 2);

  const copy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl max-h-[85vh] rounded-xl border shadow-2xl flex flex-col" style={{ borderColor: "var(--border)", background: "var(--surface)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: "var(--border)" }}>
          <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{report.display_name || report.name || `Report #${report.id}`}</h3>
          <div className="flex items-center gap-2">
            <button onClick={copy} className="flex items-center gap-1 text-xs px-2 py-1 rounded border transition-colors hover:border-emerald-500/50" style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
              {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
          </div>
        </div>
        <pre className="flex-1 overflow-auto p-4 text-xs font-mono leading-relaxed" style={{ color: "var(--text-secondary)", background: "var(--surface-raised)" }}>
          {json}
        </pre>
      </div>
    </div>
  );
}

function CustomReportModal({
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
      const msg = Object.values(e?.response?.data || {}).flat().join(' ') || "Failed to create custom report.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ borderColor: "var(--border)", background: "var(--surface)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>Create Custom Report</h3>
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

export default function ReportsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [tab, setTab] = useState<Tab>("generated");
  const [generatedReports, setGeneratedReports] = useState<ProjectReport[]>([]);
  const [systemReports, setSystemReports] = useState<AvailableReport[]>([]);
  const [customReports, setCustomReports] = useState<AvailableReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [pendingTaskId, setPendingTaskId] = useState<string | null>(null);
  const [viewData, setViewData] = useState<ProjectReport | null>(null);
  const [customModal, setCustomModal] = useState(false);

  const loadGenerated = async () => {
    const data = await getGeneratedReports(projectId);
    setGeneratedReports(data);
  };

  useEffect(() => {
    Promise.allSettled([
      getGeneratedReports(projectId).then(setGeneratedReports),
      getAvailableReports(projectId).then((d) => {
        setSystemReports(d.system_reports ?? []);
        setCustomReports(d.custom_reports ?? []);
      }),
    ]).finally(() => setLoading(false));
  }, [projectId]);

  const toggleSelect = (name: string) =>
    setSelected((prev) => prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]);

  const handlePollSuccess = useCallback(async () => {
    setPendingTaskId(null);
    toast.success('Reports generated!');
    await loadGenerated();
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handlePollFailure = useCallback((error?: string) => {
    setPendingTaskId(null);
    toast.error(error === 'Timed out'
      ? 'Report generation timed out. Please try again.'
      : 'Report generation failed. Please try again.');
  }, []);

  const { isPolling } = useTaskPoller(pendingTaskId, handlePollSuccess, handlePollFailure);

  const handleGenerate = async () => {
    if (selected.length === 0) { toast.error("Select at least one report."); return; }
    setGenerating(true);
    try {
      const result = await generateReports(projectId, selected);
      setSelected([]);
      if (result.task_id) {
        setPendingTaskId(result.task_id);
      } else {
        toast.success(result.message ?? 'Generation queued.');
        await loadGenerated();
      }
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Failed to generate reports.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin h-6 w-6" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <BarChart2 className="h-6 w-6" style={{ color: "var(--text-muted)" }} />
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Reports</h1>
      </div>

      {isPolling && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
          <Loader2 size={14} className="animate-spin text-emerald-400 flex-shrink-0" />
          <p className="text-sm text-emerald-400">Generating reports…</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {(["generated", "available"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px capitalize ${
              tab === t ? "border-emerald-500 text-emerald-400" : "border-transparent"
            }`}
            style={tab !== t ? { color: "var(--text-muted)" } : undefined}
          >
            {t === "generated" ? "Generated Reports" : "Available Reports"}
          </button>
        ))}
      </div>

      {/* Generated tab */}
      {tab === "generated" && (
        <div className="space-y-3">
          {generatedReports.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12" style={{ color: "var(--text-muted)" }}>
              <BarChart2 size={36} className="opacity-40" />
              <p className="text-sm">No generated reports yet. Go to Available Reports to generate some.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left" style={{ color: "var(--text-muted)" }}>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-widest">Report</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-widest">Type</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-widest">Status</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-widest">Created</th>
                    <th className="px-3 py-2 text-xs font-semibold uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                  {generatedReports.map((report) => (
                    <tr key={report.id} className="hover:bg-[var(--surface-hover)] transition-colors">
                      <td className="px-3 py-3" style={{ color: "var(--text-primary)" }}>
                        {report.display_name || report.name || `Report #${report.id}`}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${
                          report.report_type === "custom"
                            ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
                            : "bg-[var(--surface-raised)] text-[var(--text-muted)] border-[var(--border)]"
                        }`}>
                          {report.report_type}
                        </span>
                      </td>
                      <td className="px-3 py-3"><StatusBadge status={report.status} /></td>
                      <td className="px-3 py-3 text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(report.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-3 py-3">
                        <button
                          onClick={() => setViewData(report)}
                          className="text-xs px-2 py-1 rounded border transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
                          style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                        >
                          View Data
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Available tab */}
      {tab === "available" && (
        <div className="space-y-6">
          {/* System reports */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>System Reports</h2>
              <button
                onClick={handleGenerate}
                disabled={generating || selected.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
              >
                {generating ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Generate Selected ({selected.length})
              </button>
            </div>
            {systemReports.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No system reports available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {systemReports.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected.includes(r.name) ? "border-emerald-500/40 bg-emerald-500/5" : "hover:border-[var(--border-hover)]"
                    }`}
                    style={!selected.includes(r.name) ? { borderColor: "var(--border)", background: "var(--surface)" } : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(r.name)}
                      onChange={() => toggleSelect(r.name)}
                      className="accent-emerald-500"
                    />
                    <div className="flex items-center gap-1.5">
                      <CheckSquare size={13} style={{ color: selected.includes(r.name) ? "rgb(52,211,153)" : "var(--text-muted)" }} />
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{r.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Custom reports */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Custom Reports</h2>
              <button
                onClick={() => setCustomModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 border text-sm font-medium rounded-md transition-colors hover:border-emerald-500/50 hover:text-emerald-400"
                style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
              >
                <Plus size={13} /> Create Custom Report
              </button>
            </div>
            {customReports.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No custom reports yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {customReports.map((r) => (
                  <label
                    key={r.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                      selected.includes(r.name) ? "border-emerald-500/40 bg-emerald-500/5" : "hover:border-[var(--border-hover)]"
                    }`}
                    style={!selected.includes(r.name) ? { borderColor: "var(--border)", background: "var(--surface)" } : undefined}
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(r.name)}
                      onChange={() => toggleSelect(r.name)}
                      className="accent-emerald-500"
                    />
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs px-1 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">custom</span>
                      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>{r.name}</span>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {viewData && <DataModal report={viewData} onClose={() => setViewData(null)} />}
      {customModal && (
        <CustomReportModal
          projectId={projectId}
          systemReports={systemReports}
          onClose={() => setCustomModal(false)}
          onCreated={async () => {
            const d = await getAvailableReports(projectId);
            setSystemReports(d.system_reports ?? []);
            setCustomReports(d.custom_reports ?? []);
          }}
        />
      )}
    </div>
  );
}
