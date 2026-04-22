"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type Mode = "on" | "off";
type Gel = { id: string; label: string; hex: string };

export const GELS: Gel[] = [
  { id: "tungsten", label: "Tungsten", hex: "#D4A862" },
  { id: "daylight", label: "Daylight", hex: "#E6E6EA" },
  { id: "magenta",  label: "Magenta",  hex: "#D46A9E" },
  { id: "steel",    label: "Steel",    hex: "#8AA4C2" },
  { id: "emerald",  label: "Emerald",  hex: "#6EC2A0" },
  { id: "rust",     label: "Rust",     hex: "#C06A3A" },
];

interface Ctx {
  mode: Mode;
  toggleMode: () => void;
  gel: string;
  setGel: (hex: string) => void;
  paletteOpen: boolean;
  setPaletteOpen: (v: boolean) => void;
  assistantOpen: boolean;
  openAssistant: (seed?: string) => void;
  closeAssistant: () => void;
  // Production HUD — filmmaker-native overlay always present while logged in.
  hudVisible: boolean;
  toggleHud: () => void;
  scene: string;                // editable slate scene id, e.g. "14A"
  setScene: (s: string) => void;
  take: number;
  setTake: (n: number) => void;
  bumpTake: () => void;
  resetTake: () => void;
  // Composition guides — cinemascope bars + thirds + safe zones overlay.
  compositionVisible: boolean;
  toggleComposition: () => void;
}

const ViewfinderContext = createContext<Ctx>({
  mode: "off",
  toggleMode: () => {},
  gel: GELS[0].hex,
  setGel: () => {},
  paletteOpen: false,
  setPaletteOpen: () => {},
  assistantOpen: false,
  openAssistant: () => {},
  closeAssistant: () => {},
  hudVisible: true,
  toggleHud: () => {},
  scene: "1",
  setScene: () => {},
  take: 1,
  setTake: () => {},
  bumpTake: () => {},
  resetTake: () => {},
  compositionVisible: false,
  toggleComposition: () => {},
});

const MODE_KEY  = "vf-mode";
const GEL_KEY   = "vf-gel";
const HUD_KEY   = "vf-hud";
const COMP_KEY  = "vf-comp";
const SCENE_KEY = "vf-scene";
const TAKE_KEY  = "vf-take";

export function ViewfinderProvider({ children }: { children: React.ReactNode }) {
  // Default to ON so first-time visitors land in Viewfinder mode. The early
  // script in app/layout.tsx already applied the attribute before hydration;
  // we just mirror it in state here.
  const [mode, setMode] = useState<Mode>("on");
  const [gel, setGelState] = useState<string>(GELS[0].hex);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [hudVisible, setHudVisible] = useState(true);
  const [compositionVisible, setCompositionVisible] = useState(false);
  const [scene, setSceneState] = useState("1");
  const [take, setTakeState] = useState(1);

  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-viewfinder");
    setMode(attr === "on" ? "on" : "off");
    try {
      const storedGel = localStorage.getItem(GEL_KEY);
      if (storedGel) {
        setGelState(storedGel);
        document.documentElement.style.setProperty("--vf-project", storedGel);
      }
      const storedHud = localStorage.getItem(HUD_KEY);
      if (storedHud === "off") setHudVisible(false);
      const storedComp = localStorage.getItem(COMP_KEY);
      if (storedComp === "on") setCompositionVisible(true);
      const storedScene = localStorage.getItem(SCENE_KEY);
      if (storedScene) setSceneState(storedScene);
      const storedTake = localStorage.getItem(TAKE_KEY);
      if (storedTake) setTakeState(parseInt(storedTake, 10) || 1);
    } catch {}
  }, []);

  const toggleMode = useCallback(() => {
    setMode((prev) => {
      const next: Mode = prev === "on" ? "off" : "on";
      document.documentElement.setAttribute("data-viewfinder", next);
      try { localStorage.setItem(MODE_KEY, next); } catch {}
      return next;
    });
  }, []);

  const setGel = useCallback((hex: string) => {
    setGelState(hex);
    document.documentElement.style.setProperty("--vf-project", hex);
    try { localStorage.setItem(GEL_KEY, hex); } catch {}
  }, []);

  const openAssistant = useCallback((seed?: string) => {
    setAssistantOpen(true);
    setPaletteOpen(false);
    // Bridge to the existing AIAssistantWidget via a DOM event — avoids
    // duplicating its chat logic. The widget listens on mount.
    window.dispatchEvent(new CustomEvent("viewfinder:open-assistant", { detail: { seed } }));
  }, []);

  const closeAssistant = useCallback(() => {
    setAssistantOpen(false);
    window.dispatchEvent(new CustomEvent("viewfinder:close-assistant"));
  }, []);

  // Keep context in sync with the widget's own open/close (e.g. user clicks
  // the X in the widget, or hits ESC). Without this, assistantOpen stays
  // stuck true and UI that conditions on it (pill state) drifts.
  useEffect(() => {
    const onOpened = () => setAssistantOpen(true);
    const onClosed = () => setAssistantOpen(false);
    window.addEventListener("viewfinder:assistant-opened", onOpened);
    window.addEventListener("viewfinder:assistant-closed", onClosed);
    return () => {
      window.removeEventListener("viewfinder:assistant-opened", onOpened);
      window.removeEventListener("viewfinder:assistant-closed", onClosed);
    };
  }, []);

  const toggleHud = useCallback(() => {
    setHudVisible((v) => {
      const next = !v;
      try { localStorage.setItem(HUD_KEY, next ? "on" : "off"); } catch {}
      return next;
    });
  }, []);

  const toggleComposition = useCallback(() => {
    setCompositionVisible((v) => {
      const next = !v;
      try { localStorage.setItem(COMP_KEY, next ? "on" : "off"); } catch {}
      return next;
    });
  }, []);

  const setScene = useCallback((s: string) => {
    setSceneState(s);
    try { localStorage.setItem(SCENE_KEY, s); } catch {}
  }, []);

  const setTake = useCallback((n: number) => {
    const clamped = Math.max(1, Math.min(999, Math.floor(n) || 1));
    setTakeState(clamped);
    try { localStorage.setItem(TAKE_KEY, String(clamped)); } catch {}
  }, []);

  const bumpTake = useCallback(() => {
    setTakeState((t) => {
      const next = Math.min(999, t + 1);
      try { localStorage.setItem(TAKE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const resetTake = useCallback(() => {
    setTakeState(1);
    try { localStorage.setItem(TAKE_KEY, "1"); } catch {}
  }, []);

  const value = useMemo<Ctx>(() => ({
    mode, toggleMode, gel, setGel,
    paletteOpen, setPaletteOpen,
    assistantOpen, openAssistant, closeAssistant,
    hudVisible, toggleHud,
    scene, setScene, take, setTake, bumpTake, resetTake,
    compositionVisible, toggleComposition,
  }), [
    mode, toggleMode, gel, setGel,
    paletteOpen, assistantOpen, openAssistant, closeAssistant,
    hudVisible, toggleHud,
    scene, setScene, take, setTake, bumpTake, resetTake,
    compositionVisible, toggleComposition,
  ]);

  return <ViewfinderContext.Provider value={value}>{children}</ViewfinderContext.Provider>;
}

export function useViewfinder() {
  return useContext(ViewfinderContext);
}
