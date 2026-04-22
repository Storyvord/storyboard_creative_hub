"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowRight, Folder, LayoutGrid, MessageCircle, Sparkles, SunMoon } from "lucide-react";
import { useViewfinder } from "@/context/ViewfinderContext";
import { useTheme } from "@/context/ThemeContext";
import { getProjects } from "@/services/project";
import { Project } from "@/types/project";

interface Item {
  id: string;
  label: string;
  hint?: string;
  icon: React.ReactNode;
  run: () => void;
  group: "assistant" | "projects" | "pages" | "actions";
}

const PAGES: Array<Omit<Item, "run" | "group"> & { href: string }> = [
  { id: "nav-dashboard",     label: "Dashboard",     icon: <LayoutGrid size={14} />, href: "/dashboard" },
  { id: "nav-inbox",         label: "Inbox",         icon: <MessageCircle size={14} />, href: "/inbox" },
  { id: "nav-network",       label: "Network",       icon: <MessageCircle size={14} />, href: "/network" },
  { id: "nav-crew",          label: "Crew Search",   icon: <MessageCircle size={14} />, href: "/crew-search" },
  { id: "nav-notifications", label: "Notifications", icon: <MessageCircle size={14} />, href: "/notifications" },
  { id: "nav-profile",       label: "Profile",       icon: <MessageCircle size={14} />, href: "/profile" },
];

const PROJECT_SUBPAGES = [
  { slug: "overview",   label: "Overview" },
  { slug: "calendar",   label: "Calendar" },
  { slug: "tasks",      label: "Tasks" },
  { slug: "team",       label: "Team" },
  { slug: "jobs",       label: "Jobs" },
  { slug: "callsheets", label: "Callsheets" },
  { slug: "ai-assistant", label: "AI Assistant" },
];

function fuzzyMatch(hay: string, needle: string): number {
  if (!needle) return 1;
  hay = hay.toLowerCase();
  needle = needle.toLowerCase();
  if (hay.includes(needle)) return 2 - needle.length / hay.length;
  let hi = 0;
  let score = 0;
  for (const ch of needle) {
    const idx = hay.indexOf(ch, hi);
    if (idx === -1) return 0;
    score += 1 / (1 + idx - hi);
    hi = idx + 1;
  }
  return score;
}

export default function CommandPalette() {
  const router = useRouter();
  const params = useParams();
  const { paletteOpen, setPaletteOpen, openAssistant } = useViewfinder();
  const { toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [loadedProjects, setLoadedProjects] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const currentProjectId = typeof params?.projectId === "string" ? params.projectId : undefined;

  // Lazy-load projects on first open. Cache across opens.
  useEffect(() => {
    if (!paletteOpen || loadedProjects) return;
    getProjects()
      .then((p) => setProjects(p))
      .catch(() => {})
      .finally(() => setLoadedProjects(true));
  }, [paletteOpen, loadedProjects]);

  // Reset state each open; focus input.
  useEffect(() => {
    if (paletteOpen) {
      setQuery("");
      setActiveIdx(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [paletteOpen]);

  const items = useMemo<Item[]>(() => {
    const list: Item[] = [];

    // Ask the 1st AD — always first.
    list.push({
      id: "assistant-ask",
      label: query.trim() ? `Ask the 1st AD: "${query.trim()}"` : "Ask the 1st AD",
      hint: "AI assistant",
      icon: <Sparkles size={14} />,
      group: "assistant",
      run: () => openAssistant(query.trim() || undefined),
    });

    // Pages
    for (const p of PAGES) {
      list.push({
        id: p.id,
        label: p.label,
        hint: p.href,
        icon: p.icon,
        group: "pages",
        run: () => { router.push(p.href); setPaletteOpen(false); },
      });
    }

    // Current project sub-pages
    if (currentProjectId) {
      for (const sp of PROJECT_SUBPAGES) {
        list.push({
          id: `sub-${sp.slug}`,
          label: `Project · ${sp.label}`,
          hint: `/${sp.slug}`,
          icon: <Folder size={14} />,
          group: "pages",
          run: () => { router.push(`/projects/${currentProjectId}/${sp.slug}`); setPaletteOpen(false); },
        });
      }
    }

    // Projects
    for (const pr of projects) {
      list.push({
        id: `proj-${pr.project_id}`,
        label: pr.name,
        hint: "Project",
        icon: <Folder size={14} />,
        group: "projects",
        run: () => { router.push(`/projects/${pr.project_id}/overview`); setPaletteOpen(false); },
      });
    }

    // Actions
    list.push({
      id: "action-theme",
      label: "Toggle light / dark theme",
      icon: <SunMoon size={14} />,
      group: "actions",
      run: () => { toggleTheme(); setPaletteOpen(false); },
    });

    return list;
  }, [query, projects, currentProjectId, router, setPaletteOpen, openAssistant, toggleTheme]);

  const filtered = useMemo(() => {
    if (!query.trim()) return items;
    return items
      .map((it) => ({ it, score: Math.max(fuzzyMatch(it.label, query), fuzzyMatch(it.hint ?? "", query)) }))
      .filter((x) => x.score > 0 || x.it.group === "assistant")
      .sort((a, b) => (b.it.group === "assistant" ? 1 : 0) - (a.it.group === "assistant" ? 1 : 0) || b.score - a.score)
      .map((x) => x.it);
  }, [items, query]);

  // Reset active index when filter changes.
  useEffect(() => { setActiveIdx(0); }, [query]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") { e.preventDefault(); setPaletteOpen(false); return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter")     { e.preventDefault(); filtered[activeIdx]?.run(); return; }
  };

  if (!paletteOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
      onClick={(e) => { if (e.target === e.currentTarget) setPaletteOpen(false); }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        background: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "14vh",
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      <div
        className="vf-iris-in"
        style={{
          width: "min(640px, 100%)",
          background: "var(--vf-surface, #0E0E10)",
          border: "1px solid var(--vf-border, #1F1F22)",
          borderRadius: 14,
          boxShadow: "0 24px 80px rgba(0, 0, 0, 0.55), 0 0 0 1px rgba(255,255,255,0.02) inset",
          overflow: "hidden",
          color: "var(--vf-text, #F2F2F2)",
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid var(--vf-border, #1F1F22)" }}>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search projects, pages, or ask the 1st AD…"
            style={{
              width: "100%",
              background: "transparent",
              border: "none",
              outline: "none",
              color: "var(--vf-text, #F2F2F2)",
              fontSize: 15,
              letterSpacing: "-0.005em",
            }}
          />
        </div>
        <ul
          role="listbox"
          style={{
            listStyle: "none",
            margin: 0,
            padding: 6,
            maxHeight: "50vh",
            overflowY: "auto",
          }}
        >
          {filtered.length === 0 && (
            <li style={{ padding: 20, fontSize: 13, opacity: 0.6, textAlign: "center" }}>
              No matches.
            </li>
          )}
          {filtered.map((it, i) => {
            const active = i === activeIdx;
            return (
              <li
                key={it.id}
                role="option"
                aria-selected={active}
                onMouseEnter={() => setActiveIdx(i)}
                onClick={() => it.run()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "10px 12px",
                  borderRadius: 9,
                  cursor: "pointer",
                  background: active ? "var(--vf-surface-hover, #1A1A1E)" : "transparent",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 28,
                    height: 28,
                    borderRadius: 7,
                    background: it.group === "assistant"
                      ? "var(--vf-project-soft, rgba(212,168,98,0.14))"
                      : "var(--vf-surface-raised, #141417)",
                    color: it.group === "assistant" ? "var(--vf-project, #D4A862)" : "var(--vf-text-muted, #7A7A80)",
                    flexShrink: 0,
                  }}
                >
                  {it.icon}
                </span>
                <span style={{ flex: 1, fontSize: 14 }}>{it.label}</span>
                {it.hint && (
                  <span className="vf-mono" style={{ opacity: 0.45, fontSize: 11 }}>{it.hint}</span>
                )}
                {active && <ArrowRight size={13} style={{ opacity: 0.6 }} />}
              </li>
            );
          })}
        </ul>
        <div
          style={{
            display: "flex",
            gap: 14,
            padding: "8px 14px",
            borderTop: "1px solid var(--vf-border, #1F1F22)",
            fontSize: 10,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "var(--vf-text-muted, #7A7A80)",
          }}
          className="vf-mono"
        >
          <span>↵ select</span>
          <span>↑↓ navigate</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
