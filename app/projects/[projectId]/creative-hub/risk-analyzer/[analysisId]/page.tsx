"use client";

// Risk Analyzer dashboard — Overview / Graph / Compliance tabs over a single
// analysis. Drives status polling (FRONTEND_INTEGRATION.md §4) and routes
// every edit through the typed API client so 402/409/422/413/415/429 are
// surfaced as inline UI rather than thrown errors.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  BarChart2,
  ChevronLeft,
  GitGraph,
  Loader2,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";

import {
  approveFinding,
  createFinding,
  createMitigationForFinding,
  deleteFinding,
  finalize,
  getReportPdfUrl,
  markAnalysisFailedAndResume,
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

import StatusBanner from "../_components/StatusBanner";
import StalledBanner from "../_components/StalledBanner";
import ScoreGauge from "../_components/ScoreGauge";
import CumulativeExposureChart from "../_components/CumulativeExposureChart";
import SeverityDistributionDonut from "../_components/SeverityDistributionDonut";
import SceneDrillDownList from "../_components/SceneDrillDownList";
import RiskGraph from "../_components/RiskGraph";
import ComplianceSection from "../_components/ComplianceSection";
import EditTransparencyTable from "../_components/EditTransparencyTable";
import FindingEditModal from "../_components/FindingEditModal";
import FinalizeDialog from "../_components/FinalizeDialog";

type TabKey = "overview" | "graph" | "compliance";

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
  const [finalizing, setFinalizing] = useState(false);
  const [resuming, setResuming] = useState(false);
  const [retryingStalled, setRetryingStalled] = useState(false);
  const [showFinalize, setShowFinalize] = useState(false);
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
          const items: RiskAnalysisListItem[] = await listAnalyses(s.id).catch(() => []);
          if (items.some((it) => it.id === analysisId)) {
            if (!cancelled) setScriptId(s.id);
            return;
          }
        }
        if (!cancelled) {
          // Couldn't find — bounce back to index.
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
      // Re-fetch via polling refresh — backend will move status to FINALIZING then FINALIZED.
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

  const handleMarkFailedAndRetry = useCallback(async () => {
    if (scriptId === null) return;
    setRetryingStalled(true);
    try {
      const res = await markAnalysisFailedAndResume(scriptId, analysisId);
      if (!res.ok) {
        if (res.status === 409) {
          // Backend rejected because the row is still PENDING — watchdog
          // hasn't promoted it to FAILED yet. Show the documented copy.
          toast.warn(
            "Backend hasn't marked this analysis as failed yet — the watchdog runs every 2 minutes. Try again shortly.",
            { autoClose: 7000 },
          );
        } else {
          handleApiError(res);
        }
        return;
      }
      toast.info("Re-queued — pipeline restarting.");
      // Navigate to the same URL — the analysis is now back in PENDING with
      // a fresh task dispatched, and we want the hook to reset its stall
      // timer + attempt counter.
      router.replace(
        `/projects/${projectId}/creative-hub/risk-analyzer/${analysisId}`,
      );
      await polling.refresh();
    } finally {
      setRetryingStalled(false);
    }
  }, [scriptId, analysisId, projectId, polling, router, handleApiError]);

  const handleDownloadPdf = useCallback(() => {
    if (scriptId === null) return;
    if (!analysis?.finalized_pdf_url) {
      // Server-side presigned URL is the preferred path; fall back to API URL.
      window.open(getReportPdfUrl(scriptId, analysisId), "_blank");
      return;
    }
    window.open(analysis.finalized_pdf_url, "_blank");
  }, [scriptId, analysisId, analysis?.finalized_pdf_url]);

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
    body: { recommendation?: string; equipment_needed?: string; personnel_required?: string },
  ) => {
    const res = await patchMitigation(mitigationId, body);
    if (!res.ok) return handleApiError(res);
    toast.success("Mitigation updated.");
    await polling.refresh();
  };

  const handleCreateMitigation = async (
    findingId: number,
    body: { recommendation: string; equipment_needed?: string; personnel_required?: string },
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
    { id: "graph", label: "Graph", icon: <GitGraph size={13} /> },
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
            onMarkFailedAndRetry={() => {
              void handleMarkFailedAndRetry();
            }}
            paused={polling.paused}
            onPause={polling.pause}
            onResume={polling.resume}
            retryDisabled={norm === "FAILED"}
            retrying={retryingStalled}
          />
        )}

        {/* Status banner */}
        <div className="mb-4">
          <StatusBanner
            status={status}
            analysis={analysis}
            onFinalize={() => setShowFinalize(true)}
            onResume={handleResume}
            onDownloadPdf={handleDownloadPdf}
            finalizing={finalizing || resuming}
          />
        </div>

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

            {tab === "overview" && <OverviewTab
              analysis={analysis}
              readOnly={readOnly}
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
            />}

            {tab === "graph" && (
              <RiskGraph graph={analysis.graph} />
            )}

            {tab === "compliance" && (
              <ComplianceSection
                report={analysis.compliance_report ?? null}
                pdfUrl={analysis.finalized_pdf_url}
                onDownloadPdf={handleDownloadPdf}
              />
            )}
          </>
        ) : !polling.isPolling ? (
          <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] text-xs text-[var(--text-muted)]">
            No results envelope yet.
          </div>
        ) : null}
      </div>

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
    </div>
  );
}

interface OverviewTabProps {
  analysis: NonNullable<ReturnType<typeof useRiskAnalysisPolling>["analysis"]>;
  readOnly: boolean;
  onEditFinding: (sceneId: number, f: RiskFinding) => void;
  onAddFinding: (sceneId: number) => void;
  onDeleteFinding: (f: RiskFinding) => void;
  onRestoreFinding: (f: RiskFinding) => void;
  onRevertFinding: (f: RiskFinding) => void;
  onApproveFinding: (f: RiskFinding, approve: boolean) => void;
  onPatchMitigation: (mitigationId: number, body: { recommendation?: string; equipment_needed?: string; personnel_required?: string }) => Promise<void>;
  onCreateMitigation: (findingId: number, body: { recommendation: string; equipment_needed?: string; personnel_required?: string }) => Promise<void>;
  onRevertMitigation: (mitigationId: number) => Promise<void>;
  onUploadEvidence: (findingId: number, file: File) => Promise<void>;
}

function OverviewTab({
  analysis,
  readOnly,
  onEditFinding,
  onAddFinding,
  onDeleteFinding,
  onRestoreFinding,
  onRevertFinding,
  onApproveFinding,
  onPatchMitigation,
  onCreateMitigation,
  onRevertMitigation,
  onUploadEvidence,
}: OverviewTabProps) {
  const totalFindings = useMemo(
    () =>
      (analysis.summary_stats?.severity_distribution
        ? Object.values(analysis.summary_stats.severity_distribution).reduce(
            (acc, n) => acc + (typeof n === "number" ? n : 0),
            0,
          )
        : 0),
    [analysis.summary_stats?.severity_distribution],
  );
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <ScoreGauge
          score={analysis.score}
          insurance={analysis.insurance}
          editSummary={analysis.edit_summary}
        />
        <SeverityDistributionDonut
          distribution={analysis.summary_stats?.severity_distribution ?? { Critical: 0, High: 0, Medium: 0, Low: 0 }}
          totalLabel={totalFindings === 1 ? "finding" : "findings"}
        />
      </div>

      <CumulativeExposureChart scenes={analysis.scenes} />

      <EditTransparencyTable summary={analysis.edit_summary} />

      <SceneDrillDownList
        scenes={analysis.scenes}
        readOnly={readOnly}
        onEditFinding={onEditFinding}
        onAddFinding={onAddFinding}
        onDeleteFinding={onDeleteFinding}
        onRestoreFinding={onRestoreFinding}
        onRevertFinding={onRevertFinding}
        onApproveFinding={onApproveFinding}
        onPatchMitigation={onPatchMitigation}
        onCreateMitigation={onCreateMitigation}
        onRevertMitigation={onRevertMitigation}
        onUploadEvidence={onUploadEvidence}
      />
    </div>
  );
}
