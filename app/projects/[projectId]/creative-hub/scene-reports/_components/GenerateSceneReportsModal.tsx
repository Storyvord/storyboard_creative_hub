"use client";

// Generate-reports modal for the Scene Reports page. Mirrors the project-deck
// GeneratePanel shape but operates on `(report_type, report_name)` tuples
// since the backend keys generation on report_name (not report_id).

import * as React from "react";
import { CustomSceneReportType, SystemSceneReportType, SceneReportKind } from "@/types/scene-reports";

export interface GenerateSelection {
  report_type: SceneReportKind;
  report_name: string;
}

interface GenerateSceneReportsModalProps {
  systemReports: SystemSceneReportType[];
  customReports: CustomSceneReportType[];
  onGenerate: (selected: GenerateSelection[]) => void;
  generating: boolean;
  onClose: () => void;
}

export default function GenerateSceneReportsModal({
  systemReports,
  customReports,
  onGenerate,
  generating,
  onClose,
}: GenerateSceneReportsModalProps) {
  const [selected, setSelected] = React.useState<GenerateSelection[]>([]);

  const isSelected = (kind: SceneReportKind, name: string) =>
    selected.some((s) => s.report_type === kind && s.report_name === name);

  const toggle = (kind: SceneReportKind, name: string) => {
    setSelected((current) =>
      isSelected(kind, name)
        ? current.filter((s) => !(s.report_type === kind && s.report_name === name))
        : [...current, { report_type: kind, report_name: name }],
    );
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,.6)",
      }}
    >
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          padding: 28,
          width: 520,
          maxWidth: "calc(100vw - 32px)",
          maxHeight: "80vh",
          overflow: "auto",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Generate Scene Reports</h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20 }}
          >
            ×
          </button>
        </div>
        <p style={{ margin: "0 0 16px", fontSize: 13, color: "var(--text-muted)" }}>
          Select report types to generate for this scene. Generation runs synchronously on this path.
        </p>

        {systemReports.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              System
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {systemReports.map((r) => {
                const sel = isSelected("system", r.name);
                return (
                  <label
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1px solid ${sel ? "#22c55e" : "var(--border)"}`,
                      background: sel ? "rgba(34,197,94,0.08)" : "var(--surface-raised)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => toggle("system", r.name)}
                      style={{ accentColor: "#22c55e" }}
                    />
                    <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{r.display_name || r.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {customReports.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            <p
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                marginBottom: 8,
              }}
            >
              Custom
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {customReports.map((r) => {
                const sel = isSelected("custom", r.name);
                return (
                  <label
                    key={r.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      cursor: "pointer",
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: `1px solid ${sel ? "#3b82f6" : "var(--border)"}`,
                      background: sel ? "rgba(59,130,246,0.08)" : "var(--surface-raised)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={sel}
                      onChange={() => toggle("custom", r.name)}
                      style={{ accentColor: "#3b82f6" }}
                    />
                    <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{r.display_name || r.name}</span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {systemReports.length === 0 && customReports.length === 0 && (
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>No report types available.</p>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            onClick={onClose}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "none",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => onGenerate(selected)}
            disabled={generating || selected.length === 0}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              color: "#fff",
              opacity: generating || selected.length === 0 ? 0.6 : 1,
            }}
          >
            {generating ? "Generating…" : `Generate ${selected.length > 0 ? `(${selected.length})` : ""}`}
          </button>
        </div>
      </div>
    </div>
  );
}
