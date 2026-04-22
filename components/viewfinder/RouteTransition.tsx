"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useViewfinder } from "@/context/ViewfinderContext";
import { useReducedMotion } from "@/hooks/useReducedMotion";

// Wraps route children with:
//   - iris-in animation on every pathname change (cinematic page reveal)
//   - rack-focus blur when the command palette or assistant is open
// Both are no-ops when Viewfinder mode is off OR prefers-reduced-motion.
export default function RouteTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { mode, paletteOpen, assistantOpen } = useViewfinder();
  const reduced = useReducedMotion();
  const [irisKey, setIrisKey] = useState(pathname);
  const first = useRef(true);

  useEffect(() => {
    // Skip the first tick so SSR content doesn't re-animate on hydration.
    if (first.current) { first.current = false; return; }
    setIrisKey(pathname);
  }, [pathname]);

  const active = mode === "on" && !reduced;
  const rack = active && (paletteOpen || assistantOpen);

  return (
    <div
      key={active ? irisKey : "static"}
      className={[
        "vf-rack-target",
        active ? "vf-iris-in" : "",
        rack ? "vf-rack-active" : "",
      ].filter(Boolean).join(" ")}
    >
      {children}
    </div>
  );
}
