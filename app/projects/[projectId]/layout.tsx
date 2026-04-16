"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Video, LayoutDashboard, Users, Settings, FileText, Clapperboard,
  UserRound, MapPin, Shirt, Film, ChevronLeft, ChevronRight, Moon, Sun,
} from "lucide-react";
import { clsx } from "clsx";
import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { getProject } from "@/services/project";

const NAV_ITEMS = [
  { label: "NAVIGATION", items: [
    { name: "Overview", href: (id: string) => `/projects/${id}/overview`, icon: LayoutDashboard },
    { name: "Team", href: (id: string) => `/projects/${id}/team`, icon: Users },
    { name: "Settings (RBAC)", href: (id: string) => `/projects/${id}/settings/rbac`, icon: Settings },
  ]},
  { label: "CREATIVE HUB", items: [
    { name: "Script", href: (id: string) => `/projects/${id}/creative-hub/script`, icon: FileText },
    { name: "Scenes", href: (id: string) => `/projects/${id}/creative-hub/scenes`, icon: Clapperboard },
    { name: "Characters", href: (id: string) => `/projects/${id}/creative-hub/characters`, icon: UserRound },
    { name: "Locations", href: (id: string) => `/projects/${id}/creative-hub/locations`, icon: MapPin },
    { name: "Wardrobe", href: (id: string) => `/projects/${id}/creative-hub/wardrobe`, icon: Shirt },
    { name: "Storyboarding", href: (id: string) => `/projects/${id}/creative-hub/storyboard`, icon: Film },
  ]},
];

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

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      {/* Sidebar */}
      <aside
        className={clsx(
          "border-r flex-shrink-0 flex flex-col transition-all duration-300 overflow-y-auto",
          collapsed ? "w-16" : "w-60"
        )}
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {/* Logo */}
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: "var(--border)" }}>
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              <Video className="h-5 w-5 text-emerald-500" />
              Storyvord
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" className="mx-auto text-emerald-500">
              <Video className="h-5 w-5" />
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>

        {/* Project name */}
        {!collapsed && projectName && (
          <div className="px-4 py-3 border-b" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs truncate font-medium" style={{ color: "var(--text-secondary)" }} title={projectName}>{projectName}</p>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 p-2 space-y-4">
          {NAV_ITEMS.map((section) => (
            <div key={section.label}>
              {!collapsed && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const href = item.href(projectId);
                  const isActive = pathname === href || pathname.startsWith(href + "/") ||
                    (href.includes("/creative-hub/") && pathname.startsWith(href));
                  return (
                    <Link
                      key={item.name}
                      href={href}
                      title={collapsed ? item.name : undefined}
                      className={clsx(
                        "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors border",
                        isActive
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "border-transparent hover:bg-[var(--surface-raised)]",
                        collapsed && "justify-center px-2"
                      )}
                      style={isActive ? undefined : { color: "var(--text-secondary)" }}
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t flex flex-col gap-2 items-center" style={{ borderColor: "var(--border)" }}>
          <button
            onClick={toggleTheme}
            aria-label="Toggle theme"
            className="p-2 rounded-md border transition-colors"
            style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-secondary)" }}
          >
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <Link
            href="/dashboard"
            className="text-xs transition-colors hover:text-emerald-400 flex items-center gap-1"
            style={{ color: "var(--text-muted)" }}
            title={collapsed ? "Dashboard" : undefined}
          >
            {collapsed ? "←" : (<><ChevronLeft size={12} />Dashboard</>)}
          </Link>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto" style={{ background: "var(--background)" }}>
        {children}
      </main>
    </div>
  );
}
