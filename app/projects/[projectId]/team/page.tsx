"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Trash2, UserPlus, Clock, Users, Shield, Plus, Pencil, ChevronDown, ChevronUp, X } from "lucide-react";
import { toast } from "react-toastify";
import {
  getProjectCrew, removeFromProject, getProjectRoles,
  changeMemberRole, getInvites, sendOnboardRequest,
  createRole, updateRole,
} from "@/services/project";
import { ProjectMember, Role, ProjectInvite } from "@/types/project";
import MemberAvatar from "@/components/project/MemberAvatar";

type Tab = "members" | "roles";

const ACTIONS = ["create", "read", "update", "delete"];

interface PermRow { module: string; actions: Set<string> }

function RoleModal({
  projectId,
  role,
  onClose,
  onSaved,
}: {
  projectId: string;
  role?: Role;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(role?.role_name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [rows, setRows] = useState<PermRow[]>(() => {
    if (!role?.permissions || Object.keys(role.permissions).length === 0)
      return [{ module: "", actions: new Set() }];
    return Object.entries(role.permissions).map(([mod, acts]) => ({ module: mod, actions: new Set(acts) }));
  });
  const [saving, setSaving] = useState(false);

  const addRow = () => setRows((prev) => [...prev, { module: "", actions: new Set() }]);
  const removeRow = (i: number) => setRows((prev) => prev.filter((_, idx) => idx !== i));
  const setModule = (i: number, val: string) =>
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, module: val } : r));
  const toggleAction = (i: number, action: string) =>
    setRows((prev) => prev.map((r, idx) => {
      if (idx !== i) return r;
      const next = new Set(r.actions);
      next.has(action) ? next.delete(action) : next.add(action);
      return { ...r, actions: next };
    }));

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Role name is required."); return; }
    const permissions: Record<string, string[]> = {};
    for (const row of rows) {
      if (row.module.trim()) {
        permissions[row.module.trim()] = Array.from(row.actions);
      }
    }
    setSaving(true);
    try {
      if (role) {
        await updateRole(role.role_id, { name: name.trim(), description: description.trim(), permissions });
      } else {
        await createRole({ name: name.trim(), description: description.trim(), project: projectId, is_global: false, permissions });
      }
      toast.success(role ? "Role updated!" : "Role created!");
      onSaved();
      onClose();
    } catch (e: any) {
      const msg = Object.values(e?.response?.data || {}).flat().join(' ') || "Failed to save role.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-xl rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-6 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{role ? "Edit Role" : "Create Role"}</h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Role Name <span className="text-red-400">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium" style={{ color: "var(--text-secondary)" }}>Permissions</label>
              <button onClick={addRow} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                <Plus size={12} /> Add Module
              </button>
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-md border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
                  <input
                    value={row.module}
                    onChange={(e) => setModule(i, e.target.value)}
                    placeholder="module (e.g. script)"
                    className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ACTIONS.map((action) => (
                      <label key={action} className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
                        <input
                          type="checkbox"
                          checked={row.actions.has(action)}
                          onChange={() => toggleAction(i, action)}
                          className="accent-emerald-500"
                        />
                        {action}
                      </label>
                    ))}
                  </div>
                  <button onClick={() => removeRow(i)} className="text-red-400 hover:text-red-300 flex-shrink-0"><X size={13} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-[var(--border)]">
          <button onClick={onClose} className="px-4 py-2 text-sm" style={{ color: "var(--text-secondary)" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
            {saving && <Loader2 size={13} className="animate-spin" />}
            {role ? "Save Changes" : "Create Role"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [tab, setTab] = useState<Tab>("members");
  const [crew, setCrew] = useState<ProjectMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvites, setShowInvites] = useState(false);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviting, setInviting] = useState(false);

  const [roleModal, setRoleModal] = useState<{ open: boolean; role?: Role }>({ open: false });

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

  const handleRemove = async (userId: string, displayName: string) => {
    if (!confirm(`Remove ${displayName} from this project?`)) return;
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
      const msg = Object.values(e?.response?.data || {}).flat().join(' ') || "Failed to send invite.";
      toast.error(msg);
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
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Team</h1>

      {/* Tabs */}
      <div className="flex border-b" style={{ borderColor: "var(--border)" }}>
        {(["members", "roles"] as const).map((t) => {
          const icons = { members: Users, roles: Shield };
          const labels = { members: "Members", roles: "Roles" };
          const Icon = icons[t];
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t ? "border-emerald-500 text-emerald-400" : "border-transparent"
              }`}
              style={tab !== t ? { color: "var(--text-muted)" } : undefined}
            >
              <Icon size={14} /> {labels[t]}
            </button>
          );
        })}
      </div>

      {/* Members Tab */}
      {tab === "members" && (
        <div className="space-y-6">
          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--text-muted)" }}>Members ({crew.length})</h2>
            {crew.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-10" style={{ color: "var(--text-muted)" }}>
                <Users size={32} className="opacity-40" />
                <p className="text-sm">No members yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {crew.map((member) => {
                  const full = [member.user.first_name, member.user.last_name].filter(Boolean).join(" ");
                  return (
                    <div key={member.user.id} className="flex items-center gap-4 p-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                      <MemberAvatar name={full || undefined} email={member.user.email} size="md" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: "var(--text-primary)" }}>{full || member.user.email}</p>
                        <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>{member.user.email}</p>
                      </div>
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
                      <button
                        onClick={() => handleRemove(member.user.id, full || member.user.email)}
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

          {invites.length > 0 && (
            <section>
              <button
                onClick={() => setShowInvites(!showInvites)}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest mb-2 w-full"
                style={{ color: "var(--text-muted)" }}
              >
                <Clock size={12} /> Pending Invites ({invites.length})
                {showInvites ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </button>
              {showInvites && (
                <div className="space-y-2">
                  {invites.map((inv) => (
                    <div key={inv.id} className="flex items-center gap-4 p-3 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                      <MemberAvatar email={inv.email} size="sm" />
                      <span className="text-sm flex-1" style={{ color: "var(--text-secondary)" }}>{inv.email}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">{inv.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

          <section>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <UserPlus size={12} /> Invite Member
            </h2>
            <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="flex gap-3 flex-wrap">
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@example.com"
                  onKeyDown={(e) => e.key === "Enter" && handleInvite()}
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
      )}

      {/* Roles Tab */}
      {tab === "roles" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>Roles ({roles.length})</h2>
            <button
              onClick={() => setRoleModal({ open: true })}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-md transition-colors"
            >
              <Plus size={13} /> Create Role
            </button>
          </div>

          {roles.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-10" style={{ color: "var(--text-muted)" }}>
              <Shield size={32} className="opacity-40" />
              <p className="text-sm">No roles defined yet.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {roles.map((role) => (
                <div key={role.role_id} className="p-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{role.role_name}</h3>
                        {role.member_count !== undefined && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            {role.member_count} member{role.member_count !== 1 ? "s" : ""}
                          </span>
                        )}
                        {role.is_global && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">global</span>
                        )}
                      </div>
                      {role.description && (
                        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{role.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => setRoleModal({ open: true, role })}
                      className="p-1.5 rounded transition-colors hover:text-emerald-400"
                      style={{ color: "var(--text-muted)" }}
                    >
                      <Pencil size={13} />
                    </button>
                  </div>
                  {Object.keys(role.permissions).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {Object.entries(role.permissions).map(([mod, acts]) => (
                        <span key={mod} className="text-xs px-2 py-0.5 rounded border" style={{ borderColor: "var(--border)", color: "var(--text-muted)", background: "var(--surface-raised)" }}>
                          {mod}: {(acts as string[]).join(", ")}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {roleModal.open && (
        <RoleModal
          projectId={projectId}
          role={roleModal.role}
          onClose={() => setRoleModal({ open: false })}
          onSaved={load}
        />
      )}
    </div>
  );
}
