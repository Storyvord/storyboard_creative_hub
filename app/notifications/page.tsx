"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, Check, CheckCheck, Loader2, Settings, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  getNotifications, getPreference, updatePreference, markRead, markAllRead,
  Notification, NotificationPreference,
} from "@/services/notifications";

// ── Helpers ───────────────────────────────────────────────────────────────────

const PRIORITY_COLOR: Record<string, string> = {
  critical: "#f87171",
  high: "#fb923c",
  medium: "#60a5fa",
  low: "var(--text-muted)",
};

const CATEGORY_ICON: Record<string, string> = {
  task: "✅", project: "🎬", calendar: "📅", comment: "💬",
  network: "🤝", system: "⚙️",
};

function NotifCard({ n, onRead }: { n: Notification; onRead: (uuid: string) => void }) {
  return (
    <div
      onClick={() => !n.is_read && onRead(n.uuid)}
      style={{
        display: "flex", gap: 12, padding: "14px 18px",
        background: n.is_read ? "transparent" : "var(--surface)",
        borderBottom: "1px solid var(--border)",
        cursor: n.is_read ? "default" : "pointer",
        transition: "background .15s",
      }}
      onMouseEnter={(e) => { if (!n.is_read) e.currentTarget.style.background = "var(--surface)"; }}
      onMouseLeave={(e) => { if (!n.is_read) e.currentTarget.style.background = "var(--surface)"; else e.currentTarget.style.background = "transparent"; }}
    >
      {/* Icon */}
      <div style={{ width: 36, height: 36, borderRadius: "50%", background: "var(--bg-secondary)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
        {CATEGORY_ICON[n.category] ?? "🔔"}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: n.is_read ? 400 : 600, wordBreak: "break-word" }}>{n.title}</p>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 11, padding: "2px 7px", borderRadius: 99, background: "var(--bg-secondary)", color: PRIORITY_COLOR[n.priority] ?? "var(--text-muted)", fontWeight: 600 }}>
              {n.priority}
            </span>
            {!n.is_read && (
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--accent)", flexShrink: 0, display: "inline-block" }} />
            )}
          </div>
        </div>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)", wordBreak: "break-word" }}>{n.message}</p>
        <p style={{ margin: "6px 0 0", fontSize: 11, color: "var(--text-muted)" }}>
          {n.sender_name} · {n.time_since} ago
        </p>
      </div>
    </div>
  );
}

// ── Preferences Panel ─────────────────────────────────────────────────────────

function PreferencesPanel({ onClose }: { onClose: () => void }) {
  const [pref, setPref] = useState<NotificationPreference | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getPreference().then(setPref).catch(() => toast.error("Failed to load preferences."));
  }, []);

  const toggle = (key: keyof NotificationPreference) => {
    if (!pref) return;
    setPref({ ...pref, [key]: !pref[key] });
  };

  const save = async () => {
    if (!pref) return;
    setSaving(true);
    try {
      await updatePreference(pref);
      toast.success("Preferences saved.");
      onClose();
    } catch { toast.error("Failed to save preferences."); }
    finally { setSaving(false); }
  };

  const TOGGLES: { key: keyof NotificationPreference; label: string }[] = [
    { key: "websocket_enabled", label: "Real-time (WebSocket)" },
    { key: "task_notifications", label: "Task notifications" },
    { key: "project_notifications", label: "Project notifications" },
    { key: "calendar_notifications", label: "Calendar notifications" },
    { key: "comment_notifications", label: "Comment notifications" },
    { key: "network_notifications", label: "Network notifications" },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "flex-start", justifyContent: "flex-end" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.4)" }} onClick={onClose} />
      <div style={{ position: "relative", width: 360, height: "100%", background: "var(--bg-primary)", borderLeft: "1px solid var(--border)", padding: 24, overflowY: "auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>Notification Preferences</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
        </div>
        {!pref ? <Loader2 size={20} className="animate-spin" style={{ margin: "32px auto" }} /> : (
          <>
            {TOGGLES.map(({ key, label }) => (
              <label key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", padding: "10px 0", borderBottom: "1px solid var(--border)" }}>
                <span style={{ fontSize: 14 }}>{label}</span>
                <div onClick={() => toggle(key)}
                  style={{
                    width: 44, height: 24, borderRadius: 12,
                    background: pref[key] ? "var(--accent)" : "var(--border)",
                    position: "relative", cursor: "pointer", transition: "background .2s",
                  }}>
                  <div style={{ position: "absolute", top: 3, left: pref[key] ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
                </div>
              </label>
            ))}
            <button onClick={save} disabled={saving}
              style={{ padding: "8px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 14, alignSelf: "flex-end" }}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : "Save"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPrefs, setShowPrefs] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");

  useEffect(() => {
    setLoading(true);
    getNotifications().then(setNotifs).catch(() => toast.error("Failed to load notifications.")).finally(() => setLoading(false));
  }, []);

  const handleRead = async (uuid: string) => {
    await markRead(uuid).catch(() => {});
    setNotifs((prev) => prev.map((n) => n.uuid === uuid ? { ...n, is_read: true } : n));
  };

  const handleMarkAllRead = async () => {
    await markAllRead().catch(() => {});
    setNotifs((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const displayed = filter === "unread" ? notifs.filter((n) => !n.is_read) : notifs;
  const unreadCount = notifs.filter((n) => !n.is_read).length;

  return (
    <div style={{ maxWidth: 720, margin: "0 auto", padding: "24px 16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Bell size={22} />
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Notifications</h1>
          {unreadCount > 0 && (
            <span style={{ fontSize: 12, fontWeight: 700, background: "var(--accent)", color: "#fff", borderRadius: 99, padding: "2px 8px" }}>
              {unreadCount}
            </span>
          )}
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", cursor: "pointer", fontSize: 13 }}>
              <CheckCheck size={14} />Mark all read
            </button>
          )}
          <button onClick={() => setShowPrefs(true)}
            style={{ display: "flex", alignItems: "center", gap: 5, padding: "6px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", cursor: "pointer", fontSize: 13 }}>
            <Settings size={14} />Preferences
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 0 }}>
        {(["all", "unread"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            style={{ padding: "8px 18px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: filter === f ? 600 : 400,
              borderBottom: filter === f ? "2px solid var(--accent)" : "2px solid transparent",
              color: filter === f ? "var(--text-primary)" : "var(--text-muted)", textTransform: "capitalize" }}>
            {f}{f === "unread" && unreadCount > 0 ? ` (${unreadCount})` : ""}
          </button>
        ))}
      </div>

      {/* List */}
      <div style={{ background: "var(--bg-primary)", border: "1px solid var(--border)", borderTop: "none", borderRadius: "0 0 12px 12px", overflow: "hidden" }}>
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", padding: 60 }}>
            <Loader2 size={24} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ padding: 60, textAlign: "center" }}>
            <BellOff size={32} style={{ color: "var(--text-muted)", margin: "0 auto 12px" }} />
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
              {filter === "unread" ? "No unread notifications." : "No notifications yet."}
            </p>
          </div>
        ) : (
          displayed.map((n) => <NotifCard key={n.uuid} n={n} onRead={handleRead} />)
        )}
      </div>

      {showPrefs && <PreferencesPanel onClose={() => setShowPrefs(false)} />}
    </div>
  );
}
