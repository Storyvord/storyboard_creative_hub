"use client";

import React from "react";

interface Props {
  size?: number;
  color?: string;
  label?: string;
}

// 35mm-perforation loader. Replaces the spinning circle for long-running
// operations (uploads, AI generation). Advances one frame at a time via a
// CSS stepped animation — no continuous rotation.
export default function SprocketLoader({ size = 28, color = "currentColor", label }: Props) {
  const perfW = size * 0.22;
  const perfH = size * 0.14;
  const gap = size * 0.08;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10, color }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <rect
          x={0}
          y={0}
          width={size}
          height={size}
          rx={3}
          fill="none"
          stroke={color}
          strokeOpacity={0.25}
          strokeWidth={1}
        />
        <g className="vf-sprocket-track" style={{ transformOrigin: "center" }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <rect
              key={i}
              x={(size - perfW) / 2}
              y={gap + i * (perfH + gap)}
              width={perfW}
              height={perfH}
              rx={1.5}
              fill={color}
              opacity={0.35 + i * 0.14}
            />
          ))}
        </g>
      </svg>
      {label && (
        <span className="vf-mono" style={{ letterSpacing: "0.04em", opacity: 0.8 }}>
          {label}
        </span>
      )}
    </div>
  );
}
