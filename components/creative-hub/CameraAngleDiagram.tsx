"use client";

import { ReactElement } from "react";
import { useTheme } from "@/context/ThemeContext";

// Inline SVG diagrams illustrating each camera angle's framing.
// Colors adapt to the active light/dark theme.

interface DiagramColors {
  bg: string;
  ground: string;
  subject: string;
  subjectStroke: string;
  label: string;
  skyBg: string;
  groundFill: string;
  mountains: string;
}

function darkColors(): DiagramColors {
  return {
    bg: "#111111",
    ground: "#333333",
    subject: "#2a2a2a",
    subjectStroke: "#444444",
    label: "#666666",
    skyBg: "#0d1520",
    groundFill: "#111111",
    mountains: "#161616",
  };
}

function lightColors(): DiagramColors {
  return {
    bg: "#f5f5f5",
    ground: "#cccccc",
    subject: "#d0d0d0",
    subjectStroke: "#999999",
    label: "#666666",
    skyBg: "#ddeeff",
    groundFill: "#e8e8e8",
    mountains: "#d4d4d4",
  };
}

function buildDiagrams(c: DiagramColors): Record<string, ReactElement> {
  return {
    "Eye Level": (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill={c.bg} />
        <line x1="0" y1="60" x2="120" y2="60" stroke={c.ground} strokeWidth="1" />
        <rect x="52" y="30" width="16" height="30" rx="2" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <circle cx="60" cy="24" r="7" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <rect x="12" y="36" width="14" height="10" rx="2" fill="#1a6b3a" />
        <circle cx="30" cy="41" r="3" fill="#0d4726" />
        <line x1="32" y1="41" x2="50" y2="41" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#ah)" />
        <defs>
          <marker id="ah" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
          </marker>
        </defs>
        <text x="60" y="76" textAnchor="middle" fill={c.label} fontSize="7" fontFamily="sans-serif">Eye Level</text>
      </svg>
    ),

    "Low Angle": (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill={c.bg} />
        <line x1="0" y1="68" x2="120" y2="68" stroke={c.ground} strokeWidth="1" />
        <rect x="52" y="20" width="16" height="48" rx="2" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <circle cx="60" cy="14" r="7" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <rect x="10" y="58" width="14" height="10" rx="2" fill="#1a6b3a" />
        <circle cx="28" cy="63" r="3" fill="#0d4726" />
        <line x1="30" y1="61" x2="50" y2="35" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#al)" />
        <defs>
          <marker id="al" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
          </marker>
        </defs>
        <text x="60" y="77" textAnchor="middle" fill={c.label} fontSize="7" fontFamily="sans-serif">Low Angle</text>
      </svg>
    ),

    "High Angle": (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill={c.bg} />
        <line x1="0" y1="65" x2="120" y2="65" stroke={c.ground} strokeWidth="1" />
        <rect x="52" y="35" width="16" height="30" rx="2" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <circle cx="60" cy="29" r="7" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <rect x="10" y="8" width="14" height="10" rx="2" fill="#1a6b3a" />
        <circle cx="28" cy="13" r="3" fill="#0d4726" />
        <line x1="30" y1="15" x2="50" y2="38" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#aha)" />
        <defs>
          <marker id="aha" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
          </marker>
        </defs>
        <text x="60" y="76" textAnchor="middle" fill={c.label} fontSize="7" fontFamily="sans-serif">High Angle</text>
      </svg>
    ),

    "Bird's Eye View": (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill={c.bg} />
        <ellipse cx="60" cy="55" rx="14" ry="10" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <circle cx="60" cy="45" r="7" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <rect x="53" y="8" width="14" height="10" rx="2" fill="#1a6b3a" />
        <circle cx="60" cy="22" r="3" fill="#0d4726" />
        <line x1="60" y1="25" x2="60" y2="38" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#ab)" />
        <defs>
          <marker id="ab" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
          </marker>
        </defs>
        <text x="60" y="76" textAnchor="middle" fill={c.label} fontSize="7" fontFamily="sans-serif">Bird&apos;s Eye View</text>
      </svg>
    ),

    "Worm's Eye View": (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill={c.bg} />
        <line x1="0" y1="70" x2="120" y2="70" stroke={c.ground} strokeWidth="1" />
        <rect x="52" y="18" width="16" height="52" rx="2" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <circle cx="60" cy="12" r="7" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <rect x="53" y="60" width="14" height="10" rx="2" fill="#1a6b3a" transform="rotate(180 60 65)" />
        <circle cx="60" cy="56" r="3" fill="#0d4726" />
        <line x1="60" y1="53" x2="60" y2="32" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#aw)" />
        <defs>
          <marker id="aw" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
          </marker>
        </defs>
        <text x="60" y="78" textAnchor="middle" fill={c.label} fontSize="7" fontFamily="sans-serif">Worm&apos;s Eye View</text>
      </svg>
    ),

    "Aerial": (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill={c.skyBg} />
        <rect x="0" y="45" width="120" height="35" fill={c.groundFill} />
        <rect x="10" y="48" width="20" height="14" rx="1" fill={c.mountains} stroke={c.ground} strokeWidth="1" />
        <rect x="45" y="50" width="30" height="12" rx="1" fill={c.mountains} stroke={c.ground} strokeWidth="1" />
        <rect x="88" y="47" width="18" height="18" rx="1" fill={c.mountains} stroke={c.ground} strokeWidth="1" />
        <rect x="50" y="8" width="20" height="12" rx="2" fill="#1a6b3a" />
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
        <text x="60" y="78" textAnchor="middle" fill={c.label} fontSize="7" fontFamily="sans-serif">Aerial</text>
      </svg>
    ),

    "Overhead": (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill={c.bg} />
        <rect x="25" y="30" width="70" height="40" rx="3" fill={c.subject} stroke={c.ground} strokeWidth="1" />
        <ellipse cx="60" cy="50" rx="12" ry="8" fill={c.subjectStroke} stroke={c.subjectStroke} strokeWidth="1" />
        <rect x="53" y="6" width="14" height="10" rx="2" fill="#1a6b3a" />
        <circle cx="60" cy="20" r="3" fill="#0d4726" />
        <line x1="60" y1="23" x2="60" y2="41" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#ao)" />
        <defs>
          <marker id="ao" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
          </marker>
        </defs>
        <text x="60" y="76" textAnchor="middle" fill={c.label} fontSize="7" fontFamily="sans-serif">Overhead</text>
      </svg>
    ),

    "Dutch Angle": (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill={c.bg} />
        <line x1="0" y1="65" x2="120" y2="65" stroke={c.ground} strokeWidth="1" />
        <rect x="52" y="25" width="16" height="40" rx="2" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <circle cx="60" cy="19" r="7" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <g transform="rotate(-25 22 42)">
          <rect x="10" y="37" width="14" height="10" rx="2" fill="#1a6b3a" />
          <circle cx="28" cy="42" r="3" fill="#0d4726" />
        </g>
        <line x1="29" y1="38" x2="50" y2="43" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#adu)" />
        <defs>
          <marker id="adu" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
          </marker>
        </defs>
        <text x="18" y="20" fill="#22c55e" fontSize="9" fontFamily="sans-serif">↺</text>
        <text x="60" y="76" textAnchor="middle" fill={c.label} fontSize="7" fontFamily="sans-serif">Dutch Angle</text>
      </svg>
    ),

    "Shoulder-Level": (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill={c.bg} />
        <line x1="0" y1="62" x2="120" y2="62" stroke={c.ground} strokeWidth="1" />
        <rect x="52" y="25" width="16" height="37" rx="2" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <circle cx="60" cy="19" r="7" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        {/* Camera at shoulder height (~70% of subject) */}
        <rect x="12" y="33" width="14" height="10" rx="2" fill="#1a6b3a" />
        <circle cx="30" cy="38" r="3" fill="#0d4726" />
        <line x1="32" y1="38" x2="50" y2="38" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#asl)" />
        <defs>
          <marker id="asl" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
          </marker>
        </defs>
        <text x="60" y="76" textAnchor="middle" fill={c.label} fontSize="7" fontFamily="sans-serif">Shoulder-Level</text>
      </svg>
    ),

    "Hip-Level": (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill={c.bg} />
        <line x1="0" y1="62" x2="120" y2="62" stroke={c.ground} strokeWidth="1" />
        <rect x="52" y="22" width="16" height="40" rx="2" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <circle cx="60" cy="16" r="7" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        {/* Camera at hip height (~50% of subject) */}
        <rect x="10" y="50" width="14" height="10" rx="2" fill="#1a6b3a" />
        <circle cx="28" cy="55" r="3" fill="#0d4726" />
        <line x1="30" y1="53" x2="50" y2="42" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#ahl)" />
        <defs>
          <marker id="ahl" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
          </marker>
        </defs>
        <text x="60" y="76" textAnchor="middle" fill={c.label} fontSize="7" fontFamily="sans-serif">Hip-Level</text>
      </svg>
    ),

    "Ground-Level": (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill={c.bg} />
        <line x1="0" y1="64" x2="120" y2="64" stroke={c.ground} strokeWidth="1" />
        <rect x="52" y="14" width="16" height="50" rx="2" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <circle cx="60" cy="8" r="7" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        {/* Camera near ground */}
        <rect x="10" y="58" width="14" height="8" rx="2" fill="#1a6b3a" />
        <circle cx="28" cy="62" r="3" fill="#0d4726" />
        <line x1="30" y1="61" x2="50" y2="59" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#agl)" />
        <defs>
          <marker id="agl" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
          </marker>
        </defs>
        <text x="60" y="76" textAnchor="middle" fill={c.label} fontSize="7" fontFamily="sans-serif">Ground-Level</text>
      </svg>
    ),

    "Oblique Angle": (
      <svg viewBox="0 0 120 80" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        <rect width="120" height="80" fill={c.bg} />
        <line x1="0" y1="65" x2="120" y2="65" stroke={c.ground} strokeWidth="1" />
        <rect x="52" y="25" width="16" height="40" rx="2" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        <circle cx="60" cy="19" r="7" fill={c.subject} stroke={c.subjectStroke} strokeWidth="1" />
        {/* Camera subtly tilted 15° — less than Dutch Angle */}
        <g transform="rotate(-15 22 42)">
          <rect x="10" y="37" width="14" height="10" rx="2" fill="#1a6b3a" />
          <circle cx="28" cy="42" r="3" fill="#0d4726" />
        </g>
        <line x1="29" y1="38" x2="50" y2="41" stroke="#22c55e" strokeWidth="1.5" markerEnd="url(#aob)" />
        <defs>
          <marker id="aob" markerWidth="6" markerHeight="6" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#22c55e" />
          </marker>
        </defs>
        <text x="18" y="22" fill="#22c55e" fontSize="8" fontFamily="sans-serif">↺</text>
        <text x="26" y="16" fill="#22c55e" fontSize="6" fontFamily="sans-serif">15°</text>
        <text x="60" y="76" textAnchor="middle" fill={c.label} fontSize="7" fontFamily="sans-serif">Oblique Angle</text>
      </svg>
    ),
  };
}

export function getCameraAngleDiagram(name: string): ReactElement | null {
  // This hook-based wrapper is used inside the component tree where hooks are valid.
  // For static usage outside React, fall back to dark.
  return buildDiagrams(darkColors())[name] ?? null;
}

export function CameraAngleDiagramThemed({ name }: { name: string }): ReactElement | null {
  const { theme } = useTheme();
  const c = theme === "light" ? lightColors() : darkColors();
  return buildDiagrams(c)[name] ?? null;
}
