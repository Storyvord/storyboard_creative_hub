"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { getProjects } from "@/services/project";
import { Project } from "@/types/project";
import { getUnreadCount, getNotifications, Notification } from "@/services/notifications";
import { getUnifiedCalendar, CalendarEvent, UnifiedCalendar } from "@/services/calendar";
import { getConnections } from "@/services/network";
import {
  Loader2, Moon, Plus, Sun, Video, Bell, BellDot,
  Calendar, Users, Briefcase, Inbox, Network,
  ChevronRight, Clock, AlertCircle, TrendingUp, FolderOpen,
  Activity, Star,
} from "lucide-react";
import { toast } from "react-toastify";
import { useTheme } from "@/context/ThemeContext";
import CreateProjectModal from "@/components/project/CreateProjectModal";
import StatusBadge from "@/components/project/StatusBadge";
import UserWidget from "@/components/UserWidget";
import AppTour, { AppTourTrigger, APP_TOUR_DONE_KEY } from "@/components/AppTour";

// ── helpers ────────────────────────────────────────────────────────────────────

function fmt(dateStr: string) {
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  if (diff < 60000) return "just now";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function fmtTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function isToday(dateStr: string) {
  const d = new Date(dateStr);
  const n = new Date();
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function isTomorrow(dateStr: string) {
  const d = new Date(dateStr);
  const n = new Date();
  n.setDate(n.getDate() + 1);
  return d.getDate() === n.getDate() && d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
}

function dayLabel(dateStr: string) {
  if (isToday(dateStr)) return "Today";
  if (isTomorrow(dateStr)) return "Tomorrow";
  return fmtDate(dateStr);
}

const STATUS_COLOR: Record<string, string> = {
  active: "#34d399", in_progress: "#60a5fa", completed: "#a3e635",
  pending: "#fbbf24", on_hold: "#f87171", draft: "#94a3b8",
};

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#f87171", high: "#fb923c", medium: "#fbbf24", low: "#94a3b8",
};

// ── sub-components ─────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, sub, color = "#34d399", href }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string; color?: string; href?: string;
}) {
  const inner = (
    <div style={{
      background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 12,
      padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, transition: "border-color .2s",
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <span style={{ color }}>{icon}</span>
      </div>
      <div style={{ minWidth: 0 }}>
        <p style={{ margin: 0, fontSize: 22, fontWeight: 700, lineHeight: 1 }}>{value}</p>
        <p style={{ margin: "3px 0 0", fontSize: 12, color: "var(--text-muted)" }}>{label}</p>
        {sub && <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", opacity: .7 }}>{sub}</p>}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} style={{ textDecoration: "none", color: "inherit", display: "block" }}>{inner}</Link>
  ) : <div>{inner}</div>;
}

function SectionHeader({ title, href, icon }: { title: string; href?: string; icon?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
        {icon && <span style={{ color: "var(--text-muted)" }}>{icon}</span>}
        <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase", color: "var(--text-muted)" }}>{title}</h2>
      </div>
      {href && (
        <Link href={href} style={{ fontSize: 11, color: "#34d399", display: "flex", alignItems: "center", gap: 2, textDecoration: "none" }}>
          View all <ChevronRight size={12} />
        </Link>
      )}
    </div>
  );
}

// ── main ───────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [connectionCount, setConnectionCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [tourVisible, setTourVisible] = useState(false);
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    if (typeof window !== "undefined" && !localStorage.getItem(APP_TOUR_DONE_KEY)) {
      setTourVisible(true);
    }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const [proj, notifs, unread, connections] = await Promise.allSettled([
      getProjects(),
      getNotifications(),
      getUnreadCount(),
      getConnections(),
    ]);
    if (proj.status === "fulfilled") setProjects(proj.value);
    if (notifs.status === "fulfilled") setNotifications(notifs.value.slice(0, 6));
    if (unread.status === "fulfilled") setUnreadCount(unread.value);
    if (connections.status === "fulfilled") setConnectionCount((connections.value as any)?.count ?? (connections.value as any[])?.length ?? 0);

    // Calendar — load for all projects in background
    getUnifiedCalendar().then((cal) => {
      const allEvents = cal.flatMap((c: UnifiedCalendar) => c.user_calendar_events ?? []);
      const upcoming = allEvents
        .filter((e: CalendarEvent) => new Date(e.start) >= new Date(new Date().setHours(0, 0, 0, 0)))
        .sort((a: CalendarEvent, b: CalendarEvent) => new Date(a.start).getTime() - new Date(b.start).getTime())
        .slice(0, 8);
      setEvents(upcoming);
    }).catch(() => {});

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const activeProjects = projects.filter(p => p.status === "active" || p.status === "in_progress");
  const recentProjects = [...projects].sort((a, b) =>
    new Date(b.updated_at ?? b.created_at ?? 0).getTime() - new Date(a.updated_at ?? a.created_at ?? 0).getTime()
  ).slice(0, 6);

  const todayEvents = events.filter(e => isToday(e.start));
  const upcomingEvents = events.filter(e => !isToday(e.start)).slice(0, 4);

  const unreadNotifs = notifications.filter(n => !n.is_read);

  return (
    <div style={{ minHeight: "100vh", background: "var(--background)", color: "var(--text-primary)" }}>
      {/* ── Top Bar ── */}
      <header style={{
        position: "sticky", top: 0, zIndex: 40,
        background: "var(--surface)", borderBottom: "1px solid var(--border)",
        padding: "0 24px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Video size={18} style={{ color: "#34d399" }} />
          <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-.01em" }}>Storyvord</span>
        </div>
        <nav style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {[
            { href: "/inbox", label: "Inbox", icon: <Inbox size={14} /> },
            { href: "/network", label: "Network", icon: <Network size={14} /> },
            { href: "/crew-search", label: "Crew", icon: <Users size={14} /> },
          ].map(item => (
            <Link key={item.href} href={item.href} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 8,
              fontSize: 12, fontWeight: 500, color: "var(--text-secondary)",
              background: "var(--surface-raised)", border: "1px solid var(--border)", textDecoration: "none",
            }}>
              {item.icon}{item.label}
            </Link>
          ))}
          <Link href="/notifications" style={{
            position: "relative", display: "flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--surface-raised)", color: "var(--text-secondary)", textDecoration: "none",
          }}>
            {unreadCount > 0 ? <BellDot size={15} style={{ color: "#34d399" }} /> : <Bell size={15} />}
            {unreadCount > 0 && (
              <span style={{
                position: "absolute", top: 4, right: 4, width: 8, height: 8,
                borderRadius: "50%", background: "#34d399", border: "2px solid var(--surface)",
              }} />
            )}
          </Link>
          <UserWidget variant="topbar" />
          <button onClick={toggleTheme} style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            width: 34, height: 34, borderRadius: 8, border: "1px solid var(--border)",
            background: "var(--surface-raised)", color: "var(--text-secondary)", cursor: "pointer",
          }}>
            {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
          </button>
        </nav>
      </header>

      {loading ? (
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "calc(100vh - 56px)" }}>
          <Loader2 className="animate-spin" size={28} style={{ color: "var(--text-muted)" }} />
        </div>
      ) : (
        <main style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 48px" }}>

          {/* ── Stat Row ── */}
          <div data-tour="dash-stats" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 28 }}>
            <StatCard icon={<FolderOpen size={18} />} label="Total Projects" value={projects.length} sub={`${activeProjects.length} active`} color="#34d399" href="/dashboard" />
            <StatCard icon={<Bell size={18} />} label="Notifications" value={unreadCount} sub="unread" color="#60a5fa" href="/notifications" />
            <StatCard icon={<Calendar size={18} />} label="Today's Events" value={todayEvents.length} sub={events.length > 0 ? `${events.length} upcoming` : "no events"} color="#a78bfa" href="/dashboard" />
            <StatCard icon={<Users size={18} />} label="Connections" value={connectionCount} sub="in network" color="#fb923c" href="/network" />
            <StatCard icon={<TrendingUp size={18} />} label="Completed" value={projects.filter(p => p.status === "completed").length} sub="projects done" color="#a3e635" />
          </div>

          {/* ── Main 3-col grid ── */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20 }}>

            {/* LEFT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Today at a glance */}
              {todayEvents.length > 0 && (
                <div data-tour="dash-schedule" style={{ background: "linear-gradient(135deg, #059669 0%, #0d9488 100%)", borderRadius: 14, padding: "18px 20px", color: "#fff" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                    <Star size={15} style={{ opacity: .9 }} />
                    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".05em", textTransform: "uppercase", opacity: .85 }}>Today's Schedule</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {todayEvents.map(ev => (
                      <div key={ev.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(255,255,255,.12)", borderRadius: 8, padding: "8px 12px" }}>
                        <Clock size={13} style={{ opacity: .8, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, fontWeight: 600, flex: 1 }}>{ev.title}</span>
                        <span style={{ fontSize: 11, opacity: .75 }}>{fmtTime(ev.start)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent Projects */}
              <div data-tour="dash-projects">
                <SectionHeader title="Recent Projects" href="/dashboard" icon={<FolderOpen size={14} />} />
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
                  {recentProjects.map(project => (
                    <Link key={project.project_id} href={`/projects/${project.project_id}/overview`}
                      style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                      <div style={{
                        background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 12,
                        padding: "14px 16px", transition: "border-color .2s, box-shadow .2s",
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#34d39940"; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 12px rgba(0,0,0,.1)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; (e.currentTarget as HTMLElement).style.boxShadow = "none"; }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div style={{
                            width: 36, height: 36, borderRadius: 9, background: "#34d39918",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            fontSize: 15, fontWeight: 700, color: "#34d399",
                          }}>
                            {project.name.charAt(0).toUpperCase()}
                          </div>
                          {project.status && <StatusBadge status={project.status} />}
                        </div>
                        <p style={{ margin: "0 0 4px", fontSize: 13, fontWeight: 600, lineHeight: 1.3 }}>{project.name}</p>
                        <p style={{ margin: 0, fontSize: 11, color: "var(--text-muted)", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                          {project.brief || project.description || "No description."}
                        </p>
                        {project.updated_at && (
                          <p style={{ margin: "8px 0 0", fontSize: 10, color: "var(--text-muted)", opacity: .7 }}>
                            Updated {fmt(project.updated_at)}
                          </p>
                        )}
                      </div>
                    </Link>
                  ))}

                  {/* New project button */}
                  <button onClick={() => setCreateOpen(true)}
                    style={{
                      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                      padding: "14px 16px", borderRadius: 12, border: "2px dashed var(--border)",
                      background: "transparent", cursor: "pointer", gap: 6, minHeight: 100,
                      transition: "border-color .2s",
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "#34d39966"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--border)"; }}
                  >
                    <Plus size={20} style={{ color: "#34d399" }} />
                    <span style={{ fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>New Project</span>
                  </button>
                </div>
              </div>

              {/* Notifications Feed */}
              <div data-tour="dash-activity">
                <SectionHeader title="Recent Activity" href="/notifications" icon={<Activity size={14} />} />
                {notifications.length === 0 ? (
                  <div style={{ padding: "32px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>No recent activity.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {notifications.map(n => (
                      <div key={n.uuid} style={{
                        display: "flex", alignItems: "flex-start", gap: 10,
                        padding: "10px 12px", borderRadius: 10,
                        background: n.is_read ? "transparent" : "rgba(52,211,153,.04)",
                        border: `1px solid ${n.is_read ? "transparent" : "rgba(52,211,153,.12)"}`,
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: "50%", flexShrink: 0,
                          background: n.is_system_generated ? "#60a5fa18" : "#34d39918",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 12, fontWeight: 700,
                          color: n.is_system_generated ? "#60a5fa" : "#34d399",
                        }}>
                          {n.is_system_generated ? "S" : (n.sender_name?.[0] ?? "?").toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <p style={{ margin: 0, fontSize: 12, fontWeight: n.is_read ? 400 : 600, lineHeight: 1.4 }}>{n.title}</p>
                            <span style={{ fontSize: 10, color: "var(--text-muted)", whiteSpace: "nowrap", flexShrink: 0 }}>{n.time_since}</span>
                          </div>
                          <p style={{ margin: "2px 0 0", fontSize: 11, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.message}</p>
                        </div>
                        {!n.is_read && (
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#34d399", flexShrink: 0, marginTop: 4 }} />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT COLUMN */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

              {/* Upcoming Events */}
              <div data-tour="dash-upcoming" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
                <SectionHeader title="Upcoming Events" icon={<Calendar size={14} />} />
                {events.length === 0 ? (
                  <div style={{ padding: "24px 0", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>No upcoming events.</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {[...todayEvents, ...upcomingEvents].map(ev => (
                      <div key={ev.id} style={{
                        display: "flex", gap: 10, alignItems: "flex-start",
                        padding: "8px 10px", borderRadius: 9,
                        background: isToday(ev.start) ? "rgba(52,211,153,.07)" : "var(--surface)",
                        border: `1px solid ${isToday(ev.start) ? "rgba(52,211,153,.2)" : "var(--border)"}`,
                      }}>
                        <div style={{
                          minWidth: 38, textAlign: "center", background: isToday(ev.start) ? "#34d39920" : "var(--surface-raised)",
                          borderRadius: 8, padding: "4px 2px",
                        }}>
                          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: isToday(ev.start) ? "#34d399" : "var(--text-primary)" }}>
                            {new Date(ev.start).getDate()}
                          </p>
                          <p style={{ margin: 0, fontSize: 9, color: "var(--text-muted)", textTransform: "uppercase" }}>
                            {new Date(ev.start).toLocaleString("en-US", { month: "short" })}
                          </p>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                            {isToday(ev.start) && (
                              <span style={{ fontSize: 9, padding: "1px 5px", borderRadius: 99, background: "#34d39918", color: "#34d399", fontWeight: 700 }}>TODAY</span>
                            )}
                          </div>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{ev.title}</p>
                          <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--text-muted)" }}>{fmtTime(ev.start)}{ev.location ? ` · ${ev.location}` : ""}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Project Status Breakdown */}
              {projects.length > 0 && (
                <div style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
                  <SectionHeader title="Project Status" icon={<TrendingUp size={14} />} />
                  {(() => {
                    const groups: Record<string, number> = {};
                    projects.forEach(p => { const s = p.status ?? "unknown"; groups[s] = (groups[s] ?? 0) + 1; });
                    return Object.entries(groups).map(([status, count]) => (
                      <div key={status} style={{ marginBottom: 8 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontSize: 11, fontWeight: 600, textTransform: "capitalize", color: "var(--text-secondary)" }}>{status.replace(/_/g, " ")}</span>
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>{count}</span>
                        </div>
                        <div style={{ height: 6, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
                          <div style={{
                            height: "100%", borderRadius: 99,
                            background: STATUS_COLOR[status] ?? "#94a3b8",
                            width: `${(count / projects.length) * 100}%`,
                          }} />
                        </div>
                      </div>
                    ));
                  })()}
                </div>
              )}

              {/* Quick Links */}
              <div data-tour="dash-quicklinks" style={{ background: "var(--surface-raised)", border: "1px solid var(--border)", borderRadius: 14, padding: "16px 18px" }}>
                <SectionHeader title="Quick Links" icon={<Star size={14} />} />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { href: "/notifications", label: "Notifications", icon: <Bell size={14} />, badge: unreadCount > 0 ? unreadCount : undefined, color: "#60a5fa" },
                    { href: "/inbox", label: "Inbox", icon: <Inbox size={14} />, color: "#a78bfa" },
                    { href: "/network", label: "My Network", icon: <Network size={14} />, color: "#fb923c" },
                    { href: "/crew-search", label: "Crew Search", icon: <Users size={14} />, color: "#34d399" },
                  ].map(item => (
                    <Link key={item.href} href={item.href} style={{ textDecoration: "none" }}>
                      <div style={{
                        display: "flex", alignItems: "center", gap: 10, padding: "8px 10px",
                        borderRadius: 9, border: "1px solid transparent", transition: "background .15s",
                        cursor: "pointer",
                      }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "var(--surface)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}
                      >
                        <span style={{ color: item.color }}>{item.icon}</span>
                        <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: "var(--text-secondary)" }}>{item.label}</span>
                        {item.badge !== undefined && (
                          <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 99, background: "#34d39920", color: "#34d399", fontWeight: 700 }}>{item.badge}</span>
                        )}
                        <ChevronRight size={12} style={{ color: "var(--text-muted)" }} />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>

              {/* Unread notification snippets */}
              {unreadNotifs.length > 0 && (
                <div style={{ background: "var(--surface-raised)", border: "1px solid rgba(52,211,153,.2)", borderRadius: 14, padding: "16px 18px" }}>
                  <SectionHeader title={`${unreadNotifs.length} Unread`} href="/notifications" icon={<AlertCircle size={14} style={{ color: "#34d399" }} />} />
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {unreadNotifs.slice(0, 3).map(n => (
                      <div key={n.uuid} style={{ fontSize: 12, padding: "6px 8px", borderRadius: 8, background: "rgba(52,211,153,.05)", borderLeft: "3px solid #34d399" }}>
                        <p style={{ margin: 0, fontWeight: 600 }}>{n.title}</p>
                        <p style={{ margin: "2px 0 0", fontSize: 10, color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{n.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      )}

      {createOpen && (
        <CreateProjectModal onClose={() => setCreateOpen(false)} onCreated={load} />
      )}

      {/* Tour trigger — fixed bottom-left of AI button */}
      <div style={{ position: "fixed", bottom: 28, right: 96, zIndex: 50 }}>
        <AppTourTrigger onClick={() => { localStorage.removeItem(APP_TOUR_DONE_KEY); setTourVisible(true); }} />
      </div>

      {tourVisible && <AppTour onDone={() => setTourVisible(false)} />}
    </div>
  );
}
