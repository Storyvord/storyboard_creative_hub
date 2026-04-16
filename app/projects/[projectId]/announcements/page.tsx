"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Megaphone, Plus, AlertTriangle, Loader2, X, User2 } from "lucide-react";
import { toast } from "react-toastify";
import {
  getProjectAnnouncements, createProjectAnnouncement,
  ProjectAnnouncement,
} from "@/services/announcements";

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Avatar({ name, image, size = 36 }: { name: string | null; image: string | null; size?: number }) {
  const initials = (name ?? "?").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (image) return <img src={image} alt={name ?? "user"} style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: "50%", background: "var(--accent)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.36, fontWeight: 700, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

// ── New Announcement Modal ────────────────────────────────────────────────────

function NewAnnouncementModal({ projectId, membershipId, onCreated, onClose }: {
  projectId: string; membershipId: number | null;
  onCreated: (a: ProjectAnnouncement) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!title.trim()) { toast.error("Title is required."); return; }
    if (!message.trim()) { toast.error("Message is required."); return; }
    setLoading(true);
    try {
      const ann = await createProjectAnnouncement({ title: title.trim(), message: message.trim(), project: projectId, is_urgent: isUrgent });
      onCreated(ann);
      toast.success("Announcement posted!");
    } catch { toast.error("Failed to post announcement."); }
    finally { setLoading(false); }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.5)" }} onClick={onClose} />
      <div style={{ position: "relative", width: "min(520px, 96vw)", background: "var(--bg-primary)", borderRadius: 16, border: "1px solid var(--border)", padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>New Announcement</h2>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)" }}><X size={18} /></button>
        </div>

        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title"
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 14 }} />

        <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your announcement…" rows={5}
          style={{ padding: "10px 12px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", fontSize: 14, resize: "vertical" }} />

        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 14 }}>
          <div onClick={() => setIsUrgent(!isUrgent)}
            style={{ width: 44, height: 24, borderRadius: 12, background: isUrgent ? "#f87171" : "var(--border)", position: "relative", cursor: "pointer", transition: "background .2s", flexShrink: 0 }}>
            <div style={{ position: "absolute", top: 3, left: isUrgent ? 23 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .2s" }} />
          </div>
          <span style={{ color: isUrgent ? "#f87171" : "var(--text-primary)", fontWeight: isUrgent ? 600 : 400 }}>
            {isUrgent && <AlertTriangle size={14} style={{ display: "inline", marginRight: 4 }} />}Mark as Urgent
          </span>
        </label>

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text-primary)", cursor: "pointer", fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={submit} disabled={loading}
            style={{ padding: "8px 20px", borderRadius: 8, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            {loading ? <Loader2 size={14} className="animate-spin" /> : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Announcement Card ─────────────────────────────────────────────────────────

function AnnouncementCard({ ann }: { ann: ProjectAnnouncement }) {
  const [expanded, setExpanded] = useState(true);
  const creator = ann.creator;
  const name = creator.personal_details?.full_name ?? `Member #${creator.user_id}`;
  const image = creator.personal_details?.profile_picture ?? null;

  return (
    <article style={{
      background: "var(--bg-primary)",
      border: `1px solid ${ann.is_urgent ? "#f87171" : "var(--border)"}`,
      borderRadius: 14,
      padding: "18px 20px",
      position: "relative",
      overflow: "hidden",
    }}>
      {ann.is_urgent && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#f87171", borderRadius: "14px 14px 0 0" }} />
      )}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <Avatar name={name} image={image} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
            <div>
              <span style={{ fontSize: 14, fontWeight: 600 }}>{name}</span>
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: 8 }}>{creator.role?.name}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
              {ann.is_urgent && (
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 99, background: "rgba(248,113,113,.12)", color: "#f87171", display: "flex", alignItems: "center", gap: 4 }}>
                  <AlertTriangle size={11} />URGENT
                </span>
              )}
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>{timeAgo(ann.created_at)}</span>
            </div>
          </div>

          <h3 style={{ margin: "8px 0 4px", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{ann.title}</h3>
          <p style={{ margin: 0, fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {ann.message}
          </p>

          <div style={{ marginTop: 12, display: "flex", gap: 12, fontSize: 12, color: "var(--text-muted)" }}>
            <span><User2 size={12} style={{ display: "inline", marginRight: 4 }} />{ann.recipients.length} recipient{ann.recipients.length !== 1 ? "s" : ""}</span>
            <span>{new Date(ann.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnnouncementsPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const [announcements, setAnnouncements] = useState<ProjectAnnouncement[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<"all" | "urgent">("all");

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    getProjectAnnouncements(projectId)
      .then(setAnnouncements)
      .catch(() => toast.error("Failed to load announcements."))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleCreated = (ann: ProjectAnnouncement) => {
    setAnnouncements((prev) => [ann, ...prev]);
    setShowModal(false);
  };

  const displayed = filter === "urgent" ? announcements.filter((a) => a.is_urgent) : announcements;
  const urgentCount = announcements.filter((a) => a.is_urgent).length;

  return (
    <div style={{ height: "100%", overflow: "auto" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Megaphone size={22} />
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Announcements</h1>
            {urgentCount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, background: "#f87171", color: "#fff", borderRadius: 99, padding: "2px 8px" }}>
                {urgentCount} urgent
              </span>
            )}
          </div>
          <button onClick={() => setShowModal(true)}
            style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 10, background: "var(--accent)", color: "#fff", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
            <Plus size={15} />New Announcement
          </button>
        </div>

        {/* Filter tabs */}
        <div style={{ display: "flex", gap: 0, borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
          {(["all", "urgent"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ padding: "8px 18px", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: filter === f ? 600 : 400,
                borderBottom: filter === f ? "2px solid var(--accent)" : "2px solid transparent",
                color: filter === f ? "var(--text-primary)" : "var(--text-muted)", textTransform: "capitalize" }}>
              {f === "urgent" ? `Urgent${urgentCount > 0 ? ` (${urgentCount})` : ""}` : `All (${announcements.length})`}
            </button>
          ))}
        </div>

        {/* Content */}
        {loading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 80 }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--text-muted)" }} />
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "var(--text-muted)" }}>
            <Megaphone size={40} style={{ opacity: 0.2, margin: "0 auto 16px" }} />
            <p style={{ fontSize: 15, fontWeight: 500 }}>
              {filter === "urgent" ? "No urgent announcements." : "No announcements yet."}
            </p>
            {filter === "all" && (
              <p style={{ fontSize: 13, marginTop: 6 }}>Post an announcement to keep your team informed.</p>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {displayed.map((ann) => <AnnouncementCard key={ann.id} ann={ann} />)}
          </div>
        )}
      </div>

      {showModal && (
        <NewAnnouncementModal
          projectId={projectId}
          membershipId={null}
          onCreated={handleCreated}
          onClose={() => setShowModal(false)}
        />
      )}
    </div>
  );
}
