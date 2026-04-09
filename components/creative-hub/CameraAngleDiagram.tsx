"use client";

import { ReactElement } from "react";

// Inline SVG diagrams illustrating each camera angle's framing.
// Used as fallback when no reference_image is available from the backend.

const diagrams: Record<string, ReactElement> = {
  "Eye Level": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#111" />
      {/* Ground */}
      <line x1="0" y1="60" x2="120" y2="60" stroke="#333" strokeWidth="1" />
      {/* Subject */}
      <rect x="52" y="30" width="16" height="30" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <circle cx="60" cy="24" r="7" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      {/* Camera */}
      <rect x="12" y="36" width="14" height="10" rx="2" fill="#1a6b3a" />
      <circle cx="30" cy="41" r="3" fill="#0d4726" />
      {/* Arrow — horizontal */}
      <line x1="32" y1="41" x2="50" y2="41" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#ah)" />
      <defs>
        <marker id="ah" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
        </marker>
      </defs>
      <text x="60" y="76" textAnchor="middle" fill="#555" fontSize="7" fontFamily="sans-serif">Eye Level</text>
    </svg>
  ),

  "Low Angle": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#111" />
      <line x1="0" y1="68" x2="120" y2="68" stroke="#333" strokeWidth="1" />
      <rect x="52" y="20" width="16" height="48" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <circle cx="60" cy="14" r="7" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      {/* Camera low */}
      <rect x="10" y="58" width="14" height="10" rx="2" fill="#1a6b3a" />
      <circle cx="28" cy="63" r="3" fill="#0d4726" />
      {/* Arrow — angled up */}
      <line x1="30" y1="61" x2="50" y2="35" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#al)" />
      <defs>
        <marker id="al" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
        </marker>
      </defs>
      <text x="60" y="77" textAnchor="middle" fill="#555" fontSize="7" fontFamily="sans-serif">Low Angle</text>
    </svg>
  ),

  "High Angle": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#111" />
      <line x1="0" y1="65" x2="120" y2="65" stroke="#333" strokeWidth="1" />
      <rect x="52" y="35" width="16" height="30" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <circle cx="60" cy="29" r="7" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      {/* Camera high */}
      <rect x="10" y="8" width="14" height="10" rx="2" fill="#1a6b3a" />
      <circle cx="28" cy="13" r="3" fill="#0d4726" />
      {/* Arrow — angled down */}
      <line x1="30" y1="15" x2="50" y2="38" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#aha)" />
      <defs>
        <marker id="aha" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
        </marker>
      </defs>
      <text x="60" y="76" textAnchor="middle" fill="#555" fontSize="7" fontFamily="sans-serif">High Angle</text>
    </svg>
  ),

  "Bird's Eye View": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#111" />
      {/* Top-down view of subject */}
      <ellipse cx="60" cy="55" rx="14" ry="10" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <circle cx="60" cy="45" r="7" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      {/* Camera directly above */}
      <rect x="53" y="8" width="14" height="10" rx="2" fill="#1a6b3a" />
      <circle cx="60" cy="22" r="3" fill="#0d4726" />
      {/* Arrow — straight down */}
      <line x1="60" y1="25" x2="60" y2="38" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#ab)" />
      <defs>
        <marker id="ab" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
        </marker>
      </defs>
      <text x="60" y="76" textAnchor="middle" fill="#555" fontSize="7" fontFamily="sans-serif">Bird's Eye View</text>
    </svg>
  ),

  "Worm's Eye View": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#111" />
      <line x1="0" y1="70" x2="120" y2="70" stroke="#333" strokeWidth="1" />
      <rect x="52" y="18" width="16" height="52" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <circle cx="60" cy="12" r="7" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      {/* Camera at ground looking up */}
      <rect x="53" y="60" width="14" height="10" rx="2" fill="#1a6b3a" transform="rotate(180 60 65)" />
      <circle cx="60" cy="56" r="3" fill="#0d4726" />
      {/* Arrow — straight up */}
      <line x1="60" y1="53" x2="60" y2="32" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#aw)" />
      <defs>
        <marker id="aw" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
        </marker>
      </defs>
      <text x="60" y="78" textAnchor="middle" fill="#555" fontSize="7" fontFamily="sans-serif">Worm's Eye View</text>
    </svg>
  ),

  "Aerial": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#0a1a0f" />
      {/* Ground landscape */}
      <rect x="0" y="45" width="120" height="35" fill="#111" />
      <rect x="10" y="48" width="20" height="14" rx="1" fill="#1a2a1a" stroke="#2a3a2a" strokeWidth="1" />
      <rect x="45" y="50" width="30" height="12" rx="1" fill="#1a2a1a" stroke="#2a3a2a" strokeWidth="1" />
      <rect x="88" y="47" width="18" height="18" rx="1" fill="#1a2a1a" stroke="#2a3a2a" strokeWidth="1" />
      {/* Drone/camera high */}
      <rect x="50" y="8" width="20" height="12" rx="2" fill="#1a6b3a" />
      {/* Drone arms */}
      <line x1="50" y1="10" x2="42" y2="6" stroke="#1a6b3a" strokeWidth="2" />
      <line x1="70" y1="10" x2="78" y2="6" stroke="#1a6b3a" strokeWidth="2" />
      <circle cx="41" cy="5" r="3" fill="#0d4726" />
      <circle cx="79" cy="5" r="3" fill="#0d4726" />
      <circle cx="60" cy="23" r="3" fill="#0d4726" />
      <line x1="60" y1="26" x2="60" y2="43" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#ad)" strokeDasharray="3,2" />
      <defs>
        <marker id="ad" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
        </marker>
      </defs>
      <text x="60" y="78" textAnchor="middle" fill="#555" fontSize="7" fontFamily="sans-serif">Aerial</text>
    </svg>
  ),

  "Overhead": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#111" />
      {/* Table/surface from above */}
      <rect x="25" y="30" width="70" height="40" rx="3" fill="#1a1a1a" stroke="#2a2a2a" strokeWidth="1" />
      <ellipse cx="60" cy="50" rx="12" ry="8" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      {/* Camera directly above, slight angle */}
      <rect x="53" y="6" width="14" height="10" rx="2" fill="#1a6b3a" />
      <circle cx="60" cy="20" r="3" fill="#0d4726" />
      <line x1="60" y1="23" x2="60" y2="41" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#ao)" />
      <defs>
        <marker id="ao" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
        </marker>
      </defs>
      <text x="60" y="76" textAnchor="middle" fill="#555" fontSize="7" fontFamily="sans-serif">Overhead</text>
    </svg>
  ),

  "Dutch Angle": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#111" />
      <line x1="0" y1="65" x2="120" y2="65" stroke="#333" strokeWidth="1" />
      <rect x="52" y="25" width="16" height="40" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <circle cx="60" cy="19" r="7" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      {/* Camera tilted */}
      <g transform="rotate(-25 22 42)">
        <rect x="10" y="37" width="14" height="10" rx="2" fill="#1a6b3a" />
        <circle cx="28" cy="42" r="3" fill="#0d4726" />
      </g>
      {/* Tilted arrow */}
      <line x1="29" y1="38" x2="50" y2="43" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#adu)" />
      <defs>
        <marker id="adu" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
        </marker>
      </defs>
      {/* Tilt indicator */}
      <text x="18" y="20" fill="#22c55e" fontSize="9" fontFamily="sans-serif">↺</text>
      <text x="60" y="76" textAnchor="middle" fill="#555" fontSize="7" fontFamily="sans-serif">Dutch Angle</text>
    </svg>
  ),

  "Over-The-Shoulder": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#111" />
      <line x1="0" y1="68" x2="120" y2="68" stroke="#333" strokeWidth="1" />
      {/* Foreground shoulder */}
      <path d="M 5 68 Q 5 45 25 38 L 35 38 Q 35 68 35 68 Z" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
      <circle cx="20" cy="32" r="8" fill="#1a1a1a" stroke="#333" strokeWidth="1" />
      {/* Subject in background */}
      <rect x="68" y="34" width="14" height="34" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <circle cx="75" cy="28" r="7" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      {/* Camera */}
      <rect x="38" y="34" width="12" height="8" rx="2" fill="#1a6b3a" />
      <line x1="50" y1="38" x2="67" y2="36" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#aots)" />
      <defs>
        <marker id="aots" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
        </marker>
      </defs>
      <text x="60" y="77" textAnchor="middle" fill="#555" fontSize="6.5" fontFamily="sans-serif">Over-The-Shoulder</text>
    </svg>
  ),

  "POV (Point of View)": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#111" />
      {/* Vignette frame suggesting eye view */}
      <ellipse cx="60" cy="40" rx="55" ry="35" fill="none" stroke="#1a1a1a" strokeWidth="14" />
      <line x1="0" y1="62" x2="120" y2="62" stroke="#222" strokeWidth="1" />
      {/* What the character sees — another person */}
      <rect x="50" y="28" width="20" height="34" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <circle cx="60" cy="22" r="8" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      {/* Eye crosshair */}
      <circle cx="60" cy="40" r="22" fill="none" stroke="#22c55e" strokeWidth="0.5" opacity="0.3" />
      <line x1="60" y1="10" x2="60" y2="70" stroke="#22c55e" strokeWidth="0.5" opacity="0.3" />
      <line x1="20" y1="40" x2="100" y2="40" stroke="#22c55e" strokeWidth="0.5" opacity="0.3" />
      <text x="60" y="77" textAnchor="middle" fill="#555" fontSize="7" fontFamily="sans-serif">POV</text>
    </svg>
  ),

  "Two Shot": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#111" />
      <line x1="0" y1="65" x2="120" y2="65" stroke="#333" strokeWidth="1" />
      {/* Two subjects */}
      <rect x="34" y="30" width="14" height="35" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <circle cx="41" cy="24" r="7" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <rect x="72" y="30" width="14" height="35" rx="2" fill="#2a2a2a" stroke="#3a3a3a" strokeWidth="1" />
      <circle cx="79" cy="24" r="7" fill="#2a2a2a" stroke="#3a3a3a" strokeWidth="1" />
      {/* Camera */}
      <rect x="8" y="36" width="14" height="10" rx="2" fill="#1a6b3a" />
      <circle cx="26" cy="41" r="3" fill="#0d4726" />
      <line x1="28" y1="41" x2="33" y2="41" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#ats)" />
      <defs>
        <marker id="ats" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
        </marker>
      </defs>
      {/* Frame bracket */}
      <rect x="28" y="15" width="64" height="55" rx="1" fill="none" stroke="#22c55e" strokeWidth="0.8" strokeDasharray="3,2" opacity="0.5" />
      <text x="60" y="76" textAnchor="middle" fill="#555" fontSize="7" fontFamily="sans-serif">Two Shot</text>
    </svg>
  ),

  "Cowboy Shot": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#111" />
      <line x1="0" y1="65" x2="120" y2="65" stroke="#333" strokeWidth="1" />
      {/* Subject — framed mid-thigh */}
      <rect x="50" y="22" width="20" height="43" rx="2" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      <circle cx="60" cy="16" r="7" fill="#2a2a2a" stroke="#444" strokeWidth="1" />
      {/* Frame line at mid-thigh */}
      <line x1="28" y1="55" x2="92" y2="55" stroke="#22c55e" strokeWidth="1" strokeDasharray="3,2" opacity="0.7" />
      {/* Camera */}
      <rect x="8" y="44" width="14" height="10" rx="2" fill="#1a6b3a" />
      <circle cx="26" cy="49" r="3" fill="#0d4726" />
      <line x1="28" y1="49" x2="49" y2="49" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#acs)" />
      <defs>
        <marker id="acs" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
          <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
        </marker>
      </defs>
      <text x="60" y="74" textAnchor="middle" fill="#555" fontSize="7" fontFamily="sans-serif">Cowboy Shot</text>
    </svg>
  ),

  "Extreme Close-Up": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#111" />
      {/* Cropped face filling frame */}
      <circle cx="60" cy="35" r="32" fill="#1e1e1e" stroke="#333" strokeWidth="1" />
      {/* Eyes */}
      <ellipse cx="46" cy="30" rx="7" ry="5" fill="#111" stroke="#444" strokeWidth="1" />
      <ellipse cx="74" cy="30" rx="7" ry="5" fill="#111" stroke="#444" strokeWidth="1" />
      <circle cx="46" cy="30" r="3" fill="#333" />
      <circle cx="74" cy="30" r="3" fill="#333" />
      {/* Nose */}
      <path d="M57 35 Q60 44 63 35" stroke="#333" strokeWidth="1" fill="none" />
      {/* Tight frame corners */}
      <path d="M2,2 L2,14 M2,2 L14,2" stroke="#22c55e" strokeWidth="1.5" fill="none" />
      <path d="M118,2 L118,14 M118,2 L106,2" stroke="#22c55e" strokeWidth="1.5" fill="none" />
      <path d="M2,78 L2,66 M2,78 L14,78" stroke="#22c55e" strokeWidth="1.5" fill="none" />
      <path d="M118,78 L118,66 M118,78 L106,78" stroke="#22c55e" strokeWidth="1.5" fill="none" />
      <text x="60" y="76" textAnchor="middle" fill="#555" fontSize="7" fontFamily="sans-serif">Extreme Close-Up</text>
    </svg>
  ),

  "Extreme Wide Shot": (
    <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="120" height="80" fill="#0a0f14" />
      {/* Sky */}
      <rect x="0" y="0" width="120" height="45" fill="#0d1520" />
      {/* Ground */}
      <rect x="0" y="45" width="120" height="35" fill="#111" />
      {/* Horizon mountains */}
      <path d="M0,45 Q20,28 35,42 Q50,30 65,42 Q80,25 95,40 Q108,32 120,42 L120,45 Z" fill="#161616" />
      {/* Tiny subject */}
      <rect x="58" y="41" width="4" height="8" rx="1" fill="#2a2a2a" />
      <circle cx="60" cy="39" r="2" fill="#2a2a2a" />
      {/* Wide frame brackets */}
      <path d="M4,4 L4,14 M4,4 L14,4" stroke="#22c55e" strokeWidth="1" fill="none" />
      <path d="M116,4 L116,14 M116,4 L106,4" stroke="#22c55e" strokeWidth="1" fill="none" />
      <path d="M4,76 L4,66 M4,76 L14,76" stroke="#22c55e" strokeWidth="1" fill="none" />
      <path d="M116,76 L116,66 M116,76 L106,76" stroke="#22c55e" strokeWidth="1" fill="none" />
      <text x="60" y="78" textAnchor="middle" fill="#555" fontSize="6.5" fontFamily="sans-serif">Extreme Wide Shot</text>
    </svg>
  ),
};

export function getCameraAngleDiagram(name: string): ReactElement | null {
  return diagrams[name] ?? null;
}
