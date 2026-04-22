"use client";

import React, { useState } from "react";
import { Aperture, Command } from "lucide-react";
import { useViewfinder, GELS } from "@/context/ViewfinderContext";

// Small, matte pill anchored bottom-right. Primary action: open palette.
// Secondary: toggle Viewfinder mode and pick a gel.
export default function ViewfinderPill() {
  const { mode, toggleMode, setPaletteOpen, gel, setGel } = useViewfinder();
  const [menuOpen, setMenuOpen] = useState(false);
  const active = mode === "on";

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        zIndex: 45,
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      {active && (
        <button
          type="button"
          aria-label="Open command palette (⌘K)"
          onClick={() => setPaletteOpen(true)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: 10,
            background: "rgba(20, 20, 23, 0.72)",
            border: "1px solid var(--vf-border, #1F1F22)",
            color: "var(--vf-text, #F2F2F2)",
            backdropFilter: "blur(10px)",
            fontSize: 12,
            letterSpacing: "-0.005em",
            cursor: "pointer",
          }}
        >
          <Command size={13} style={{ opacity: 0.7 }} />
          <span>K</span>
          <span style={{ opacity: 0.45, marginLeft: 6 }}>search, ask</span>
        </button>
      )}
      <div style={{ position: "relative" }}>
        <button
          type="button"
          aria-label={active ? "Viewfinder mode: on" : "Enable Viewfinder mode"}
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 10,
            background: active ? "rgba(20, 20, 23, 0.82)" : "rgba(20, 20, 23, 0.55)",
            border: `1px solid ${active ? (gel || "var(--vf-project, #D4A862)") : "var(--border, #222)"}`,
            color: active ? (gel || "var(--vf-project, #D4A862)") : "var(--text-secondary, #aaa)",
            backdropFilter: "blur(10px)",
            cursor: "pointer",
          }}
        >
          <Aperture size={16} />
        </button>
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              bottom: "calc(100% + 8px)",
              left: 0,
              minWidth: 200,
              background: "var(--vf-surface, #0E0E10)",
              border: "1px solid var(--vf-border, #1F1F22)",
              borderRadius: 12,
              padding: 8,
              color: "var(--vf-text, #F2F2F2)",
              boxShadow: "0 18px 42px rgba(0,0,0,0.5)",
            }}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => { toggleMode(); setMenuOpen(false); }}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 10px",
                borderRadius: 8,
                background: "transparent",
                border: "none",
                color: "inherit",
                cursor: "pointer",
                fontSize: 13,
                textAlign: "left",
              }}
            >
              <span>Viewfinder mode</span>
              <span
                className="vf-mono"
                style={{
                  opacity: 0.7,
                  color: active ? (gel || "var(--vf-project, #D4A862)") : "inherit",
                }}
              >
                {active ? "ON" : "OFF"}
              </span>
            </button>
            {active && (
              <div style={{ padding: "6px 10px" }}>
                <p
                  className="vf-mono"
                  style={{
                    margin: "4px 0 8px",
                    fontSize: 10,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    opacity: 0.5,
                  }}
                >
                  Gel
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {GELS.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      aria-label={g.label}
                      title={g.label}
                      onClick={() => setGel(g.hex)}
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: `1.5px solid ${gel === g.hex ? "#fff" : "transparent"}`,
                        background: g.hex,
                        cursor: "pointer",
                        padding: 0,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
