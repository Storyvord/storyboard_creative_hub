"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, usePathname } from "next/navigation";
import { ChevronDown, ChevronUp, Minus, Plus, RotateCcw } from "lucide-react";
import { useViewfinder } from "@/context/ViewfinderContext";
import { getProject } from "@/services/project";
import { Project } from "@/types/project";

const HIDE_ON = ["/login", "/register", "/reset-password", "/landing"];

function useClock() {
  // Start as null so SSR and first client render agree (no current time shown
  // until after mount). Prevents hydration mismatches on the timecode string.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function formatTimecode(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatTz(d: Date) {
  // Short TZ abbreviation (best-effort from Intl).
  try {
    const match = d
      .toLocaleTimeString(undefined, { timeZoneName: "short" })
      .match(/\b([A-Z]{2,5})\b\s*$/);
    return match ? match[1] : "";
  } catch {
    return "";
  }
}

function daysBetween(a: Date, b: Date) {
  const ms = b.setHours(0, 0, 0, 0) - a.setHours(0, 0, 0, 0);
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export default function ProductionHUD() {
  const { mode, hudVisible, scene, setScene, take, setTake, bumpTake, resetTake, gel } = useViewfinder();
  const pathname = usePathname();
  const params = useParams();
  const projectId = typeof params?.projectId === "string" ? params.projectId : undefined;
  const now = useClock();

  const [collapsed, setCollapsed] = useState(false);
  const [project, setProject] = useState<Project | null>(null);
  const [editingScene, setEditingScene] = useState(false);

  // Fetch project whenever the route has a projectId.
  useEffect(() => {
    if (!projectId) { setProject(null); return; }
    let cancelled = false;
    getProject(projectId)
      .then((p) => { if (!cancelled) setProject(p); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [projectId]);

  const dayNumber = useMemo(() => {
    if (!project?.created_at) return null;
    return daysBetween(new Date(project.created_at), new Date());
  }, [project?.created_at]);

  const hidden =
    mode !== "on" ||
    !hudVisible ||
    HIDE_ON.some((p) => pathname.startsWith(p));
  if (hidden) return null;

  const projectLabel = project?.name?.toUpperCase() || "STORYVORD · CREATIVE HUB";
  const tc = now ? formatTimecode(now) : "--:--:--";
  const tz = now ? formatTz(now) : "";

  const stripeColors = "repeating-linear-gradient(135deg, #F2F2F2 0 8px, #0A0A0A 8px 16px)";

  return (
    <aside
      aria-label="Production slate"
      className="vf-hud-root"
      style={{
        position: "fixed",
        right: 24,
        bottom: 24,
        zIndex: 46,
        minWidth: collapsed ? 0 : 280,
        background: "var(--vf-surface, #0E0E10)",
        color: "var(--vf-text, #F2F2F2)",
        border: "1px solid var(--vf-border, #1F1F22)",
        borderRadius: 12,
        boxShadow: "0 18px 44px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255,255,255,0.03) inset",
        fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
        overflow: "hidden",
        userSelect: "none",
      }}
    >
      {/* Slate header with classic diagonal hatch band */}
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          height: 28,
          borderBottom: "1px solid var(--vf-border, #1F1F22)",
          background: "var(--vf-surface-raised, #141417)",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 44,
            background: stripeColors,
            borderRight: "1px solid var(--vf-border, #1F1F22)",
          }}
        />
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            padding: "0 10px",
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "var(--vf-text, #F2F2F2)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {projectLabel}
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          aria-label={collapsed ? "Expand production slate" : "Collapse production slate"}
          style={{
            width: 28,
            background: "transparent",
            border: "none",
            color: "var(--vf-text-muted, #7A7A80)",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {collapsed ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Body */}
      {!collapsed && (
        <div style={{ padding: "12px 14px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 14, alignItems: "start" }}>
            <HudField
              label="DAY"
              value={dayNumber !== null ? String(dayNumber).padStart(2, "0") : "—"}
              accent
              gelHex={gel}
            />
            <HudField
              label="SCENE"
              value={
                editingScene ? (
                  <input
                    autoFocus
                    value={scene}
                    onChange={(e) => setScene(e.target.value.toUpperCase().slice(0, 6))}
                    onBlur={() => setEditingScene(false)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === "Escape") { e.currentTarget.blur(); } }}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      outline: "none",
                      color: "inherit",
                      font: "inherit",
                      fontSize: 20,
                      fontWeight: 600,
                      padding: 0,
                    }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => setEditingScene(true)}
                    aria-label="Edit scene"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "inherit",
                      cursor: "text",
                      padding: 0,
                      font: "inherit",
                      fontSize: 20,
                      fontWeight: 600,
                    }}
                  >
                    {scene || "—"}
                  </button>
                )
              }
            />
            <HudField
              label="TAKE"
              value={
                <span style={{ fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>
                  {String(take).padStart(2, "0")}
                </span>
              }
            />
          </div>

          {/* Take controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              type="button"
              onClick={() => setTake(take - 1)}
              aria-label="Decrement take"
              className="vf-hud-btn"
            >
              <Minus size={12} />
            </button>
            <button
              type="button"
              onClick={bumpTake}
              aria-label="Bump take (Shift+T)"
              className="vf-hud-btn"
              style={{ color: gel }}
            >
              <Plus size={12} />
              <span style={{ marginLeft: 6, fontSize: 10, letterSpacing: "0.14em" }}>T+</span>
            </button>
            <button
              type="button"
              onClick={resetTake}
              aria-label="Reset take to 1 (Shift+R)"
              className="vf-hud-btn"
            >
              <RotateCcw size={12} />
            </button>
            <div style={{ flex: 1 }} />
            <span
              style={{
                fontSize: 10,
                letterSpacing: "0.18em",
                color: "var(--vf-text-muted, #7A7A80)",
              }}
            >
              {tc} {tz && <span style={{ opacity: 0.6 }}>{tz}</span>}
            </span>
          </div>

          {/* Action strip — live day-of-shoot cue (today's intent) */}
          <div
            style={{
              marginTop: 2,
              padding: "8px 10px",
              borderRadius: 8,
              background: "var(--vf-surface-raised, #141417)",
              border: "1px solid var(--vf-border, #1F1F22)",
              display: "flex",
              flexDirection: "column",
              gap: 3,
            }}
          >
            <div
              style={{
                fontSize: 9,
                letterSpacing: "0.2em",
                color: "var(--vf-text-muted, #7A7A80)",
              }}
            >
              TODAY
            </div>
            <div
              style={{
                fontSize: 12,
                fontFamily: '"Inter", system-ui',
                color: "var(--vf-text, #F2F2F2)",
                lineHeight: 1.35,
              }}
            >
              {project
                ? `Pre-production · set your scene and shoot day on the project page.`
                : `No project selected · open one to see today's slate.`}
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .vf-hud-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          height: 22px;
          min-width: 22px;
          padding: 0 6px;
          border-radius: 5px;
          background: var(--vf-surface-raised, #141417);
          border: 1px solid var(--vf-border, #1F1F22);
          color: var(--vf-text, #F2F2F2);
          cursor: pointer;
          font-family: ui-monospace, "SF Mono", Menlo, monospace;
        }
        .vf-hud-btn:hover {
          border-color: var(--vf-border-hover, #2A2A2F);
        }
      `}</style>
    </aside>
  );
}

function HudField({
  label,
  value,
  accent = false,
  gelHex,
}: {
  label: string;
  value: React.ReactNode;
  accent?: boolean;
  gelHex?: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
      <div
        style={{
          fontSize: 9,
          letterSpacing: "0.2em",
          color: "var(--vf-text-muted, #7A7A80)",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'ui-monospace, "SF Mono", Menlo, monospace',
          fontSize: 20,
          fontWeight: 600,
          letterSpacing: "-0.02em",
          color: accent ? gelHex || "var(--vf-project, #D4A862)" : "var(--vf-text, #F2F2F2)",
          lineHeight: 1,
        }}
      >
        {value}
      </div>
    </div>
  );
}
