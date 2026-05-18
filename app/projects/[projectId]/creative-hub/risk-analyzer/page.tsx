"use client";

// Risk Analyzer index — script picker, prior-analysis history, and the
// "start new analysis" CTA. Mirrors the scene-reports/page.tsx structure
// (URL-driven state, axios services, toastify) and uses the new
// services/risk-analyzer.ts client.

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  FileText,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { toast } from "react-toastify";

import { getScripts } from "@/services/creative-hub";
import { Script } from "@/types/creative-hub";
import {
  listAnalyses,
  startAnalysis,
} from "@/services/risk-analyzer";
import {
  RiskAnalysisListItem,
  StartAnalysisBody,
  normaliseStatus,
} from "@/types/risk-analyzer";
import StartAnalysisDialog from "./_components/StartAnalysisDialog";
import { scoreColor } from "./_components/constants";

export default function RiskAnalyzerIndexPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [scripts, setScripts] = useState<Script[]>([]);
  const [selectedScript, setSelectedScript] = useState<Script | null>(null);
  const [analyses, setAnalyses] = useState<RiskAnalysisListItem[]>([]);
  const [bootLoading, setBootLoading] = useState(true);
  const [analysesLoading, setAnalysesLoading] = useState(false);
  const [showStart, setShowStart] = useState(false);

  // Load scripts.
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      try {
        const list = await getScripts(projectId);
        if (cancelled) return;
        setScripts(list);
        if (list.length > 0) setSelectedScript(list[0]);
      } catch (err) {
        console.error("[risk-analyzer/index] getScripts failed", err);
        if (!cancelled) toast.error("Failed to load scripts.");
      } finally {
        if (!cancelled) setBootLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Load analyses for selected script.
  const refreshAnalyses = useCallback(async (scriptId: number) => {
    setAnalysesLoading(true);
    try {
      const list = await listAnalyses(scriptId);
      setAnalyses(list);
    } catch (err) {
      console.error("[risk-analyzer/index] listAnalyses failed", err);
      toast.error("Failed to load analyses.");
    } finally {
      setAnalysesLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedScript?.id) {
      refreshAnalyses(selectedScript.id);
    } else {
      setAnalyses([]);
    }
  }, [selectedScript, refreshAnalyses]);

  const handleStart = useCallback(
    async (body: StartAnalysisBody) => {
      if (!selectedScript) return;
      const res = await startAnalysis(selectedScript.id, body);
      if (!res.ok) {
        if (res.code === "max_scenes_exceeded") {
          toast.error(res.message, { autoClose: 7000 });
        } else if (res.code !== "insufficient_credits") {
          toast.error(res.message);
        }
        return res;
      }
      toast.success("Analysis started — you'll see live progress on the dashboard.");
      setShowStart(false);
      router.push(`/projects/${projectId}/creative-hub/risk-analyzer/${res.data.analysis_id}`);
      return { ok: true as const, estimate: res.data.estimate };
    },
    [selectedScript, projectId, router],
  );

  const empty = !analysesLoading && analyses.length === 0;

  if (bootLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[var(--text-muted)]" />
      </div>
    );
  }

  if (scripts.length === 0) {
    return (
      <div className="p-8">
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
          <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)] opacity-30" />
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            No script uploaded
          </p>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Upload a script in Creative Hub to run a risk analysis.
          </p>
          <Link
            href={`/projects/${projectId}/creative-hub/script`}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <FileText size={14} /> Go to script
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-[var(--border)] px-6 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
            <ShieldAlert size={18} className="text-emerald-500" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-[var(--text-primary)]">Risk Analyzer</h1>
            <p className="text-xs text-[var(--text-muted)]">
              {selectedScript ? selectedScript.title : "Select a script"} ·{" "}
              {analyses.length} {analyses.length === 1 ? "analysis" : "analyses"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowStart(true)}
          disabled={!selectedScript}
          className="inline-flex items-center gap-1.5 rounded-md bg-gradient-to-br from-emerald-500 to-emerald-600 px-3 py-2 text-sm font-semibold text-white shadow hover:from-emerald-400 hover:to-emerald-500 disabled:opacity-60"
        >
          <Plus size={14} /> New analysis
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {scripts.length > 1 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Script:
            </label>
            <select
              value={selectedScript?.id ?? ""}
              onChange={(e) => {
                const id = Number(e.target.value);
                const next = scripts.find((s) => s.id === id) ?? null;
                setSelectedScript(next);
              }}
              className="rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-sm"
            >
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        )}

        <h2 className="mb-3 text-sm font-semibold text-[var(--text-primary)]">
          Analysis history
        </h2>

        {analysesLoading ? (
          <div className="flex h-[200px] items-center justify-center rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)]">
            <Loader2 className="h-5 w-5 animate-spin text-[var(--text-muted)]" />
          </div>
        ) : empty ? (
          <EmptyState onStart={() => setShowStart(true)} />
        ) : (
          <ul className="space-y-2">
            {analyses.map((a) => (
              <AnalysisRow key={a.id} analysis={a} projectId={projectId} />
            ))}
          </ul>
        )}
      </div>

      <StartAnalysisDialog
        open={showStart}
        onClose={() => setShowStart(false)}
        onSubmit={handleStart}
      />
    </div>
  );
}

function EmptyState({ onStart }: { onStart: () => void }) {
  return (
    <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-12 text-center">
      <ShieldAlert className="mx-auto mb-3 h-10 w-10 text-[var(--text-muted)] opacity-30" />
      <p className="text-sm font-semibold text-[var(--text-secondary)]">
        No risk analysis yet.
      </p>
      <p className="mt-1 text-xs text-[var(--text-muted)]">
        Run the analyzer to surface scene-level hazards, mitigation suggestions, and insurance estimates.
      </p>
      <button
        type="button"
        onClick={onStart}
        className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500"
      >
        <ShieldAlert size={14} /> Start Risk Analysis
      </button>
    </div>
  );
}

function AnalysisRow({
  analysis,
  projectId,
}: {
  analysis: RiskAnalysisListItem;
  projectId: string;
}) {
  const status = normaliseStatus(analysis.status);
  const isFinal = status === "FINALIZED";
  const isFailed = status === "FAILED";
  const isCancelled = status === "CANCELLED";
  const inProgress =
    status === "PENDING" ||
    status === "CLASSIFYING" ||
    status === "MITIGATING" ||
    status === "FINALIZING";
  const score = analysis.score ?? 0;
  const color = score > 0 ? scoreColor(score) : "var(--text-muted)";
  const created = analysis.created_at
    ? new Date(analysis.created_at).toLocaleString()
    : "";

  return (
    <li>
      <Link
        href={`/projects/${projectId}/creative-hub/risk-analyzer/${analysis.id}`}
        className="group flex items-center gap-4 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-3 transition-colors hover:border-emerald-500/40 hover:bg-[var(--surface-hover)]"
      >
        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md" style={{ backgroundColor: `${color}18` }}>
          {isFinal ? (
            <ShieldCheck size={18} style={{ color }} />
          ) : (
            <ShieldAlert size={18} style={{ color }} />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[var(--text-primary)]">
            Analysis #{analysis.id}
            {analysis.score_band && (
              <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                {analysis.score_band}-risk
              </span>
            )}
          </p>
          <p className="text-[11px] text-[var(--text-muted)]">
            {created}
            {analysis.registry_version && ` · registry ${analysis.registry_version}`}
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-3">
          {score > 0 && (
            <span className="text-lg font-bold tabular-nums" style={{ color }}>
              {score}
            </span>
          )}
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
              isFinal
                ? "bg-emerald-500/10 text-emerald-500"
                : isFailed
                  ? "bg-red-500/10 text-red-500"
                  : isCancelled
                    ? "bg-[var(--surface-hover)] text-[var(--text-muted)]"
                    : inProgress
                      ? "bg-amber-500/10 text-amber-500"
                      : "bg-[var(--surface-hover)] text-[var(--text-muted)]"
            }`}
          >
            {status?.replace("_", " ").toLowerCase() ?? "unknown"}
          </span>
          <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-emerald-500" />
        </div>
      </Link>
    </li>
  );
}
