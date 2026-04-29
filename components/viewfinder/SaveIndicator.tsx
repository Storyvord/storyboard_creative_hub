"use client";

import React, { useEffect, useState } from "react";

// A single white record-indicator that pulses once and resolves — no toast
// stack, no copy. Imperatively triggered via the global
// `viewfinder:record` event with an optional label.
//
//    window.dispatchEvent(new CustomEvent("viewfinder:record", {
//      detail: { label: "saved" }
//    }));
export default function SaveIndicator() {
  const [items, setItems] = useState<Array<{ id: number; label?: string }>>([]);

  useEffect(() => {
    const onEvent = (e: Event) => {
      const detail = (e as CustomEvent).detail ?? {};
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { id, label: detail.label }]);
      window.setTimeout(() => {
        setItems((prev) => prev.filter((x) => x.id !== id));
      }, 1200);
    };
    window.addEventListener("viewfinder:record", onEvent);
    return () => window.removeEventListener("viewfinder:record", onEvent);
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        left: 24,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        zIndex: 50,
        pointerEvents: "none",
      }}
    >
      {items.map((item) => (
        <div
          key={item.id}
          className="vf-record vf-mono"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            color: "var(--vf-text, #fff)",
            fontSize: 11,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              background: "#fff",
            }}
          />
          {item.label ?? ""}
        </div>
      ))}
    </div>
  );
}
