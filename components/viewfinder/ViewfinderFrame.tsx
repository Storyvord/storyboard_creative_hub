"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useViewfinder } from "@/context/ViewfinderContext";
import { useKeyChord } from "@/hooks/useKeyChord";
import CommandPalette from "./CommandPalette";
import SaveIndicator from "./SaveIndicator";
import ViewfinderPill from "./ViewfinderPill";

// Mount the AI widget globally so ⌘K → "Ask the 1st AD" works on every route.
// It was previously mounted inside /projects/[id]/layout.tsx only; we remove
// the duplicate there in the same commit.
const AIAssistantWidget = dynamic(() => import("@/components/AIAssistantWidget"), { ssr: false });

// Global frame for Viewfinder mode. Wraps the app shell. Adds:
//  - vignette overlay
//  - ⌘K / Ctrl-K chord for the command palette
//  - global portals: CommandPalette, SaveIndicator, ViewfinderPill
// When Viewfinder mode is off, we still mount SaveIndicator + the toggle pill
// but skip the vignette so the rest of the app looks unchanged.
export default function ViewfinderFrame({ children }: { children: React.ReactNode }) {
  const { mode, paletteOpen, setPaletteOpen } = useViewfinder();
  const active = mode === "on";

  useKeyChord(
    { key: "k", meta: true },
    (e) => { e.preventDefault(); setPaletteOpen(!paletteOpen); },
  );

  return (
    <>
      {children}
      {active && <div className="vf-vignette" aria-hidden />}
      <SaveIndicator />
      <CommandPalette />
      <ViewfinderPill />
      <AIAssistantWidget />
    </>
  );
}
