"use client";

import { useCallback, useRef } from "react";
import { useReducedMotion } from "./useReducedMotion";

interface Options {
  max?: number;   // max rotation in degrees
  scale?: number; // hover scale
}

// Cursor-driven 3D tilt. Returns ref + event handlers to spread on a container.
// Honors prefers-reduced-motion by returning no-op handlers.
export function useTilt({ max = 4, scale = 1.015 }: Options = {}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();

  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (reduced || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const rx = (0.5 - y) * max * 2;
    const ry = (x - 0.5) * max * 2;
    ref.current.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) scale(${scale})`;
  }, [max, scale, reduced]);

  const onLeave = useCallback(() => {
    if (!ref.current) return;
    ref.current.style.transform = "rotateX(0deg) rotateY(0deg) scale(1)";
  }, []);

  return { ref, onMouseMove: onMove, onMouseLeave: onLeave, disabled: reduced };
}
