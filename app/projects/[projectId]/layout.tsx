"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Video,
  LayoutDashboard,
  Users,
  Settings,
  FileText,
  Clapperboard,
  UserRound,
  MapPin,
  Shirt,
  Film,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react";
import { clsx } from "clsx";
import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { getProject } from "@/services/project";

const MAIN_NAV = [
  { name: "Overview", href: (id: string) => `/projects/${id}/overview`, icon: LayoutDashboard },
  { name: "Team", href: (id: string) => `/projects/${id}/team`, icon: Users },
];

const CREATIVE_HUB_NAV = [
  { name: "Script", href: (id: string) => `/projects/${id}/creative-hub/script`, icon: FileText },
  { name: "Scenes", href: (id: string) => `/projects/${id}/creative-hub/scenes`, icon: Clapperboard },
  { name: "Characters", href: (id: string) => `/projects/${id}/creative-hub/characters`, icon: UserRound },
  { name: "Locations", href: (id: string) => `/projects/${id}/creative-hub/locations`, icon: MapPin },
  { name: "Wardrobe", href: (id: string) => `/projects/${id}/creative-hub/wardrobe`, icon: Shirt },
  { name: "Storyboarding", href: (id: string) => `/projects/${id}/creative-hub/storyboard`, icon: Film },
];

function NavLink({
  href,
  icon: Icon,
  name,
  active,
  collapsed,
}: {
  href: string;
  icon: React.ElementType;
  name: string;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? name : undefined}
      className={clsx(
        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors border",
        active
          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
          : "border-transparent hover:bg-[var(--surface-raised)]",
        collapsed && "justify-center px-2"
      )}
      style={active ? undefined : { color: "var(--text-secondary)" }}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && <span>{name}</span>}
    </Link>
  );
}

function SectionLabel({ label, collapsed }: { label: string; collapsed: boolean }) {
  if (collapsed) return null;
  return (
    <p
      className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest"
      style={{ color: "var(--text-muted)" }}
    >
      {label}
    </p>
  );
}

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.projectId as string;
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [projectName, setProjectName] = useState<string>("");

  useEffect(() => {
    if (!projectId) return;
    getProject(projectId)
      .then((p) => setProjectName(p.name))
      .catch(() => setProjectName("Project"));
  }, [projectId]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: "var(--background)", color: "var(--text-primary)" }}
    >
      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside
        className={clsx(
          "border-r flex-shrink-0 flex flex-col transition-all duration-300 overflow-hidden",
          collapsed ? "w-16" : "w-60"
        )}
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {/* Logo row */}
        <div
          className="p-4 border-b flex items-center justify-between flex-shrink-0"
          style={{ borderColor: "var(--border)" }}
        >
          {!collapsed ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              <Video className="h-5 w-5 text-emerald-500" />
              Storyvord
            </Link>
          ) : (
            <Link href="/dashboard" className="mx-auto text-emerald-500">
              <Video className="h-5 w-5" />
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="ml-1 transition-colors flex-shrink-0"
            style={{ color: "var(--text-muted)" }}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>

        {/* Project name chip */}
        {!collapsed && projectName && (
          <div
            className="px-4 py-2.5 border-b flex-shrink-0"
            style={{ borderColor: "var(--border)" }}
          >
            <p
              className="text-xs font-semibold truncate"
              style={{ color: "var(--text-secondary)" }}
              title={projectName}
            >
              {projectName}
            </p>
          </div>
        )}

        {/* ── Scrollable nav area ──────────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* Project section: Overview + Team */}
          <div>
            <SectionLabel label="Project" collapsed={collapsed} />
            <div className="space-y-0.5">
              {MAIN_NAV.map((item) => {
                const href = item.href(projectId);
                return (
                  <NavLink
                    key={item.name}
                    href={href}
                    icon={item.icon}
                    name={item.name}
                    active={isActive(href)}
                    collapsed={collapsed}
                  />
                );
              })}
            </div>
          </div>

          {/* Creative Hub section */}
          <div>
            <SectionLabel label="Creative Hub" collapsed={collapsed} />
            <div className="space-y-0.5">
              {CREATIVE_HUB_NAV.map((item) => {
                const href = item.href(projectId);
                return (
                  <NavLink
                    key={item.name}
                    href={href}
                    icon={item.icon}
                    name={item.name}
                    active={isActive(href)}
                    collapsed={collapsed}
                  />
                );
              })}
            </div>
          </div>
        </nav>

        {/* ── Bottom pinned section: Settings + controls ───────────────────── */}
        <div
          className="flex-shrink-0 border-t p-2 space-y-1"
          style={{ borderColor: "var(--border)" }}
        >
          {/* Settings (RBAC) — pinned at bottom above theme/nav */}
          <NavLink
            href={`/projects/${projectId}/settings/rbac`}
            icon={Settings}
            name="Settings"
            active={isActive(`/projects/${projectId}/settings/rbac`)}
            collapsed={collapsed}
          />

          {/* Divider */}
          <div className="my-1 border-t" style={{ borderColor: "var(--border)" }} />

          {/* Theme toggle + back to dashboard */}
          <div className={clsx("flex gap-2", collapsed ? "flex-col items-center" : "items-center justify-between px-1")}>
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-md border transition-colors"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface-raised)",
                color: "var(--text-secondary)",
              }}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            {!collapsed ? (
              <Link
                href="/dashboard"
                className="text-xs transition-colors hover:text-emerald-400 flex items-center gap-1"
                style={{ color: "var(--text-muted)" }}
              >
                <ChevronLeft size={12} /> Dashboard
              </Link>
            ) : (
              <Link
                href="/dashboard"
                className="text-xs transition-colors hover:text-emerald-400"
                style={{ color: "var(--text-muted)" }}
                title="Back to Dashboard"
              >
                ←
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-auto" style={{ background: "var(--background)" }}>
        {children}
      </main>
    </div>
  );
}
