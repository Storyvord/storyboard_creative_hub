"use client";

import { useEffect } from "react";

interface Chord {
  key: string;
  meta?: boolean;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
}

// Listens for a keyboard chord globally and fires `handler` when matched.
// Supports meta (⌘) OR ctrl interchangeably when `meta: true` is set, so the
// same binding works on macOS and other platforms.
export function useKeyChord(chord: Chord, handler: (e: KeyboardEvent) => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== chord.key.toLowerCase()) return;
      const wantsModifier = chord.meta || chord.ctrl;
      const hasModifier = e.metaKey || e.ctrlKey;
      if (wantsModifier && !hasModifier) return;
      if (!wantsModifier && hasModifier) return;
      if (chord.shift && !e.shiftKey) return;
      if (!chord.shift && e.shiftKey) return;
      if (chord.alt && !e.altKey) return;
      handler(e);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [chord.key, chord.meta, chord.ctrl, chord.shift, chord.alt, handler, enabled]);
}
