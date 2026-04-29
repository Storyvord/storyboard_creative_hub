"use client";

import React, { useState } from "react";
import { Aperture, Command, Grid3x3, Moon, Sun, Clapperboard } from "lucide-react";
import { useViewfinder, GELS } from "@/context/ViewfinderContext";
import { useTheme } from "@/context/ThemeContext";

// Small, matte pill anchored bottom-left. Primary action: open palette.
// Popover exposes viewfinder mode, gel picker, composition guides, HUD
// visibility, and theme toggle.
export default function ViewfinderPill() {
  const {
    mode, toggleMode, setPaletteOpen, gel, setGel,
    hudVisible, toggleHud,
    compositionVisible, toggleComposition,
  } = useViewfinder();
  const { theme, toggleTheme } = useTheme();
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
            background: "color-mix(in srgb, var(--vf-surface, #141417) 80%, transparent)",
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
          aria-label={active ? "Viewfinder controls" : "Enable Viewfinder mode"}
          onClick={() => setMenuOpen((v) => !v)}
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 10,
            background: active
              ? "color-mix(in srgb, var(--vf-surface, #141417) 85%, transparent)"
              : "var(--surface-raised, #222)",
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
              minWidth: 240,
              background: "var(--vf-surface, #0E0E10)",
              border: "1px solid var(--vf-border, #1F1F22)",
              borderRadius: 12,
              padding: 8,
              color: "var(--vf-text, #F2F2F2)",
              boxShadow: "0 18px 42px rgba(0,0,0,0.5)",
            }}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <PopRow
              label="Viewfinder mode"
              status={active ? "ON" : "OFF"}
              statusColor={active ? (gel || "var(--vf-project, #D4A862)") : undefined}
              onClick={toggleMode}
            />

            {active && (
              <>
                <PopRow
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {theme === "dark" ? <Moon size={13} /> : <Sun size={13} />}
                      Theme
                    </span>
                  }
                  status={theme === "dark" ? "DARK" : "LIGHT"}
                  onClick={toggleTheme}
                />
                <PopRow
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Grid3x3 size={13} />
                      Composition guides
                    </span>
                  }
                  status={compositionVisible ? "ON" : "OFF"}
                  statusColor={compositionVisible ? (gel || "var(--vf-project, #D4A862)") : undefined}
                  onClick={toggleComposition}
                  hint="⇧G"
                />
                <PopRow
                  label={
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <Clapperboard size={13} />
                      Production slate
                    </span>
                  }
                  status={hudVisible ? "ON" : "OFF"}
                  statusColor={hudVisible ? (gel || "var(--vf-project, #D4A862)") : undefined}
                  onClick={toggleHud}
                />

                <div style={{ padding: "6px 10px" }}>
                  <p
                    className="vf-mono"
                    style={{
                      margin: "4px 0 8px",
                      fontSize: 10,
                      letterSpacing: "0.18em",
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
                          border: `1.5px solid ${gel === g.hex ? "var(--vf-text, #fff)" : "transparent"}`,
                          background: g.hex,
                          cursor: "pointer",
                          padding: 0,
                        }}
                      />
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    borderTop: "1px solid var(--vf-border, #1F1F22)",
                    margin: "6px 0 2px",
                    padding: "8px 10px 4px",
                    fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    color: "var(--vf-text-muted, #7A7A80)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <span>⇧T bump take · ⇧R reset</span>
                  <span>⇧G guides · ⌘K search</span>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function PopRow({
  label,
  status,
  statusColor,
  onClick,
  hint,
}: {
  label: React.ReactNode;
  status: string;
  statusColor?: string;
  onClick: () => void;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 10,
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
      <span>{label}</span>
      <span
        className="vf-mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          opacity: 0.8,
          color: statusColor ?? "inherit",
          fontSize: 10,
          letterSpacing: "0.14em",
        }}
      >
        {hint && <span style={{ opacity: 0.45 }}>{hint}</span>}
        {status}
      </span>
    </button>
  );
}
