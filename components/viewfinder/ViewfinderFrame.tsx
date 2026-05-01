"use client";

import React from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useViewfinder } from "@/context/ViewfinderContext";
import { useKeyChord } from "@/hooks/useKeyChord";
import CommandPalette from "./CommandPalette";
import CompositionGuides from "./CompositionGuides";
import ProductionHUD from "./ProductionHUD";
import RouteTransition from "./RouteTransition";
import SaveIndicator from "./SaveIndicator";
import ViewfinderPill from "./ViewfinderPill";

// Routes that should NOT mount any in-app widgets (AI assistant, command
// palette, viewfinder pill, save indicator, composition guides). These are
// public, pre-auth pages — landing + auth flows.
const PUBLIC_ROUTES = new Set(["/", "/login", "/register", "/reset-password"]);

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
  const {
    mode, paletteOpen, setPaletteOpen,
    bumpTake, resetTake, toggleComposition,
  } = useViewfinder();
  const active = mode === "on";
  const pathname = usePathname();
  const isPublic = !!pathname && PUBLIC_ROUTES.has(pathname);

  useKeyChord(
    { key: "k", meta: true },
    (e) => { e.preventDefault(); setPaletteOpen(!paletteOpen); },
    true,
    false, // ⌘K must work even inside inputs (standard palette convention)
  );

  // Filmmaker shortcuts — suppressed inside input / textarea so they never
  // fight with normal typing.
  useKeyChord({ key: "t", shift: true }, (e) => { e.preventDefault(); bumpTake(); }, active);
  useKeyChord({ key: "r", shift: true }, (e) => { e.preventDefault(); resetTake(); }, active);
  useKeyChord({ key: "g", shift: true }, (e) => { e.preventDefault(); toggleComposition(); }, active);

  // Public pages render with no in-app chrome. Keeps the landing/auth flow
  // free of the AI Coproducer, ⌘K palette, viewfinder pill, etc.
  if (isPublic) {
    return <RouteTransition>{children}</RouteTransition>;
  }

  return (
    <>
      <RouteTransition>{children}</RouteTransition>
      {active && (
        <>
          <div className="vf-grain" aria-hidden />
          <div className="vf-vignette" aria-hidden />
        </>
      )}
      <CompositionGuides />
      <ProductionHUD />
      <SaveIndicator />
      <CommandPalette />
      <ViewfinderPill />
      <AIAssistantWidget />
    </>
  );
}
