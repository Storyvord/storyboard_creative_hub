"use client";

import React from "react";
import { useViewfinder } from "@/context/ViewfinderContext";

// Camera-style overlay: cinemascope 2.39:1 bars, rule-of-thirds grid, safe
// action (90%) and safe title (80%) zones. Draw-only, no interaction.
// Toggle via the pill popover or Shift+G.
//
// The bars are positioned inside the viewport by computing where a 2.39:1
// frame would sit vertically. Rendering math runs once per resize.
export default function CompositionGuides() {
  const { mode, compositionVisible } = useViewfinder();
  const active = mode === "on" && compositionVisible;

  if (!active) return null;

  return (
    <div
      aria-hidden
      className="vf-comp"
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 36,
      }}
    >
      {/* 2.39:1 Cinemascope bars — computed off viewport aspect ratio */}
      <CinemascopeBars />

      {/* Rule-of-thirds grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(to right, transparent 33.3%, rgba(255,255,255,0.18) 33.3%, rgba(255,255,255,0.18) calc(33.3% + 1px), transparent calc(33.3% + 1px),
                                   transparent 66.6%, rgba(255,255,255,0.18) 66.6%, rgba(255,255,255,0.18) calc(66.6% + 1px), transparent calc(66.6% + 1px)),
            linear-gradient(to bottom, transparent 33.3%, rgba(255,255,255,0.18) 33.3%, rgba(255,255,255,0.18) calc(33.3% + 1px), transparent calc(33.3% + 1px),
                                     transparent 66.6%, rgba(255,255,255,0.18) 66.6%, rgba(255,255,255,0.18) calc(66.6% + 1px), transparent calc(66.6% + 1px))
          `,
        }}
      />

      {/* Safe action (90%) */}
      <SafeZone pct={0.9} label="SAFE ACTION" />
      {/* Safe title (80%) */}
      <SafeZone pct={0.8} label="SAFE TITLE" dashed />

      {/* Centre cross */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          transform: "translate(-50%, -50%)",
          width: 14,
          height: 14,
        }}
      >
        <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: "rgba(255,255,255,0.4)" }} />
        <div style={{ position: "absolute", top: 0, bottom: 0, left: "50%", width: 1, background: "rgba(255,255,255,0.4)" }} />
      </div>

      {/* Aspect label, bottom-right of the inner frame */}
      <div
        className="vf-comp-label"
        style={{
          position: "absolute",
          right: 10,
          bottom: 10,
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 9,
          letterSpacing: "0.22em",
          color: "rgba(255,255,255,0.55)",
          textShadow: "0 1px 2px rgba(0,0,0,0.55)",
        }}
      >
        2.39 : 1  ·  THIRDS  ·  SAFE 80/90
      </div>
    </div>
  );
}

function CinemascopeBars() {
  // Letterbox bars — black top/bottom where the 2.39:1 rectangle doesn't reach.
  // We size them by viewport aspect ratio; computed via CSS `aspect-ratio`
  // and flexbox so no JS resize handler is needed.
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "stretch",
          pointerEvents: "none",
        }}
      >
        <div style={{ flex: 1, background: "rgba(0,0,0,0.42)", borderBottom: "1px solid rgba(255,255,255,0.12)" }} />
        <div
          style={{
            aspectRatio: "2.39 / 1",
            width: "100%",
            background: "transparent",
            border: "1px solid rgba(255,255,255,0.18)",
          }}
        />
        <div style={{ flex: 1, background: "rgba(0,0,0,0.42)", borderTop: "1px solid rgba(255,255,255,0.12)" }} />
      </div>
    </>
  );
}

function SafeZone({ pct, label, dashed = false }: { pct: number; label: string; dashed?: boolean }) {
  const inset = (1 - pct) / 2;
  return (
    <div
      style={{
        position: "absolute",
        top: `${inset * 100}%`,
        left: `${inset * 100}%`,
        right: `${inset * 100}%`,
        bottom: `${inset * 100}%`,
        border: `1px ${dashed ? "dashed" : "solid"} rgba(255,255,255,0.22)`,
      }}
      aria-label={label}
    />
  );
}
