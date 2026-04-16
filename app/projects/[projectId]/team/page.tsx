"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Trash2, UserPlus, Clock } from "lucide-react";
import { toast } from "react-toastify";
import {
  getProjectCrew, removeFromProject, getProjectRoles,
  changeMemberRole, getInvites, sendOnboardRequest,
} from "@/services/project";
import { ProjectMember, Role, ProjectInvite } from "@/types/project";
import MemberAvatar from "@/components/project/MemberAvatar";

export default function TeamPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [crew, setCrew] = useState<ProjectMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [loading, setLoading] = useState(true);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviting, setInviting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [crewData, rolesData, inviteData] = await Promise.allSettled([
        getProjectCrew(projectId),
        getProjectRoles(projectId),
        getInvites(projectId),
      ]);
      if (crewData.status === "fulfilled") setCrew(crewData.value);
      if (rolesData.status === "fulfilled") setRoles(rolesData.value);
      if (inviteData.status === "fulfilled") setInvites(inviteData.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  const handleRemove = async (userId: string) => {
    try {
      await removeFromProject(projectId, userId);
      toast.success("Member removed.");
      setCrew((prev) => prev.filter((m) => m.user.id !== userId));
    } catch {
      toast.error("Failed to remove member.");
    }
  };

  const handleChangeRole = async (userId: string, roleId: number) => {
    try {
      await changeMemberRole(projectId, { user_id: userId, role_id: roleId });
      toast.success("Role updated.");
      load();
    } catch {
      toast.error("Failed to change role.");
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error("Email is required."); return; }
    setInviting(true);
    try {
      await sendOnboardRequest({ email: inviteEmail.trim(), project_id: projectId, role: inviteRole || undefined });
      toast.success("Invite sent!");
      setInviteEmail("");
      setInviteRole("");
      load();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Failed to send invite.");
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin h-6 w-6" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Team</h1>

      {/* Members */}
      <section>
        <h2 className="text-sm font-semibold mb-3 uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Members ({crew.length})</h2>
        {crew.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>No members yet.</p>
        ) : (
          <div className="space-y-2">
            {crew.map((member) => {
              const full = [member.user.first_name, member.user.last_name].filter(Boolean).join(" ");
              return (
                <div
                  key={member.user.id}
                  className="flex items-center gap-4 p-4 rounded-lg border"
                  style={{ borderColor: "var(--border)", background: "var(--surface)" }}
                >
                  <MemberAvatar name={full || undefined} email={member.user.email} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{full || member.user.email}</p>
                    <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{member.user.email}</p>
                  </div>
                  {/* Role */}
                  {roles.length > 0 ? (
                    <select
                      value={member.role?.id ?? ""}
                      onChange={(e) => handleChangeRole(member.user.id, Number(e.target.value))}
                      className="text-xs px-2 py-1 rounded-md border focus:outline-none focus:border-emerald-500"
                      style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-secondary)" }}
                    >
                      <option value="">No role</option>
                      {roles.map((r) => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
                    </select>
                  ) : member.role ? (
                    <span className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-secondary)", background: "var(--surface-raised)" }}>
                      {member.role.name}
                    </span>
                  ) : null}
                  {/* Remove */}
                  <button
                    onClick={() => handleRemove(member.user.id)}
                    className="p-1.5 rounded transition-colors hover:text-red-400"
                    style={{ color: "var(--text-muted)" }}
                    title="Remove member"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Pending invites */}
      {invites.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold mb-3 uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <Clock size={12} /> Pending Invites ({invites.length})
          </h2>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center gap-4 p-3 rounded-lg border"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <MemberAvatar email={inv.email} size="sm" />
                <span className="text-sm flex-1" style={{ color: "var(--text-secondary)" }}>{inv.email}</span>
                <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  {inv.status}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Invite form */}
      <section>
        <h2 className="text-sm font-semibold mb-3 uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
          <UserPlus size={12} /> Invite Member
        </h2>
        <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex gap-3 flex-wrap">
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="flex-1 min-w-[200px] rounded-md border px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)" }}
            />
            {roles.length > 0 && (
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="rounded-md border px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-secondary)" }}
              >
                <option value="">No role</option>
                {roles.map((r) => <option key={r.role_id} value={r.role_name}>{r.role_name}</option>)}
              </select>
            )}
            <button
              onClick={handleInvite}
              disabled={inviting}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
            >
              {inviting ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
              Send Invite
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
