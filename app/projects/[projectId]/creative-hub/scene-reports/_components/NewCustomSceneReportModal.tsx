"use client";

import * as React from "react";
import { toast } from "react-toastify";
import { createCustomSceneReportType } from "@/services/scene-reports";

interface NewCustomSceneReportModalProps {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewCustomSceneReportModal({
  projectId,
  onClose,
  onCreated,
}: NewCustomSceneReportModalProps) {
  const [name, setName] = React.useState("");
  const [displayName, setDisplayName] = React.useState("");
  const [prompt, setPrompt] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("Report name is required.");
      return;
    }
    setSaving(true);
    try {
      await createCustomSceneReportType(projectId, {
        name: name.trim(),
        display_name: displayName.trim() || name.trim(),
        prompt_template: prompt.trim() || undefined,
      });
      toast.success("Custom scene report created.");
      onCreated();
      onClose();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { detail?: string; error?: string } } };
      toast.error(err?.response?.data?.detail ?? err?.response?.data?.error ?? "Failed to create report.");
    } finally {
      setSaving(false);
    }
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
          width: 460,
          maxWidth: "calc(100vw - 32px)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>New Custom Scene Report</h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", fontSize: 20 }}
          >
            ×
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 16 }}>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
                color: "var(--text-muted)",
              }}
            >
              Name (slug) *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. scene_safety_brief"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-raised)",
                fontSize: 13,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
                color: "var(--text-muted)",
              }}
            >
              Display Name
            </label>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Scene Safety Brief"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-raised)",
                fontSize: 13,
                boxSizing: "border-box",
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: "block",
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 6,
                color: "var(--text-muted)",
              }}
            >
              Prompt template (optional)
            </label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={4}
              placeholder="Describe what this scene report should contain…"
              style={{
                width: "100%",
                padding: "9px 12px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: "var(--surface-raised)",
                fontSize: 13,
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>
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
            onClick={handleCreate}
            disabled={saving}
            style={{
              padding: "8px 18px",
              borderRadius: 8,
              background: "linear-gradient(135deg,#22c55e,#16a34a)",
              border: "none",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: 13,
              color: "#fff",
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? "Creating…" : "Create Report"}
          </button>
        </div>
      </div>
    </div>
  );
}
