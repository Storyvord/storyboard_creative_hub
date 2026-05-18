"use client";

// Per-finding detail page. Mostly a deep-link target — surfaces the finding's
// full row plus its mitigation and lets the user toggle approval / upload
// evidence in isolation. Uses the same services as the dashboard so any edit
// is consistent with the dashboard's view.

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "react-toastify";

import {
  approveFinding,
  deleteFinding,
  patchFinding,
  patchMitigation,
  restoreFinding,
  revertFinding,
  revertMitigation,
  uploadEvidence,
  createMitigationForFinding,
} from "@/services/risk-analyzer";
import { listAnalyses, getResults } from "@/services/risk-analyzer";
import {
  RiskAnalysis,
  RiskAnalysisListItem,
  RiskApiError,
  RiskFinding,
  RiskMitigation,
  RiskScene,
  Severity,
  normaliseStatus,
} from "@/types/risk-analyzer";

import FindingCard from "../../../_components/FindingCard";
import MitigationPanel from "../../../_components/MitigationPanel";
import FindingEditModal from "../../../_components/FindingEditModal";

export default function FindingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const analysisId = Number(params.analysisId);
  const findingId = Number(params.findingId);

  const [scriptId, setScriptId] = useState<number | null>(null);
  const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Resolve script for the analysis (same walk as the dashboard).
  useEffect(() => {
    let cancelled = false;
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
          toast.error("Analysis not found for this project.");
          router.replace(`/projects/${projectId}/creative-hub/risk-analyzer`);
        }
      } catch (err) {
        console.error("[risk-analyzer/finding] resolve script failed", err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, analysisId, router]);

  const refresh = useCallback(async () => {
    if (scriptId === null) return;
    setLoading(true);
    try {
      const data = await getResults(scriptId, analysisId);
      setAnalysis(data);
    } catch (err) {
      console.error("[risk-analyzer/finding] getResults failed", err);
      toast.error("Failed to load analysis.");
    } finally {
      setLoading(false);
    }
  }, [scriptId, analysisId]);

  useEffect(() => {
    if (scriptId !== null) void refresh();
  }, [scriptId, refresh]);

  const { finding, scene, mitigation } = useMemo<{
    finding: RiskFinding | null;
    scene: RiskScene | null;
    mitigation: RiskMitigation | null;
  }>(() => {
    if (!analysis) return { finding: null, scene: null, mitigation: null };
    for (const s of analysis.scenes) {
      const f = s.findings.find((row) => row.id === findingId);
      if (f) {
        const m = s.mitigations.find((row) => row.finding_id === f.id) ?? null;
        return { finding: f, scene: s, mitigation: m };
      }
    }
    return { finding: null, scene: null, mitigation: null };
  }, [analysis, findingId]);

  const readOnly = normaliseStatus(analysis?.status) === "FINALIZED";

  const handleErr = useCallback((err: RiskApiError) => {
    if (err.code === "finalized_readonly") toast.warn("This analysis is finalized and read-only.");
    else if (err.code === "payload_too_large") toast.error("File is too large (max 25 MB).");
    else if (err.code === "unsupported_media") toast.error("Unsupported file type. Use PNG, JPG, or PDF.");
    else toast.error(err.message);
  }, []);

  const submitEdit = async (values: { category_slug: string; severity: Severity; reason: string }) => {
    if (!finding) return;
    setSubmittingEdit(true);
    try {
      const res = await patchFinding(finding.id, values);
      if (!res.ok) {
        handleErr(res);
        return;
      }
      toast.success("Finding updated.");
      setShowEdit(false);
      await refresh();
    } finally {
      setSubmittingEdit(false);
    }
  };

  if (loading || !analysis) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (!finding || !scene) {
    return (
      <div className="p-8">
        <Link
          href={`/projects/${projectId}/creative-hub/risk-analyzer/${analysisId}`}
          className="inline-flex items-center gap-1 text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
        >
          <ChevronLeft size={12} /> Back to dashboard
        </Link>
        <div className="mt-4 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)] opacity-30" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            Finding not found in this analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-3 border-b border-[var(--border)] px-6 py-4">
        <Link
          href={`/projects/${projectId}/creative-hub/risk-analyzer/${analysisId}`}
          className="inline-flex items-center gap-1 rounded-md border border-[var(--border)] px-2.5 py-1.5 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
        >
          <ChevronLeft size={12} /> Dashboard
        </Link>
        <div>
          <h1 className="text-base font-semibold text-[var(--text-primary)]">
            Finding · {finding.category}
          </h1>
          <p className="text-xs text-[var(--text-muted)]">
            Scene {scene.order} · {scene.heading}
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
        <FindingCard
          finding={finding}
          readOnly={readOnly}
          onEdit={() => setShowEdit(true)}
          onDelete={async (f) => {
            const r = await deleteFinding(f.id);
            if (!r.ok) handleErr(r);
            else {
              toast.success("Finding removed.");
              await refresh();
            }
          }}
          onRestore={async (f) => {
            const r = await restoreFinding(f.id);
            if (!r.ok) handleErr(r);
            else {
              toast.success("Finding restored.");
              await refresh();
            }
          }}
          onRevert={async (f) => {
            const r = await revertFinding(f.id);
            if (!r.ok) handleErr(r);
            else {
              toast.success("Reverted to AI baseline.");
              await refresh();
            }
          }}
          onApprove={async (f, approve) => {
            const r = await approveFinding(f.id, approve);
            if (!r.ok) handleErr(r);
            else await refresh();
          }}
        />

        <MitigationPanel
          finding={finding}
          mitigation={mitigation}
          readOnly={readOnly}
          onPatch={async (id, body) => {
            const r = await patchMitigation(id, body);
            if (!r.ok) handleErr(r);
            else {
              toast.success("Mitigation updated.");
              await refresh();
            }
          }}
          onCreate={async (fid, body) => {
            const r = await createMitigationForFinding(fid, body);
            if (!r.ok) handleErr(r);
            else {
              toast.success("Mitigation added.");
              await refresh();
            }
          }}
          onRevert={async (id) => {
            const r = await revertMitigation(id);
            if (!r.ok) handleErr(r);
            else {
              toast.success("Mitigation reverted.");
              await refresh();
            }
          }}
          onUploadEvidence={async (fid, file) => {
            const r = await uploadEvidence(fid, file);
            if (!r.ok) handleErr(r);
            else {
              toast.success("Evidence uploaded.");
              await refresh();
            }
          }}
        />
      </div>

      <FindingEditModal
        open={showEdit}
        mode="edit"
        finding={finding}
        onClose={() => setShowEdit(false)}
        onSubmit={submitEdit}
        submitting={submittingEdit}
      />
    </div>
  );
}
