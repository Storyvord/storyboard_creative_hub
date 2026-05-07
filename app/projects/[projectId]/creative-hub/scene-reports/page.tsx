"use client";

// Scene Reports — per-scene research deck. Mirrors the project-level
// Research Deck (`reports/page.tsx`) but operates on a single scene at a
// time and renders the STO-1066 envelope shape via DeckRenderer.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useRestoreInflightTask } from "@/hooks/useRestoreInflightTask";
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
import { getBulkTaskStatus, getScenes, getScripts } from "@/services/creative-hub";
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
  SystemSceneReportType,
} from "@/types/scene-reports";

import { DeckRenderer } from "../../_research-deck/DeckRenderer";
import { PALETTE } from "../../_research-deck/classify";
import ScenePicker from "./_components/ScenePicker";
import GenerateSceneReportsModal, { GenerateSelection } from "./_components/GenerateSceneReportsModal";
import NewCustomSceneReportModal from "./_components/NewCustomSceneReportModal";
import LegacyReportView, { extractLegacyMarkdown, isLegacyEnvelope } from "./_components/LegacyReportView";

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
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = params.projectId as string;

  // URL-driven state — `?scene=<id>&report=<name>` lets a refresh land back
  // on the same scene + report. We seed local selection from the URL on
  // mount and keep them in sync with `router.replace` afterwards so the
  // back button doesn't pile up history entries.
  const urlSceneIdRaw = searchParams?.get("scene") ?? null;
  const urlReportName = searchParams?.get("report") ?? null;
  const urlSceneId = useMemo(() => {
    if (!urlSceneIdRaw) return null;
    const n = Number(urlSceneIdRaw);
    return Number.isFinite(n) && n > 0 ? n : null;
  }, [urlSceneIdRaw]);
  // Guard: only seed once per page-load.
  const seededSelectionRef = useRef(false);

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
  // Captured at handleGenerate start so the report grid can render one
  // skeleton card per pending report (with the actual report_name) while
  // the AI is working. Cleared by the polling effect as tasks settle.
  const [pendingReports, setPendingReports] = useState<GenerateSelection[]>([]);
  // Tracks in-flight Celery tasks (STO-1071 async generation). Each entry maps
  // a Celery task_id back to its (report_type, report_name) skeleton plus the
  // wall-clock time it was enqueued — used for the 15-min hard cap. Polled at
  // 5s while non-empty.
  const [pendingTasks, setPendingTasks] = useState<
    { task_id: string; report_type: "system" | "custom"; report_name: string; enqueued_at: number }[]
  >([]);
  const [showGenerate, setShowGenerate] = useState(false);
  const [showNewCustom, setShowNewCustom] = useState(false);

  // `generating` is purely derived from in-flight tasks now; no separate state.
  const generating = pendingTasks.length > 0;

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
        // Note: scene selection (from `?scene=`) happens once `scenes`
        // loads in the next effect — we can't validate the id until then.
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
        if (cancelled) return;
        const list = s ?? [];
        setScenes(list);
        // Mount-time seed from `?scene=…&report=…`. Falls back to the empty
        // selection state if the URL points at a scene that isn't part of
        // the active script (deleted, wrong project, hand-edited URL).
        if (!seededSelectionRef.current && urlSceneId !== null) {
          const match = list.find((sc) => sc.id === urlSceneId) ?? null;
          if (match) {
            setSelectedScene(match);
            // Tab seeding for `?report=` happens once reports load.
          }
          seededSelectionRef.current = true;
        } else if (!seededSelectionRef.current) {
          // No URL scene → mark seeded so we don't try to re-seed later.
          seededSelectionRef.current = true;
        }
      })
      .catch((e) => {
        console.error("[SceneReportsPage] getScenes failed:", e);
        if (!cancelled) toast.error("Failed to load scenes.");
      })
      .finally(() => {
        if (!cancelled) setScenesLoading(false);
      });
    // Reset scene selection when script changes (but only if we've already
    // gone past the initial URL-driven seed — otherwise we'd clobber the
    // seeded scene before the load finishes).
    if (seededSelectionRef.current) {
      setSelectedScene(null);
      setGeneratedReports([]);
      setActiveTab("overview");
    }
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── URL sync: scene selection ──────────────────────────────────────────────
  // Push `?scene=<id>` whenever the user picks a scene (and preserve the
  // existing `?report=` IF the URL still points at the same scene). When the
  // user clears the selection, drop both params. We use `router.replace` so
  // selecting a different report doesn't pile up history entries.
  useEffect(() => {
    if (!seededSelectionRef.current) return;
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    if (selectedScene?.id) {
      const prevScene = sp.get("scene");
      sp.set("scene", String(selectedScene.id));
      // Drop a stale `?report=` if scene changed underneath it.
      if (prevScene !== String(selectedScene.id)) sp.delete("report");
    } else {
      sp.delete("scene");
      sp.delete("report");
    }
    const next = sp.toString();
    const current = searchParams?.toString() ?? "";
    if (next !== current) {
      router.replace(next ? `?${next}` : "?", { scroll: false });
    }
    // searchParams is intentionally omitted — we only push when local state
    // changes; when the URL changes externally we don't loop back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedScene?.id]);

  // ── Seed `activeTab` from `?report=<name>` once reports have loaded ──────
  // The URL carries the report_name (human-readable, stable across tabs/devices).
  // Map it to the matching report id; gracefully fall back to "overview" if no
  // match (deleted, regenerated under a different name, etc.).
  const reportTabSeededRef = useRef(false);
  useEffect(() => {
    if (reportTabSeededRef.current) return;
    if (!selectedScene?.id) return;
    if (reportsLoading) return;
    if (!urlReportName) {
      reportTabSeededRef.current = true;
      return;
    }
    const match = generatedReports.find((r) => r.report_name === urlReportName);
    if (match) {
      setActiveTab(`report-${match.id}`);
    }
    reportTabSeededRef.current = true;
  }, [selectedScene?.id, reportsLoading, generatedReports, urlReportName]);

  // Reset the tab-seed guard when the user switches scenes so a future scene
  // can also honour `?report=` if present.
  useEffect(() => {
    reportTabSeededRef.current = false;
  }, [selectedScene?.id]);

  // ── URL sync: report tab selection ─────────────────────────────────────────
  // Push `?report=<name>` whenever the user clicks a generated-report tab.
  // Overview / unknown tabs drop the param.
  useEffect(() => {
    if (!seededSelectionRef.current) return;
    if (!selectedScene?.id) return;
    const sp = new URLSearchParams(searchParams?.toString() ?? "");
    if (activeTab.startsWith("report-")) {
      const id = Number(activeTab.slice("report-".length));
      const matched = generatedReports.find((r) => r.id === id);
      if (matched?.report_name) {
        sp.set("report", matched.report_name);
      } else {
        sp.delete("report");
      }
    } else {
      sp.delete("report");
    }
    const next = sp.toString();
    const current = searchParams?.toString() ?? "";
    if (next !== current) {
      router.replace(next ? `?${next}` : "?", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, generatedReports, selectedScene?.id]);

  // ── STO-1073: restore in-flight scene_report_generation on refresh ────────
  // Looks up the most recent TaskStatus for (scene, scene_report_generation)
  // and, if pending/processing/retrying, re-adds the row to `pendingTasks`
  // so the existing skeleton + 5s polling effect resumes. Only the most
  // recent task_id is restored — if the user kicked off several reports in
  // one bulk call the polling loop on the report list will surface the
  // remainder once they finish.
  useRestoreInflightTask({
    contentType: "scene",
    objectId: selectedScene?.id ?? null,
    taskType: "scene_report_generation",
    onInflight: (taskStatus) => {
      setPendingTasks((prev) => {
        if (prev.some((p) => p.task_id === taskStatus.task_id)) return prev;
        return [
          ...prev,
          {
            task_id: taskStatus.task_id,
            // We don't know whether this was system or custom from the
            // task row alone — default to "system" so the skeleton renders.
            // The polling refresh will replace the skeleton with the real
            // card as soon as the task settles.
            report_type: "system",
            report_name: "Restoring report…",
            enqueued_at: new Date(taskStatus.created_at).getTime(),
          },
        ];
      });
      setPendingReports((prev) => {
        const skeleton: GenerateSelection = {
          report_type: "system",
          report_name: "Restoring report…",
        };
        if (
          prev.some(
            (p) => p.report_type === skeleton.report_type && p.report_name === skeleton.report_name,
          )
        )
          return prev;
        return [...prev, skeleton];
      });
    },
  });

  // ── Generation handlers ────────────────────────────────────────────────────
  // STO-1071: backend now returns 202 + task_ids immediately; we enqueue the
  // skeletons + tasks and let the polling effect drive the UI to settled state.
  const handleGenerate = async (selected: GenerateSelection[]) => {
    if (!selectedScene?.id) return;
    if (selected.length === 0) {
      toast.error("Select at least one report.");
      return;
    }
    setPendingReports(selected);
    setShowGenerate(false);
    try {
      const result =
        selected.length === 1
          ? await generateSceneReport(selectedScene.id, {
              report_type: selected[0].report_type,
              report_name: selected[0].report_name,
              force_regenerate: true,
            })
          : await bulkGenerateSceneReports(selectedScene.id, {
              reports: selected,
              force_regenerate: true,
            });

      // Map task_ids → skeletons by index (response order is preserved).
      const enqueuedAt = Date.now();
      const newTasks = result.task_ids.map((task_id, i) => {
        const r = result.reports[i] ?? selected[i];
        return {
          task_id,
          report_type: (r?.report_type ?? "system") as "system" | "custom",
          report_name: r?.report_name ?? "",
          enqueued_at: enqueuedAt,
        };
      });
      if (newTasks.length === 0) {
        // No tasks came back (shouldn't happen) — clear skeletons & bail.
        setPendingReports([]);
        toast.error("Generation request did not return any tasks.");
        return;
      }
      setPendingTasks((prev) => [...prev, ...newTasks]);
      toast.info(
        `Queued ${newTasks.length} report${newTasks.length === 1 ? "" : "s"} — generating in background…`,
      );
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; error?: string; errors?: unknown } } };
      const msg =
        err?.response?.data?.detail ??
        err?.response?.data?.error ??
        (err?.response?.data?.errors ? "Some reports failed to generate." : "Failed to generate reports.");
      toast.error(msg);
      setPendingReports([]);
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
      const skeleton: GenerateSelection = {
        report_type: report.report_type,
        report_name: reportName,
      };
      setPendingReports((prev) => [...prev, skeleton]);
      try {
        const result = await generateSceneReport(selectedScene.id, {
          report_type: report.report_type,
          report_name: reportName,
          force_regenerate: true,
        });
        const enqueuedAt = Date.now();
        const newTasks = result.task_ids.map((task_id, i) => {
          const r = result.reports[i] ?? skeleton;
          return {
            task_id,
            report_type: (r?.report_type ?? "system") as "system" | "custom",
            report_name: r?.report_name ?? reportName,
            enqueued_at: enqueuedAt,
          };
        });
        if (newTasks.length === 0) {
          setPendingReports((prev) =>
            prev.filter(
              (p) => !(p.report_name === skeleton.report_name && p.report_type === skeleton.report_type),
            ),
          );
          toast.error("Regeneration request did not return any tasks.");
          return;
        }
        setPendingTasks((prev) => [...prev, ...newTasks]);
        toast.info("Queued regeneration — running in background…");
      } catch (e) {
        console.error(e);
        toast.error("Regeneration failed.");
        setPendingReports((prev) =>
          prev.filter(
            (p) => !(p.report_name === skeleton.report_name && p.report_type === skeleton.report_type),
          ),
        );
      }
    },
    [selectedScene],
  );

  // ── Polling for in-flight Celery tasks (STO-1071) ──────────────────────────
  // Polls /bulk_taskstatus/ every 5s while there are unsettled tasks. On each
  // settled task we refetch the report list and drop the matching skeleton +
  // task entry. Tasks running >15min are abandoned with a toast (the row
  // exists server-side; the user can refresh later). We stop polling on
  // unmount and when `selectedScene.id` changes (so navigating away doesn't
  // keep the timer alive against a stale scene).
  useEffect(() => {
    if (pendingTasks.length === 0) return;
    if (!selectedScene?.id) return;

    const sceneId = selectedScene.id;
    const HARD_CAP_MS = 15 * 60 * 1000;
    const SETTLED = new Set(["completed", "success", "failed", "failure"]);
    let cancelled = false;

    const tick = async () => {
      // Snapshot current pending tasks; abandon anything past the 15-min cap.
      const now = Date.now();
      const stale = pendingTasks.filter((p) => now - p.enqueued_at > HARD_CAP_MS);
      if (stale.length > 0) {
        for (const s of stale) {
          toast.error(
            `${s.report_name || "Report"} — generation taking longer than expected; check back later.`,
          );
        }
        if (!cancelled) {
          setPendingTasks((prev) => prev.filter((p) => !stale.some((s) => s.task_id === p.task_id)));
          setPendingReports((prev) =>
            prev.filter(
              (pr) =>
                !stale.some((s) => s.report_name === pr.report_name && s.report_type === pr.report_type),
            ),
          );
        }
      }

      const liveTasks = pendingTasks.filter((p) => now - p.enqueued_at <= HARD_CAP_MS);
      if (liveTasks.length === 0) return;

      let data: { tasks?: { task_id: string; status: string; error?: string }[] };
      try {
        data = await getBulkTaskStatus(liveTasks.map((t) => t.task_id));
      } catch (err) {
        console.error("[scene-reports] bulk task status poll failed:", err);
        return;
      }
      if (cancelled) return;

      const tasks = Array.isArray(data?.tasks) ? data.tasks : [];
      const settled = tasks.filter((t) => SETTLED.has((t.status ?? "").toLowerCase()));
      if (settled.length === 0) return;

      const successes = settled.filter((t) => ["completed", "success"].includes((t.status ?? "").toLowerCase()));
      const failures = settled.filter((t) => ["failed", "failure"].includes((t.status ?? "").toLowerCase()));

      // Refetch report list — the new cards will appear and the matching
      // skeleton will drop in the same render via the setPendingReports below.
      try {
        await refreshSceneReports(sceneId);
      } catch (err) {
        console.error("[scene-reports] refresh after settle failed:", err);
      }
      if (cancelled) return;

      // Toast failures (success is visible as the new card).
      for (const f of failures) {
        const matched = liveTasks.find((p) => p.task_id === f.task_id);
        toast.error(`${matched?.report_name ?? "Report"} failed${f.error ? `: ${f.error}` : ""}`);
      }

      const settledIds = new Set(settled.map((s) => s.task_id));
      const settledKeys = new Set(
        liveTasks
          .filter((p) => settledIds.has(p.task_id))
          .map((p) => `${p.report_type}::${p.report_name}`),
      );
      setPendingTasks((prev) => prev.filter((p) => !settledIds.has(p.task_id)));
      setPendingReports((prev) =>
        prev.filter((pr) => !settledKeys.has(`${pr.report_type}::${pr.report_name}`)),
      );

      // If this drained the queue and we had at least one success, celebrate.
      if (settled.length === liveTasks.length && successes.length > 0) {
        toast.success(
          successes.length === 1 ? "Scene report generated." : "All scene reports generated.",
        );
      }
    };

    tick();
    const id = window.setInterval(tick, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [pendingTasks, selectedScene?.id, refreshSceneReports]);

  // If the user navigates to a different scene while tasks are in flight,
  // drop the skeletons + task entries so the new scene doesn't show stale
  // pending UI. The tasks themselves will still complete server-side.
  useEffect(() => {
    setPendingReports([]);
    setPendingTasks([]);
  }, [selectedScene?.id]);

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
          <div style={{ maxWidth: 1100, marginInline: "auto", marginTop: 8, marginBottom: 0 }}>
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
                ) : generatedReports.length === 0 && pendingReports.length === 0 ? (
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
                    {/* One skeleton per in-flight report, labelled with the
                         requested report_name so the user knows what's
                         cooking. Sits alongside existing report cards if any. */}
                    {pendingReports.map((p, i) => (
                      <div
                        key={`pending-${p.report_name}-${i}`}
                        aria-busy="true"
                        aria-label={`Generating ${p.report_name}`}
                        className="animate-pulse"
                        style={{
                          padding: 16,
                          borderRadius: 12,
                          border: "1px dashed var(--border)",
                          background: "var(--surface)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background:
                              "linear-gradient(120deg, transparent 0%, rgba(34,197,94,0.06) 50%, transparent 100%)",
                          }}
                        />
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, position: "relative" }}>
                          <Loader2 size={12} className="animate-spin" style={{ color: "#22c55e" }} />
                          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#22c55e" }}>
                            Generating
                          </span>
                        </div>
                        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10, position: "relative" }}>
                          {p.report_name}
                        </p>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, position: "relative" }}>
                          <div style={{ height: 8, borderRadius: 4, background: "var(--surface-hover)", width: "92%" }} />
                          <div style={{ height: 8, borderRadius: 4, background: "var(--surface-hover)", width: "76%" }} />
                          <div style={{ height: 8, borderRadius: 4, background: "var(--surface-hover)", width: "84%" }} />
                        </div>
                      </div>
                    ))}
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

