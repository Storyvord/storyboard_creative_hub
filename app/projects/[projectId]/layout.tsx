"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import {
  Video, LayoutDashboard, Users, Settings, FileText, Clapperboard,
  UserRound, MapPin, Shirt, Film, ChevronLeft, ChevronRight, Moon, Sun,
  Calendar, CalendarDays, FolderOpen, BarChart2, ListTodo, Bell, Megaphone, BriefcaseBusiness,
} from "lucide-react";
import { clsx } from "clsx";
import { useState, useEffect } from "react";
import { useTheme } from "@/context/ThemeContext";
import { getProject } from "@/services/project";
import UserWidget from "@/components/UserWidget";
import AIAssistantWidget from "@/components/AIAssistantWidget";
import AppTour, { AppTourTrigger, APP_TOUR_DONE_KEY } from "@/components/AppTour";
import RequireAuth from "@/components/RequireAuth";

const PROJECT_NAV = [
  { name: "Overview", href: (id: string) => `/projects/${id}/overview`, icon: LayoutDashboard },
  { name: "Team", href: (id: string) => `/projects/${id}/team`, icon: Users },
  { name: "Callsheets", href: (id: string) => `/projects/${id}/callsheets`, icon: Calendar },
  { name: "Files", href: (id: string) => `/projects/${id}/files`, icon: FolderOpen },
  { name: "Tasks", href: (id: string) => `/projects/${id}/tasks`, icon: ListTodo },
  { name: "Announcements", href: (id: string) => `/projects/${id}/announcements`, icon: Megaphone },
  { name: "Calendar", href: (id: string) => `/projects/${id}/calendar`, icon: CalendarDays },
  { name: "Jobs", href: (id: string) => `/projects/${id}/jobs`, icon: BriefcaseBusiness },
  { name: "Research Deck", href: (id: string) => `/projects/${id}/reports`, icon: BarChart2 },
];

const CREATIVE_HUB_NAV = [
  { name: "Script", href: (id: string) => `/projects/${id}/creative-hub/script`, icon: FileText },
  { name: "Scenes", href: (id: string) => `/projects/${id}/creative-hub/scenes`, icon: Clapperboard },
  { name: "Characters", href: (id: string) => `/projects/${id}/creative-hub/characters`, icon: UserRound },
  { name: "Locations", href: (id: string) => `/projects/${id}/creative-hub/locations`, icon: MapPin },
  { name: "Wardrobe", href: (id: string) => `/projects/${id}/creative-hub/wardrobe`, icon: Shirt },
  { name: "Storyboarding", href: (id: string) => `/projects/${id}/creative-hub/storyboard`, icon: Film },
];

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const params = useParams();
  const projectId = params.projectId as string;
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [projectName, setProjectName] = useState<string>("");
  const [tourVisible, setTourVisible] = useState(false);

  // Auto-show tour on first visit to a project page (but not creative-hub pages, they have their own)
  useEffect(() => {
    const isCreativeHub = pathname.includes("/creative-hub");
    if (!isCreativeHub && typeof window !== "undefined" && !localStorage.getItem(APP_TOUR_DONE_KEY)) {
      setTourVisible(true);
    }
  }, [pathname]);

  useEffect(() => {
    if (!projectId) return;
    getProject(projectId)
      .then((p) => setProjectName(p.name))
      .catch(() => setProjectName("Project"));
  }, [projectId]);

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  const NavLink = ({ item }: { item: { name: string; href: (id: string) => string; icon: React.ElementType } }) => {
    const href = item.href(projectId);
    const active = isActive(href);
    return (
      <Link
        href={href}
        title={collapsed ? item.name : undefined}
        className={clsx(
          "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors border",
          active
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "border-transparent hover:bg-[var(--surface-hover)]",
          collapsed && "justify-center px-2"
        )}
        style={active ? undefined : { color: "var(--text-secondary)" }}
      >
        <item.icon className="h-4 w-4 flex-shrink-0" />
        {!collapsed && <span>{item.name}</span>}
      </Link>
    );
  };

  return (
    <RequireAuth>
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--background)", color: "var(--text-primary)" }}>
      {/* Sidebar */}
      <aside
        className={clsx(
          "border-r flex-shrink-0 flex flex-col transition-all duration-300",
          collapsed ? "w-16" : "w-60"
        )}
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
      >
        {/* Logo row */}
        <div className="p-4 border-b flex items-center justify-between flex-shrink-0" style={{ borderColor: "var(--border)" }}>
          {!collapsed ? (
            <Link href="/dashboard" className="flex items-center gap-2 font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
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
            className="transition-colors ml-auto"
            style={{ color: "var(--text-muted)" }}
          >
            {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
          </button>
        </div>

        {/* Project name chip */}
        {!collapsed && projectName && (
          <div className="px-4 py-2.5 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
            <p className="text-xs truncate font-semibold" style={{ color: "var(--text-secondary)" }} title={projectName}>{projectName}</p>
          </div>
        )}

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-4">
          {/* PROJECT section */}
          <div>
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Project
              </p>
            )}
            <div className="space-y-0.5">
              {PROJECT_NAV.map((item) => <NavLink key={item.name} item={item} />)}
            </div>
          </div>

          {/* CREATIVE HUB section */}
          <div>
            <div
              className="mx-2 mb-3"
              style={{ height: 1, background: "var(--border)" }}
            />
            {!collapsed && (
              <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>
                Creative Hub
              </p>
            )}
            <div className="space-y-0.5">
              {CREATIVE_HUB_NAV.map((item) => <NavLink key={item.name} item={item} />)}
            </div>
          </div>
        </nav>

        {/* Divider + bottom pinned */}
        <div className="flex-shrink-0 border-t" style={{ borderColor: "var(--border)" }}>
          <div className="p-2 space-y-0.5">
            {/* Settings */}
            {(() => {
              const href = `/projects/${projectId}/settings`;
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  href={href}
                  title={collapsed ? "Settings" : undefined}
                  className={clsx(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors border",
                    active
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      : "border-transparent hover:bg-[var(--surface-hover)]",
                    collapsed && "justify-center px-2"
                  )}
                  style={active ? undefined : { color: "var(--text-secondary)" }}
                >
                  <Settings className="h-4 w-4 flex-shrink-0" />
                  {!collapsed && <span>Settings</span>}
                </Link>
              );
            })()}
          </div>

          <div className="px-2 pb-1">
            <Link href="/notifications"
              className={clsx("flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors mb-1", "hover:bg-[var(--surface-hover)]")}
              style={{ color: "var(--text-secondary)" }}
              title="Notifications">
              <Bell className="h-4 w-4 flex-shrink-0" />
              {!collapsed && <span>Notifications</span>}
            </Link>
            <UserWidget variant="sidebar" collapsed={collapsed} />
          </div>
          <div className="border-t my-1" style={{ borderColor: 'var(--border)' }} />

          <div className="px-3 pb-3 flex items-center justify-between gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="p-2 rounded-md border transition-colors"
              style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-secondary)" }}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
            </button>
            {!collapsed && (
              <Link
                href="/dashboard"
                className="text-xs transition-colors hover:text-emerald-400 flex items-center gap-1"
                style={{ color: "var(--text-muted)" }}
              >
                <ChevronLeft size={12} />Dashboard
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto" style={{ background: "var(--background)", position: "relative" }}>
        {children}
      </main>

      {/* Floating AI Assistant */}
      <AIAssistantWidget />

      {/* Tour trigger — shown on non-creative-hub project pages */}
      {!pathname.includes("/creative-hub") && (
        <div style={{ position: "fixed", bottom: 28, right: 96, zIndex: 50 }}>
          <AppTourTrigger onClick={() => { localStorage.removeItem(APP_TOUR_DONE_KEY); setTourVisible(true); }} />
        </div>
      )}

      {tourVisible && !pathname.includes("/creative-hub") && (
        <AppTour onDone={() => { setTourVisible(false); localStorage.setItem(APP_TOUR_DONE_KEY, "1"); }} />
      )}
    </div>
    </RequireAuth>
  );
}
