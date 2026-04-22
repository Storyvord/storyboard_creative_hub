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
});

const MODE_KEY = "vf-mode";
const GEL_KEY  = "vf-gel";

export function ViewfinderProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<Mode>("off");
  const [gel, setGelState] = useState<string>(GELS[0].hex);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

  // Sync from DOM on mount (the inline script in layout.tsx sets the attribute
  // before React hydrates so we avoid a flash).
  useEffect(() => {
    const attr = document.documentElement.getAttribute("data-viewfinder");
    if (attr === "on") setMode("on");
    try {
      const storedGel = localStorage.getItem(GEL_KEY);
      if (storedGel) {
        setGelState(storedGel);
        document.documentElement.style.setProperty("--vf-project", storedGel);
      }
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

  const value = useMemo<Ctx>(() => ({
    mode, toggleMode, gel, setGel,
    paletteOpen, setPaletteOpen,
    assistantOpen, openAssistant, closeAssistant,
  }), [mode, toggleMode, gel, setGel, paletteOpen, assistantOpen, openAssistant, closeAssistant]);

  return <ViewfinderContext.Provider value={value}>{children}</ViewfinderContext.Provider>;
}

export function useViewfinder() {
  return useContext(ViewfinderContext);
}
