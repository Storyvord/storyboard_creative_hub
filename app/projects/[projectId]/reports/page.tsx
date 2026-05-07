"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  Loader2, BookOpen, RefreshCw, Plus, BarChart2,
  Sparkles,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getGeneratedReports, getAvailableReports, generateReports, createCustomReport,
} from "@/services/project";
import { ProjectReport, AvailableReport } from "@/types/project";
import { useTaskPoller } from "@/hooks/useTaskPoller";
import { DeckRenderer } from "../_research-deck/DeckRenderer";
import { PALETTE } from "../_research-deck/classify";

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

  // Project reports return their structured payload directly in `data`. Pass it
  // through the shared deck renderer (no envelope sections for the project deck).
  return <DeckRenderer data={data && typeof data === "object" && !Array.isArray(data) ? (data as Record<string, unknown>) : { items: data }} />;
}


// ── GeneratePanel modal ───────────────────────────────────────────────────────
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
  const all = [...systemReports, ...customReports];

  const toggle = (name: string) =>
    setSelected((s) => s.includes(name) ? s.filter((x) => x !== name) : [...s, name]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.6)" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 480, maxWidth: "calc(100vw - 32px)", maxHeight: "80vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Generate Reports</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20 }}>×</button>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>Select report types to generate for this project.</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
          {all.map((r) => (
            <label key={r.id} style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", padding: "8px 12px", borderRadius: 8, border: `1px solid ${selected.includes(r.name) ? "var(--accent)" : "var(--border)"}`, background: selected.includes(r.name) ? "var(--accent-subtle)" : "var(--surface-raised)" }}>
              <input type="checkbox" checked={selected.includes(r.name)} onChange={() => toggle(r.name)} style={{ accentColor: "var(--accent)" }} />
              <span style={{ fontSize: 13 }}>{r.name}</span>
            </label>
          ))}
          {all.length === 0 && <p style={{ color: "var(--text-muted)", fontSize: 13 }}>No report types available.</p>}
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "none", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button
            onClick={() => onGenerate(selected)}
            disabled={generating || isPolling || selected.length === 0}
            style={{ padding: "8px 18px", borderRadius: 8, background: "var(--accent)", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, opacity: (generating || isPolling || selected.length === 0) ? 0.6 : 1 }}
          >
            {generating || isPolling ? "Generating…" : `Generate ${selected.length > 0 ? `(${selected.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── NewCustomModal ────────────────────────────────────────────────────────────
function NewCustomModal({
  projectId, onClose, onCreated,
}: {
  projectId: string;
  systemReports: AvailableReport[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [prompt, setPrompt] = useState("");
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error("Report name is required."); return; }
    setSaving(true);
    try {
      await createCustomReport({ project_id: projectId, name: name.trim(), prompt_template: prompt.trim() || undefined });
      toast.success("Custom report created.");
      onCreated();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail ?? "Failed to create report.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 200, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,.6)" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: 28, width: 440, maxWidth: "calc(100vw - 32px)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>New Custom Report</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20 }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 20 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-muted)" }}>Report Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Crew Budget Summary"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-raised)", fontSize: 13, boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6, color: "var(--text-muted)" }}>Custom Prompt (optional)</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} placeholder="Describe what this report should contain…"
              style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface-raised)", fontSize: 13, resize: "vertical", boxSizing: "border-box" }} />
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button onClick={onClose} style={{ padding: "8px 18px", borderRadius: 8, border: "1px solid var(--border)", background: "none", cursor: "pointer", fontSize: 13 }}>Cancel</button>
          <button onClick={handleCreate} disabled={saving}
            style={{ padding: "8px 18px", borderRadius: 8, background: "var(--accent)", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13, opacity: saving ? 0.6 : 1 }}>
            {saving ? "Creating…" : "Create Report"}
          </button>
        </div>
      </div>
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
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string } } };
      toast.error(err?.response?.data?.detail ?? "Failed to generate reports.");
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
            const isCustomTab = (tab as { type?: string }).type === "custom";
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
