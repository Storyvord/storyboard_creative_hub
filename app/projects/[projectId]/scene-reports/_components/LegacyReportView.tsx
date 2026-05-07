"use client";

// Legacy fallback for scene reports generated before the STO-1066 envelope
// shape existed. Activated when the report's `data.tab_type === "legacy_markdown"`
// or when `data.legacy_markdown` is a non-empty string. Renders the markdown
// inside a <pre> (no markdown library in this repo at the time of writing —
// minimal fallback per ticket) plus a yellow banner inviting the user to
// regenerate the report under the new deck layout.

import * as React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { SceneReportEnvelope } from "@/types/scene-reports";

export function isLegacyEnvelope(env: SceneReportEnvelope | null | undefined): boolean {
  if (!env) return false;
  if (env.tab_type === "legacy_markdown") return true;
  if (typeof env.legacy_markdown === "string" && env.legacy_markdown.trim().length > 0) return true;
  return false;
}

export function extractLegacyMarkdown(env: SceneReportEnvelope | null | undefined): string {
  if (!env) return "";
  if (typeof env.legacy_markdown === "string" && env.legacy_markdown.trim().length > 0) return env.legacy_markdown;
  const firstSection = env.sections?.[0];
  const prose = firstSection?.data?.prose as Record<string, unknown> | undefined;
  if (prose && typeof prose.markdown === "string") return prose.markdown as string;
  return "";
}

interface LegacyReportViewProps {
  markdown: string;
  onRegenerate: () => void;
  regenerating: boolean;
}

export default function LegacyReportView({ markdown, onRegenerate, regenerating }: LegacyReportViewProps) {
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
          background: "rgba(234,179,8,0.12)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <AlertTriangle size={14} color="#a16207" />
          <p style={{ margin: 0, fontSize: 12, color: "#854d0e", fontWeight: 500 }}>
            Legacy report — regenerate for the new deck layout.
          </p>
        </div>
        <button
          onClick={onRegenerate}
          disabled={regenerating}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
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
          <RefreshCw size={12} className={regenerating ? "animate-spin" : undefined} />
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
          lineHeight: 1.65,
          color: "var(--text-secondary)",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          maxHeight: "60vh",
          overflow: "auto",
        }}
      >
        {markdown || "No legacy markdown content."}
      </pre>
    </div>
  );
}
