"use client";

// Compact per-scene risk findings widget rendered on the scene detail page.
// Linked from the Risk Analyzer dashboard drill-down list so producers can
// jump to a scene and still see the AI-classified hazards without leaving
// the scene view. Read-only summary only — full edit lives on the
// risk-analyzer routes.

import { useEffect, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, ShieldAlert, ChevronRight } from "lucide-react";
import { getSceneFindings } from "@/services/risk-analyzer";
import { RiskFinding } from "@/types/risk-analyzer";

const SEVERITY_COLOR: Record<string, string> = {
  Critical: "#ef4444",
  High: "#ea580c",
  Medium: "#f59e0b",
  Low: "#10b981",
};

interface SceneRiskFindingsCalloutProps {
  sceneId: number;
  projectId: string;
}

export default function SceneRiskFindingsCallout({
  sceneId,
  projectId,
}: SceneRiskFindingsCalloutProps) {
  const [findings, setFindings] = useState<RiskFinding[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSceneFindings(sceneId)
      .then((data) => {
        if (cancelled) return;
        setFindings(data);
      })
      .catch((err) => {
        console.error("[SceneRiskFindingsCallout] getSceneFindings failed", err);
        if (!cancelled) setError("Couldn't load risk findings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sceneId]);

  // Hide entirely if there's an error reaching the endpoint — risk findings
  // are optional surface area on the scene page and a 404 from a project
  // without an analysis shouldn't be alarming.
  if (error) return null;
  if (!loading && (!findings || findings.length === 0)) {
    return (
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
          <ShieldAlert className="h-5 w-5 text-emerald-400" />
          Risk findings
        </h2>
        <div className="rounded-md border border-dashed border-[var(--border)] bg-[var(--surface)]/40 px-4 py-3 text-sm text-[var(--text-muted)]">
          No risk findings recorded for this scene.{" "}
          <Link
            href={`/projects/${projectId}/creative-hub/risk-analyzer`}
            className="text-emerald-400 hover:text-emerald-300"
          >
            Run a risk analysis →
          </Link>
        </div>
      </section>
    );
  }
  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-lg font-semibold text-[var(--text-primary)]">
          <ShieldAlert className="h-5 w-5 text-emerald-400" />
          Risk findings {findings ? `(${findings.length})` : ""}
        </h2>
        <Link
          href={`/projects/${projectId}/creative-hub/risk-analyzer`}
          className="inline-flex items-center gap-1.5 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:border-emerald-500/40 hover:text-emerald-500"
        >
          <ExternalLink className="h-3 w-3" /> Open in Risk Analyzer
        </Link>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)]/40 px-4 py-3 text-xs text-[var(--text-muted)]">
          <Loader2 size={12} className="animate-spin" /> Loading findings…
        </div>
      ) : (
        <ul className="space-y-2">
          {(findings ?? []).map((f) => {
            const color = SEVERITY_COLOR[f.severity] ?? "#94a3b8";
            return (
              <li
                key={f.id}
                className="flex items-start gap-3 rounded-md border border-[var(--border)] bg-[var(--surface)]/40 px-3 py-2"
              >
                <span
                  className="mt-0.5 inline-flex flex-shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{ backgroundColor: `${color}22`, color }}
                >
                  {f.severity}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--text-primary)]">{f.category}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{f.reason}</p>
                  {f.evidence_quote && (
                    <p className="mt-0.5 text-[11px] italic text-[var(--text-muted)]">
                      <span className="font-mono not-italic mr-1 select-none">{">"}</span>
                      {f.evidence_quote}
                    </p>
                  )}
                </div>
                <ChevronRight size={14} className="mt-1 text-[var(--text-muted)]" />
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
