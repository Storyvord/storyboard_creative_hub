"use client";

// Scene Reports — per-scene research deck. Mirrors the project-level
// Research Deck (`reports/page.tsx`) but operates on a single scene at a
// time and renders the STO-1066 envelope shape via DeckRenderer.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  BookOpen,
  BarChart2,
  Sparkles,
  Loader2,
  RefreshCw,
  Plus,
  ChevronLeft,
} from "lucide-react";
import { toast } from "react-toastify";

import { Scene, Script } from "@/types/creative-hub";
import { getScenes, getScripts } from "@/services/creative-hub";
import {
  bulkGenerateSceneReports,
  generateSceneReport,
  getCustomSceneReportTypes,
  getSceneAvailableReportTypes,
  getSceneGeneratedReports,
  getSystemSceneReportTypes,
} from "@/services/scene-reports";
import {
  CustomSceneReportType,
  SceneGeneratedReport,
  SceneReportEnvelope,
  SystemSceneReportType,
} from "@/types/scene-reports";

import { DeckRenderer } from "../_research-deck/DeckRenderer";
import { PALETTE } from "../_research-deck/classify";
import ScenePicker from "./_components/ScenePicker";
import GenerateSceneReportsModal, { GenerateSelection } from "./_components/GenerateSceneReportsModal";
import NewCustomSceneReportModal from "./_components/NewCustomSceneReportModal";

// ── Legacy fallback detector ─────────────────────────────────────────────────
function isLegacyEnvelope(env: SceneReportEnvelope | null | undefined): boolean {
  if (!env) return false;
  if (env.tab_type === "legacy_markdown") return true;
  if (typeof env.legacy_markdown === "string" && env.legacy_markdown.trim().length > 0) return true;
  const firstSection = env.sections?.[0];
  const firstProse = firstSection?.data?.prose as Record<string, unknown> | undefined;
  if (firstProse && typeof firstProse.markdown === "string" && (firstProse.markdown as string).trim().length > 0) {
    return env.tab_type === "legacy_markdown";
  }
  return false;
}

function extractLegacyMarkdown(env: SceneReportEnvelope | null | undefined): string {
  if (!env) return "";
  if (typeof env.legacy_markdown === "string" && env.legacy_markdown.trim().length > 0) return env.legacy_markdown;
  const firstSection = env.sections?.[0];
  const prose = firstSection?.data?.prose as Record<string, unknown> | undefined;
  if (prose && typeof prose.markdown === "string") return prose.markdown as string;
  return "";
}

// ── Generated-report renderer ────────────────────────────────────────────────
function SceneReportDocument({
  report,
  onRegenerate,
  regenerating,
}: {
  report: SceneGeneratedReport;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  const data = report.data;

  if (!data || (report.status && report.status.toLowerCase() !== "success")) {
    return (
      <div style={{ textAlign: "center", padding: "64px 0", borderRadius: 12, border: "2px dashed var(--border)" }}>
        {["pending", "processing"].includes((report.status ?? "").toLowerCase()) ? (
          <>
            <Loader2 size={24} className="animate-spin" style={{ margin: "0 auto 10px", color: "var(--text-muted)" }} />
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Generating report…</p>
          </>
        ) : (report.status ?? "").toLowerCase() === "failed" ? (
          <>
            <BarChart2 size={24} style={{ margin: "0 auto 10px", opacity: 0.2, color: "var(--text-muted)" }} />
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Generation failed. Try regenerating.</p>
          </>
        ) : (
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>No data available.</p>
        )}
      </div>
    );
  }

  // Legacy fallback handled by parent (LegacyReportView).
  // Build the deck inputs from the envelope.
  const summary = typeof data.executive_summary === "string" ? data.executive_summary : null;
  const structured =
    data.structured_data && typeof data.structured_data === "object" && !Array.isArray(data.structured_data)
      ? (data.structured_data as Record<string, unknown>)
      : // If structured_data is missing, fall back to top-level non-housekeeping keys
        (data as Record<string, unknown>);
  const envelopeSections = Array.isArray(data.sections) ? data.sections : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <DeckRenderer data={structured} envelopeSections={envelopeSections} executiveSummary={summary} />
      {Array.isArray(data.citations) && data.citations.length > 0 && (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface)",
          }}
        >
          <p
            style={{
              fontSize: 10,
              color: "var(--text-muted)",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: 8,
            }}
          >
            Citations
          </p>
          <ul style={{ margin: 0, paddingLeft: 18, display: "flex", flexDirection: "column", gap: 4 }}>
            {data.citations.map((c, i) => (
              <li key={i} style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                {c.source ?? c.url ?? c.title ?? c.ref_id ?? "—"}
                {c.accessed ? ` (${c.accessed})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* Hide regenerate button visually; it's wired through the top bar. */}
      <button onClick={onRegenerate} disabled={regenerating} style={{ display: "none" }} aria-hidden />
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function SceneReportsPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedScene, setSelectedScene] = useState<Scene | null>(null);
  const [scenesLoading, setScenesLoading] = useState(false);

  const [systemTypes, setSystemTypes] = useState<SystemSceneReportType[]>([]);
  const [customTypes, setCustomTypes] = useState<CustomSceneReportType[]>([]);

  const [generatedReports, setGeneratedReports] = useState<SceneGeneratedReport[]>([]);
  const [activeTab, setActiveTab] = useState<string>("overview");

  const [bootLoading, setBootLoading] = useState(true);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showNewCustom, setShowNewCustom] = useState(false);

  // ── Initial: scripts + report types (project-scoped) ────────────────────────
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const [scriptList, sysTypes, custTypes] = await Promise.all([
          getScripts(projectId),
          getSystemSceneReportTypes().catch(() => [] as SystemSceneReportType[]),
          getCustomSceneReportTypes(projectId).catch(() => [] as CustomSceneReportType[]),
        ]);
        if (cancelled) return;
        setScripts(scriptList);
        setSystemTypes(sysTypes);
        setCustomTypes(custTypes);
        if (scriptList.length > 0) setSelectedScript(scriptList[0]);
      } catch (e) {
        console.error("[SceneReportsPage] initial load failed:", e);
        if (!cancelled) toast.error("Failed to load scripts.");
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // ── Scenes for the selected script ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedScript) {
      setScenes([]);
      return;
    }
    let cancelled = false;
    setScenesLoading(true);
    getScenes(selectedScript.id)
      .then((s) => {
        if (!cancelled) setScenes(s ?? []);
      })
      .catch((e) => {
        console.error("[SceneReportsPage] getScenes failed:", e);
        if (!cancelled) toast.error("Failed to load scenes.");
      })
      .finally(() => {
        if (!cancelled) setScenesLoading(false);
      });
    // Reset scene selection when script changes
    setSelectedScene(null);
    setGeneratedReports([]);
    setActiveTab("overview");
    return () => {
      cancelled = true;
    };
  }, [selectedScript]);

  // ── Generated reports + per-scene available types ──────────────────────────
  const refreshSceneReports = useCallback(
    async (sceneId: number) => {
      setReportsLoading(true);
      try {
        const [list, available] = await Promise.all([
          getSceneGeneratedReports(sceneId),
          getSceneAvailableReportTypes(sceneId).catch(() => null),
        ]);
        setGeneratedReports(list.reports ?? []);
        if (available?.available_reports) {
          // Per-scene narrowing: backend may filter inactive types or scope custom by project.
          if (Array.isArray(available.available_reports.system)) setSystemTypes(available.available_reports.system);
          if (Array.isArray(available.available_reports.custom)) setCustomTypes(available.available_reports.custom);
        }
      } catch (e) {
        console.error("[SceneReportsPage] refreshSceneReports failed:", e);
        toast.error("Failed to load scene reports.");
      } finally {
        setReportsLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    if (selectedScene?.id) {
      refreshSceneReports(selectedScene.id);
    } else {
      setGeneratedReports([]);
    }
  }, [selectedScene, refreshSceneReports]);

  // ── Generation handlers ────────────────────────────────────────────────────
  const handleGenerate = async (selected: GenerateSelection[]) => {
    if (!selectedScene?.id) return;
    if (selected.length === 0) {
      toast.error("Select at least one report.");
      return;
    }
    setGenerating(true);
    setShowGenerate(false);
    try {
      if (selected.length === 1) {
        const result = await generateSceneReport(selectedScene.id, {
          report_type: selected[0].report_type,
          report_name: selected[0].report_name,
          force_regenerate: true,
        });
        toast.success(result.message ?? "Scene report generated.");
        await refreshSceneReports(selectedScene.id);
        if (result.report?.id) setActiveTab(`report-${result.report.id}`);
      } else {
        await bulkGenerateSceneReports(selectedScene.id, {
          reports: selected,
          force_regenerate: true,
        });
        toast.success("Scene reports generated.");
        await refreshSceneReports(selectedScene.id);
      }
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; error?: string; errors?: unknown } } };
      const msg =
        err?.response?.data?.detail ??
        err?.response?.data?.error ??
        (err?.response?.data?.errors ? "Some reports failed to generate." : "Failed to generate reports.");
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const regenerateOne = useCallback(
    async (report: SceneGeneratedReport) => {
      if (!selectedScene?.id) return;
      const reportName = report.report_name ?? null;
      if (!reportName) {
        toast.error("Cannot regenerate — report name missing.");
        return;
      }
      setGenerating(true);
      try {
        await generateSceneReport(selectedScene.id, {
          report_type: report.report_type,
          report_name: reportName,
          force_regenerate: true,
        });
        toast.success("Report regenerated.");
        await refreshSceneReports(selectedScene.id);
      } catch (e) {
        console.error(e);
        toast.error("Regeneration failed.");
      } finally {
        setGenerating(false);
      }
    },
    [selectedScene, refreshSceneReports],
  );

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const systemGenerated = generatedReports.filter((r) => r.report_type !== "custom");
  const customGenerated = generatedReports.filter((r) => r.report_type === "custom");
  const activeReport = generatedReports.find((r) => `report-${r.id}` === activeTab);

  const tabs = useMemo(
    () => [
      { id: "overview", label: "Overview", icon: <BookOpen size={13} />, type: "overview" as const },
      ...systemGenerated.map((r) => ({
        id: `report-${r.id}`,
        label: r.report_name || `Report #${r.id}`,
        icon: <BarChart2 size={13} />,
        type: "system" as const,
      })),
      ...customGenerated.map((r) => ({
        id: `report-${r.id}`,
        label: r.report_name || `Report #${r.id}`,
        icon: <Sparkles size={13} />,
        type: "custom" as const,
      })),
    ],
    [systemGenerated, customGenerated],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  if (bootLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin h-6 w-6" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div style={{ padding: "32px" }}>
        <div
          style={{
            padding: "48px 24px",
            textAlign: "center",
            borderRadius: 12,
            border: "1px dashed var(--border)",
            background: "var(--surface)",
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
            No script uploaded
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
            Upload a script in Creative Hub to generate per-scene reports.
          </p>
        </div>
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
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(34,197,94,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookOpen size={18} color="#22c55e" />
          </div>
          <div>
            <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
              Scene Reports
            </h1>
            <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
              {selectedScene
                ? `Scene ${selectedScene.order} · ${selectedScene.scene_name || "Untitled"} · ${
                    generatedReports.length
                  } report${generatedReports.length === 1 ? "" : "s"}`
                : "Pick a scene to view its research deck"}
            </p>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {selectedScene && (
            <>
              <button
                onClick={() => setShowNewCustom(true)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface-raised)",
                  fontSize: 13,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                <Plus size={14} /> Custom
              </button>
              <button
                onClick={() => setShowGenerate(true)}
                disabled={generating}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 16px",
                  borderRadius: 8,
                  border: "none",
                  background: "linear-gradient(135deg,#22c55e,#16a34a)",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#fff",
                  cursor: generating ? "wait" : "pointer",
                  boxShadow: "0 4px 14px rgba(34,197,94,0.3)",
                  transition: "all 0.15s",
                  opacity: generating ? 0.7 : 1,
                }}
              >
                {generating ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                Generate
              </button>
            </>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px 32px" }}>
        {!selectedScene ? (
          <div style={{ maxWidth: 1100, margin: "0 auto", marginTop: 8 }}>
            <ScenePicker
              scripts={scripts}
              selectedScript={selectedScript}
              onScriptChange={setSelectedScript}
              scenes={scenes}
              selectedSceneId={null}
              onSceneSelect={setSelectedScene}
              loading={scenesLoading}
            />
          </div>
        ) : (
          <div style={{ maxWidth: 1280, margin: "0 auto" }}>
            {/* Back / change scene */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
              <button
                onClick={() => {
                  setSelectedScene(null);
                  setActiveTab("overview");
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  background: "var(--surface-raised)",
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                <ChevronLeft size={13} /> Change scene
              </button>
            </div>

            {/* Tab bar */}
            <div
              style={{
                borderBottom: "1px solid var(--border)",
                marginBottom: 16,
                overflowX: "auto",
              }}
            >
              <div style={{ display: "flex", gap: 2, minWidth: "max-content" }}>
                {tabs.map((tab) => {
                  const active = activeTab === tab.id;
                  const isCustomTab = tab.type === "custom";
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
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
              </div>
            </div>

            {/* Tab content */}
            {activeTab === "overview" && (
              <div>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(3,1fr)",
                    gap: 16,
                    marginBottom: 20,
                  }}
                >
                  {[
                    { label: "System Reports", value: systemGenerated.length, icon: <BarChart2 size={18} />, color: "#22c55e" },
                    { label: "Custom Reports", value: customGenerated.length, icon: <Sparkles size={18} />, color: "#3b82f6" },
                    {
                      label: "Available to Generate",
                      value: systemTypes.length + customTypes.length,
                      icon: <RefreshCw size={18} />,
                      color: "#f97316",
                    },
                  ].map((card) => (
                    <div
                      key={card.label}
                      style={{
                        padding: "16px 20px",
                        borderRadius: 12,
                        border: "1px solid var(--border)",
                        background: "var(--surface)",
                        display: "flex",
                        alignItems: "center",
                        gap: 14,
                      }}
                    >
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 10,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: `${card.color}18`,
                          color: card.color,
                          flexShrink: 0,
                        }}
                      >
                        {card.icon}
                      </div>
                      <div>
                        <p style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1 }}>
                          {card.value}
                        </p>
                        <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{card.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {reportsLoading ? (
                  <div
                    style={{
                      padding: "48px 0",
                      textAlign: "center",
                      borderRadius: 12,
                      border: "2px dashed var(--border)",
                    }}
                  >
                    <Loader2
                      size={20}
                      className="animate-spin"
                      style={{ margin: "0 auto 10px", color: "var(--text-muted)" }}
                    />
                    <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Loading reports…</p>
                  </div>
                ) : generatedReports.length === 0 ? (
                  <div
                    style={{
                      padding: "48px 0",
                      textAlign: "center",
                      borderRadius: 16,
                      border: "2px dashed var(--border)",
                    }}
                  >
                    <BookOpen size={36} style={{ margin: "0 auto 14px", opacity: 0.2, color: "var(--text-muted)" }} />
                    <p style={{ fontSize: 15, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                      No reports for this scene
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 18 }}>
                      Generate one or more research reports to see scene-specific insights here.
                    </p>
                    <button
                      onClick={() => setShowGenerate(true)}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "10px 20px",
                        borderRadius: 8,
                        background: "linear-gradient(135deg,#22c55e,#16a34a)",
                        color: "#fff",
                        fontSize: 13,
                        fontWeight: 600,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      <RefreshCw size={14} /> Generate Reports
                    </button>
                  </div>
                ) : (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {generatedReports.map((r, i) => {
                      const isCustom = r.report_type === "custom";
                      const color = isCustom ? "#3b82f6" : PALETTE[i % PALETTE.length];
                      return (
                        <button
                          key={r.id}
                          onClick={() => setActiveTab(`report-${r.id}`)}
                          style={{
                            textAlign: "left",
                            padding: "16px",
                            borderRadius: 12,
                            border: "1px solid var(--border)",
                            background: "var(--surface)",
                            cursor: "pointer",
                            transition: "all 0.15s",
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
                              background: color,
                              borderRadius: "12px 12px 0 0",
                            }}
                          />
                          <div
                            style={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              gap: 8,
                              marginBottom: 8,
                            }}
                          >
                            <div
                              style={{
                                width: 32,
                                height: 32,
                                borderRadius: 8,
                                background: `${color}18`,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                color,
                                flexShrink: 0,
                              }}
                            >
                              {isCustom ? <Sparkles size={14} /> : <BarChart2 size={14} />}
                            </div>
                            <span
                              style={{
                                fontSize: 10,
                                padding: "2px 7px",
                                borderRadius: 20,
                                border: `1px solid ${color}30`,
                                color,
                                background: `${color}10`,
                                whiteSpace: "nowrap",
                              }}
                            >
                              {isCustom ? "custom" : "system"}
                            </span>
                          </div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 4 }}>
                            {r.report_name || `Report #${r.id}`}
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

            {activeReport && (
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                  {activeReport.report_type === "custom" ? (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 20,
                        border: "1px solid rgba(59,130,246,0.3)",
                        color: "#3b82f6",
                        background: "rgba(59,130,246,0.1)",
                      }}
                    >
                      custom
                    </span>
                  ) : (
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 20,
                        border: "1px solid rgba(34,197,94,0.3)",
                        color: "#22c55e",
                        background: "rgba(34,197,94,0.1)",
                      }}
                    >
                      system
                    </span>
                  )}
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {new Date(activeReport.created_at).toLocaleDateString()}
                  </span>
                </div>
                {isLegacyEnvelope(activeReport.data) ? (
                  <LegacyReportView
                    markdown={extractLegacyMarkdown(activeReport.data)}
                    onRegenerate={() => regenerateOne(activeReport)}
                    regenerating={generating}
                  />
                ) : (
                  <SceneReportDocument
                    report={activeReport}
                    onRegenerate={() => regenerateOne(activeReport)}
                    regenerating={generating}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {showGenerate && selectedScene && (
        <GenerateSceneReportsModal
          systemReports={systemTypes}
          customReports={customTypes}
          onGenerate={handleGenerate}
          generating={generating}
          onClose={() => setShowGenerate(false)}
        />
      )}
      {showNewCustom && (
        <NewCustomSceneReportModal
          projectId={projectId}
          onClose={() => setShowNewCustom(false)}
          onCreated={async () => {
            try {
              const types = await getCustomSceneReportTypes(projectId);
              setCustomTypes(types);
            } catch {
              /* swallow — the modal already toasted on save */
            }
          }}
        />
      )}
    </div>
  );
}

// ── Legacy report view (placeholder; full impl in dedicated commit) ────────
function LegacyReportView({
  markdown,
  onRegenerate,
  regenerating,
}: {
  markdown: string;
  onRegenerate: () => void;
  regenerating: boolean;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 14px",
          borderRadius: 10,
          border: "1px solid rgba(234,179,8,0.4)",
          background: "rgba(234,179,8,0.1)",
        }}
      >
        <p style={{ margin: 0, fontSize: 12, color: "#854d0e" }}>
          Legacy report — regenerate for the new deck layout.
        </p>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          style={{
            padding: "6px 12px",
            borderRadius: 6,
            border: "1px solid rgba(234,179,8,0.5)",
            background: "rgba(234,179,8,0.2)",
            color: "#854d0e",
            fontSize: 12,
            fontWeight: 600,
            cursor: regenerating ? "wait" : "pointer",
            opacity: regenerating ? 0.6 : 1,
          }}
        >
          {regenerating ? "Regenerating…" : "Regenerate"}
        </button>
      </div>
      <pre
        style={{
          margin: 0,
          padding: 16,
          borderRadius: 10,
          border: "1px solid var(--border)",
          background: "var(--surface)",
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--text-secondary)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
        }}
      >
        {markdown || "No legacy markdown content."}
      </pre>
    </div>
  );
}
