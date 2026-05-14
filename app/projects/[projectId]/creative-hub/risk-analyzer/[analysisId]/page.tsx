"use client";

// Risk Analyzer dashboard — Overview / Scenes / Hazards / Compliance tabs
// over a single analysis. Producer-oriented redesign (May 2026):
//   - "Graph" tab replaced with "Hazards" (bar chart + heatmap, no node graph).
//   - "Scenes" tab promoted from a drill-down to a top-level surface so
//     producers can sort/filter without scrolling through the entire script.
//   - Cancelled-with-findings state now offers a "Finalize partial" CTA.
//   - Empty-state UX: when `summary_stats.is_empty` we render an explicit
//     "No findings yet" panel rather than the old all-zero charts + every
//     scene at max_score.
//   - Compliance tab explains *why* it's empty per status; no more silent
//     blank tab when an analysis is mid-pipeline.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  BarChart2,
  ChevronLeft,
  Film,
  GitBranch,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";

import {
  approveFinding,
  cancelAnalysis,
  createFinding,
  createMitigationForFinding,
  deleteFinding,
  finalize,
  getInsurancePdfUrl,
  getProducerPdfUrl,
  patchFinding,
  patchMitigation,
  restoreFinding,
  resume,
  revertFinding,
  revertMitigation,
  uploadEvidence,
} from "@/services/risk-analyzer";
import {
  RiskAnalysisListItem,
  RiskApiError,
  RiskFinding,
  Severity,
  normaliseStatus,
} from "@/types/risk-analyzer";
import { listAnalyses } from "@/services/risk-analyzer";
import { useRiskAnalysisPolling } from "@/hooks/useRiskAnalysisPolling";
import { invalidateScriptRiskCache } from "@/hooks/useScriptRiskByScene";

import StatusBanner from "../_components/StatusBanner";
import StalledBanner from "../_components/StalledBanner";
import CancelDialog from "../_components/CancelDialog";
import CancelledStateBanner from "../_components/CancelledStateBanner";
import ScoreGauge from "../_components/ScoreGauge";
import CumulativeExposureChart from "../_components/CumulativeExposureChart";
import SeverityDistributionDonut from "../_components/SeverityDistributionDonut";
import KpiStrip from "../_components/KpiStrip";
import TopRiskScenes from "../_components/TopRiskScenes";
import TopHazards from "../_components/TopHazards";
import ScenesTable from "../_components/ScenesTable";
import HazardsView from "../_components/HazardsView";
import RiskGraph from "../_components/RiskGraph";
import ReportsTab from "../_components/ReportsTab";
import EditTransparencyTable from "../_components/EditTransparencyTable";
import FindingEditModal from "../_components/FindingEditModal";
import FinalizeDialog from "../_components/FinalizeDialog";

// Reports replaces Compliance (now hosts both insurance + producer sub-views);
// Graph is the new bipartite category↔scene visualisation. Hazards (bar +
// heatmap) is kept — it answers the orthogonal "which acts are heavy?"
// question that the graph deliberately avoids.
type TabKey =
  | "overview"
  | "scenes"
  | "hazards"
  | "graph"
  | "compliance";

interface ModalState {
  open: boolean;
  mode: "create" | "edit";
  /** When mode === "create", this is the scene id we're creating against. */
  sceneId: number | null;
  finding: RiskFinding | null;
}

export default function RiskAnalyzerDashboardPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const analysisId = Number(params.analysisId);

  const [scriptId, setScriptId] = useState<number | null>(null);
  const [resolvingScript, setResolvingScript] = useState(true);
  const [tab, setTab] = useState<TabKey>("overview");
  const [scenesFilterCategory, setScenesFilterCategory] = useState<
    string | null
  >(null);
  const [scenesExpandedSceneId, setScenesExpandedSceneId] = useState<
    number | null
  >(null);
  const [showEditHistory, setShowEditHistory] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [modal, setModal] = useState<ModalState>({
    open: false,
    mode: "edit",
    sceneId: null,
    finding: null,
  });
  const [submittingModal, setSubmittingModal] = useState(false);

  // Resolve script id by querying every script's analysis list. Backend
  // doesn't expose a "find script for analysis" shortcut, so we walk
  // candidates. The number of scripts per project is small (typically 1-3).
  useEffect(() => {
    let cancelled = false;
    setResolvingScript(true);
    (async () => {
      try {
        const { getScripts } = await import("@/services/creative-hub");
        const scripts = await getScripts(projectId);
        for (const s of scripts) {
          const items: RiskAnalysisListItem[] = await listAnalyses(s.id).catch(
            () => [],
          );
          if (items.some((it) => it.id === analysisId)) {
            if (!cancelled) setScriptId(s.id);
            return;
          }
        }
        if (!cancelled) {
          toast.error("Analysis not found for this project.");
          router.replace(`/projects/${projectId}/creative-hub/risk-analyzer`);
        }
      } catch (err) {
        console.error("[risk-analyzer/dashboard] resolve script failed", err);
        if (!cancelled) toast.error("Failed to resolve script for analysis.");
      } finally {
        if (!cancelled) setResolvingScript(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, analysisId, router]);

  const polling = useRiskAnalysisPolling({
    scriptId,
    analysisId: scriptId !== null ? analysisId : null,
  });

  const status = polling.status;
  const analysis = polling.analysis;
  const norm = normaliseStatus(status?.status ?? analysis?.status);
  const isFinalized = norm === "FINALIZED";
  const readOnly = isFinalized;
  const isCancelled = norm === "CANCELLED";
  const cancelledContext = analysis?.cancelled_context ?? null;
  const isEmpty =
    analysis?.summary_stats?.is_empty === true ||
    (analysis?.summary_stats?.is_empty === undefined &&
      (analysis?.total_findings_count === 0 ||
        (analysis?.scenes ?? []).every(
          (s) => !s.findings.some((f) => !f.deleted_by_user),
        )));

  // ── Helpers: handle a RiskApiResult uniformly with toasts ────────────────
  const handleApiError = useCallback((err: RiskApiError) => {
    switch (err.code) {
      case "finalized_readonly":
        toast.warn("This analysis is finalized and read-only.");
        return;
      case "max_scenes_exceeded":
        toast.error(err.message, { autoClose: 7000 });
        return;
      case "payload_too_large":
        toast.error("File is too large (max 25 MB).");
        return;
      case "unsupported_media":
        toast.error("Unsupported file type. Use PNG, JPG, or PDF.");
        return;
      case "content_type_mismatch":
        toast.error(err.message, { autoClose: 7000 });
        return;
      case "not_cancellable":
        toast.warn("Analysis is not in a cancellable state.");
        return;
      case "forbidden":
        toast.error(err.message || "You don't have permission for that.");
        return;
      case "throttled":
        toast.warn(
          err.retry_after
            ? `Too many requests — try again in ${err.retry_after}s.`
            : "Too many requests. Slow down a bit.",
        );
        return;
      case "insufficient_credits":
        toast.error(err.message);
        return;
      default:
        toast.error(err.message);
    }
  }, []);

  const handleFinalize = useCallback(async () => {
    if (scriptId === null) return;
    setFinalizing(true);
    try {
      const res = await finalize(scriptId, analysisId);
      if (!res.ok) {
        handleApiError(res);
        return;
      }
      toast.info("Finalizing — generating compliance report…");
      setShowFinalize(false);
      // Script-page risk badges may now read from a fresh FINALIZED envelope.
      invalidateScriptRiskCache(scriptId);
      await polling.refresh();
    } finally {
      setFinalizing(false);
    }
  }, [scriptId, analysisId, polling, handleApiError]);

  const handleResume = useCallback(async () => {
    if (scriptId === null) return;
    setResuming(true);
    try {
      const res = await resume(scriptId, analysisId);
      if (!res.ok) {
        handleApiError(res);
        return;
      }
      toast.info("Re-enqueued — pipeline resuming from the failed phase.");
      await polling.refresh();
    } finally {
      setResuming(false);
    }
  }, [scriptId, analysisId, polling, handleApiError]);

  const handleCancel = useCallback(
    async (reason: string) => {
      if (scriptId === null) return;
      setCancelling(true);
      try {
        const res = await cancelAnalysis(scriptId, analysisId, reason);
        if (!res.ok) {
          if (res.code === "not_cancellable") {
            toast.warn("Analysis is not in a cancellable state.");
            await polling.refresh();
          } else if (res.code === "forbidden") {
            toast.error("You don't have permission to cancel this analysis.");
          } else {
            handleApiError(res);
          }
          return;
        }
        toast.success("Analysis cancelled.");
        setShowCancel(false);
        await polling.refresh();
      } finally {
        setCancelling(false);
      }
    },
    [scriptId, analysisId, polling, handleApiError],
  );

  const handleStartNewAnalysis = useCallback(() => {
    router.push(`/projects/${projectId}/creative-hub/risk-analyzer`);
  }, [router, projectId]);

  const handleDownloadPdf = useCallback(() => {
    if (scriptId === null) return;
    // Insurance PDF — prefer the explicit URL the envelope returns, fall
    // back to the disambiguated insurance endpoint, then to the legacy
    // `report/pdf/` alias which older backend builds still expose.
    if (analysis?.finalized_pdf_url) {
      window.open(analysis.finalized_pdf_url, "_blank");
      return;
    }
    // Use the new explicit endpoint first; `report/pdf/` is kept as a
    // back-compat alias and will still work on older deployments.
    window.open(getInsurancePdfUrl(scriptId, analysisId), "_blank");
  }, [scriptId, analysisId, analysis?.finalized_pdf_url]);

  const handleDownloadProducerPdf = useCallback(() => {
    if (scriptId === null) return;
    if (analysis?.producer_pdf_url) {
      window.open(analysis.producer_pdf_url, "_blank");
      return;
    }
    window.open(getProducerPdfUrl(scriptId, analysisId), "_blank");
  }, [scriptId, analysisId, analysis?.producer_pdf_url]);

  // ── Edit handlers — all re-fetch on success ──────────────────────────────
  const openCreate = (sceneId: number) =>
    setModal({ open: true, mode: "create", sceneId, finding: null });
  const openEdit = (sceneId: number, finding: RiskFinding) =>
    setModal({ open: true, mode: "edit", sceneId, finding });
  const closeModal = () => setModal((m) => ({ ...m, open: false }));

  const submitModal = async (values: {
    category_slug: string;
    severity: Severity;
    reason: string;
  }) => {
    setSubmittingModal(true);
    try {
      if (modal.mode === "create" && modal.sceneId !== null) {
        const res = await createFinding(analysisId, modal.sceneId, values);
        if (!res.ok) {
          handleApiError(res);
          return;
        }
        toast.success("Finding added.");
      } else if (modal.mode === "edit" && modal.finding) {
        const res = await patchFinding(modal.finding.id, values);
        if (!res.ok) {
          handleApiError(res);
          return;
        }
        toast.success("Finding updated.");
      }
      closeModal();
      await polling.refresh();
    } finally {
      setSubmittingModal(false);
    }
  };

  const handleDelete = async (finding: RiskFinding) => {
    const res = await deleteFinding(finding.id);
    if (!res.ok) return handleApiError(res);
    toast.success("Finding removed.");
    await polling.refresh();
  };

  const handleRestore = async (finding: RiskFinding) => {
    const res = await restoreFinding(finding.id);
    if (!res.ok) return handleApiError(res);
    toast.success("Finding restored.");
    await polling.refresh();
  };

  const handleRevert = async (finding: RiskFinding) => {
    const res = await revertFinding(finding.id);
    if (!res.ok) return handleApiError(res);
    toast.success("Finding reverted to AI baseline.");
    await polling.refresh();
  };

  const handleApprove = async (finding: RiskFinding, approve: boolean) => {
    const res = await approveFinding(finding.id, approve);
    if (!res.ok) return handleApiError(res);
    await polling.refresh();
  };

  const handlePatchMitigation = async (
    mitigationId: number,
    body: {
      recommendation?: string;
      equipment_needed?: string;
      personnel_required?: string;
    },
  ) => {
    const res = await patchMitigation(mitigationId, body);
    if (!res.ok) return handleApiError(res);
    toast.success("Mitigation updated.");
    await polling.refresh();
  };

  const handleCreateMitigation = async (
    findingId: number,
    body: {
      recommendation: string;
      equipment_needed?: string;
      personnel_required?: string;
    },
  ) => {
    const res = await createMitigationForFinding(findingId, body);
    if (!res.ok) return handleApiError(res);
    toast.success("Mitigation added.");
    await polling.refresh();
  };

  const handleRevertMitigation = async (mitigationId: number) => {
    const res = await revertMitigation(mitigationId);
    if (!res.ok) return handleApiError(res);
    toast.success("Mitigation reverted to AI baseline.");
    await polling.refresh();
  };

  const handleUploadEvidence = async (findingId: number, file: File) => {
    const res = await uploadEvidence(findingId, file);
    if (!res.ok) return handleApiError(res);
    toast.success("Evidence uploaded.");
    await polling.refresh();
  };

  // ── Click-throughs between tabs ──────────────────────────────────────────
  const openSceneInScenesTab = useCallback((sceneId: number) => {
    setScenesExpandedSceneId(sceneId);
    setScenesFilterCategory(null);
    setTab("scenes");
  }, []);

  const filterScenesByCategory = useCallback((slug: string) => {
    setScenesFilterCategory(slug);
    setScenesExpandedSceneId(null);
    setTab("scenes");
  }, []);

  // ── Render ───────────────────────────────────────────────────────────────
  if (resolvingScript) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  const tabs: Array<{ id: TabKey; label: string; icon: React.ReactNode }> = [
    { id: "overview", label: "Overview", icon: <BarChart2 size={13} /> },
    { id: "scenes", label: "Scenes", icon: <Film size={13} /> },
    { id: "hazards", label: "Hazards", icon: <AlertTriangle size={13} /> },
    { id: "graph", label: "Graph", icon: <GitBranch size={13} /> },
    // Tab label stays "Compliance" so the producer's bookmarks/URLs don't
    // 404; the underlying component now renders the dual-report Reports UI.
    { id: "compliance", label: "Compliance", icon: <ShieldCheck size={13} /> },
  ];

  return (
    <div className="flex h-full flex-col">
      {/* Top bar */}
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/creative-hub/risk-analyzer`}
            className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            <ChevronLeft size={12} /> Back
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <ShieldAlert size={18} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[var(--text-primary)]">
              Risk Analyzer · Analysis #{analysisId}
            </h1>
            <p className="text-xs text-[var(--text-muted)]">
              {polling.isPolling
                ? "Live polling…"
                : norm
                  ? `Status: ${norm.replace("_", " ").toLowerCase()}`
                  : "Loading…"}
            </p>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {/* Stalled banner — overlays the regular status banner when the
            backend (or the client fallback) signals no progress. */}
        {polling.isStalled && (
          <StalledBanner
            stalledSeconds={polling.stalledSeconds}
            onRefresh={() => {
              void polling.refresh();
            }}
            onCancel={() => setShowCancel(true)}
            paused={polling.paused}
            onPause={polling.pause}
            onResume={polling.resume}
            cancelDisabled={
              norm === "FAILED" ||
              norm === "FINALIZED" ||
              norm === "CANCELLED" ||
              norm === "AWAITING_APPROVAL"
            }
          />
        )}

        {/* Cancelled-state banner — replaces the StatusBanner CANCELLED copy
            with a producer-actionable variant when there's partial data we
            can still finalize. */}
        {isCancelled && analysis ? (
          <div className="mb-4">
            <CancelledStateBanner
              analysis={analysis}
              cancelledContext={cancelledContext}
              scenesProcessed={
                status?.scenes_processed ??
                analysis.summary_stats?.scenes_analysed
              }
              onFinalize={
                cancelledContext?.finalize_available_from_cancelled
                  ? () => setShowFinalize(true)
                  : undefined
              }
              onStartNewAnalysis={handleStartNewAnalysis}
            />
          </div>
        ) : (
          <div className="mb-4">
            <StatusBanner
              status={status}
              analysis={analysis}
              onFinalize={() => setShowFinalize(true)}
              onResume={handleResume}
              onDownloadPdf={handleDownloadPdf}
              onCancel={() => setShowCancel(true)}
              onStartNewAnalysis={handleStartNewAnalysis}
              finalizing={finalizing || resuming}
            />
          </div>
        )}

        {/* Tabs — only useful once results exist */}
        {analysis ? (
          <>
            <nav className="mb-4 flex gap-2 border-b border-[var(--border)]">
              {tabs.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setTab(t.id)}
                    className={`-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-semibold transition-colors ${
                      active
                        ? "border-emerald-500 text-emerald-500"
                        : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    {t.icon}
                    {t.label}
                  </button>
                );
              })}
            </nav>

            {tab === "overview" && (
              <OverviewTab
                analysis={analysis}
                isEmpty={isEmpty}
                isCancelled={isCancelled}
                onOpenEditHistory={() => setShowEditHistory(true)}
                onSelectScene={openSceneInScenesTab}
                onSelectCategory={filterScenesByCategory}
                onStartNewAnalysis={handleStartNewAnalysis}
              />
            )}

            {tab === "scenes" && (
              <ScenesTable
                scenes={analysis.scenes}
                projectId={projectId}
                readOnly={readOnly}
                initialCategoryFilter={scenesFilterCategory}
                initialExpandedSceneId={scenesExpandedSceneId}
                onEditFinding={openEdit}
                onAddFinding={openCreate}
                onDeleteFinding={handleDelete}
                onRestoreFinding={handleRestore}
                onRevertFinding={handleRevert}
                onApproveFinding={handleApprove}
                onPatchMitigation={handlePatchMitigation}
                onCreateMitigation={handleCreateMitigation}
                onRevertMitigation={handleRevertMitigation}
                onUploadEvidence={handleUploadEvidence}
              />
            )}

            {tab === "hazards" && (
              <HazardsView
                analysis={analysis}
                onSelectCategory={filterScenesByCategory}
              />
            )}

            {tab === "graph" && (
              <RiskGraph
                analysis={analysis}
                onSelectCategory={filterScenesByCategory}
                onSelectScene={openSceneInScenesTab}
              />
            )}

            {tab === "compliance" && (
              <ReportsTab
                analysis={analysis}
                onFinalize={() => setShowFinalize(true)}
                onDownloadInsurancePdf={handleDownloadPdf}
                onDownloadProducerPdf={handleDownloadProducerPdf}
                onStartNewAnalysis={handleStartNewAnalysis}
                onSelectScene={openSceneInScenesTab}
              />
            )}
          </>
        ) : !polling.isPolling ? (
          <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
            No results envelope yet.
          </div>
        ) : null}
      </div>

      {/* Edit-history modal — opened from Overview's "View edit history" link. */}
      {showEditHistory && analysis?.edit_summary && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowEditHistory(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1"
          >
            <EditTransparencyTable summary={analysis.edit_summary} />
            <div className="flex justify-end px-4 pb-3">
              <button
                type="button"
                onClick={() => setShowEditHistory(false)}
                className="rounded-md border border-[var(--border)] px-3 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <FindingEditModal
        open={modal.open}
        mode={modal.mode}
        finding={modal.finding}
        onClose={closeModal}
        onSubmit={submitModal}
        submitting={submittingModal}
      />

      <FinalizeDialog
        open={showFinalize}
        onClose={() => setShowFinalize(false)}
        onConfirm={handleFinalize}
        submitting={finalizing}
      />

      <CancelDialog
        open={showCancel}
        onClose={() => setShowCancel(false)}
        onConfirm={(reason) => handleCancel(reason)}
        submitting={cancelling}
      />
    </div>
  );
}

interface OverviewTabProps {
  analysis: NonNullable<ReturnType<typeof useRiskAnalysisPolling>["analysis"]>;
  isEmpty: boolean;
  isCancelled: boolean;
  onOpenEditHistory: () => void;
  onSelectScene: (sceneId: number) => void;
  onSelectCategory: (slug: string) => void;
  onStartNewAnalysis: () => void;
}

function OverviewTab({
  analysis,
  isEmpty,
  isCancelled,
  onOpenEditHistory,
  onSelectScene,
  onSelectCategory,
  onStartNewAnalysis,
}: OverviewTabProps) {
  const totalFindings = useMemo(() => {
    if (typeof analysis.total_findings_count === "number") {
      return analysis.total_findings_count;
    }
    return analysis.summary_stats?.severity_distribution
      ? Object.values(analysis.summary_stats.severity_distribution).reduce(
          (acc, n) => acc + (typeof n === "number" ? n : 0),
          0,
        )
      : 0;
  }, [
    analysis.total_findings_count,
    analysis.summary_stats?.severity_distribution,
  ]);

  if (isEmpty) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <ShieldAlert size={24} className="text-[var(--text-muted)]" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">
            No findings to show
          </h3>
          <p className="max-w-md text-xs text-[var(--text-muted)]">
            {isCancelled
              ? "The analysis was cancelled before any hazards were classified. The score and insurance tier shown above are defaults — they don't reflect a completed assessment."
              : "We didn't surface any risks for this analysis. If the script is complete, that's a clean read; otherwise check that the run finished without errors."}
          </p>
          {isCancelled && (
            <button
              type="button"
              onClick={onStartNewAnalysis}
              className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-500"
            >
              Start new analysis
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <KpiStrip analysis={analysis} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ScoreGauge
          score={analysis.score}
          insurance={analysis.insurance}
          editSummary={analysis.edit_summary}
        />
        <SeverityDistributionDonut
          distribution={
            analysis.summary_stats?.severity_distribution ?? {
              Critical: 0,
              High: 0,
              Medium: 0,
              Low: 0,
            }
          }
          totalLabel={totalFindings === 1 ? "finding" : "findings"}
        />
      </div>

      <CumulativeExposureChart scenes={analysis.scenes} />

      <div className="grid gap-4 lg:grid-cols-2">
        <TopRiskScenes
          scenes={analysis.scenes}
          onSelectScene={onSelectScene}
        />
        <TopHazards
          analysis={analysis}
          onSelectCategory={onSelectCategory}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onOpenEditHistory}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-emerald-500/40 hover:text-emerald-500"
        >
          View edit history
        </button>
      </div>
    </div>
  );
}
