"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Loader2, Trash2, UserPlus, Clock, Users, Shield, Plus, Pencil, X,
  ChevronDown, ChevronUp, Mail, Search,
} from "lucide-react";
import { toast } from "react-toastify";
import {
  getProjectCrew, removeFromProject, getProjectRoles,
  changeMemberRole, getInvites, sendOnboardRequest,
  createRole, updateRole,
} from "@/services/project";
import { ProjectMember, Role, ProjectInvite } from "@/types/project";
import MemberAvatar from "@/components/project/MemberAvatar";

type Tab = "crew" | "roles";
const ACTIONS = ["create", "read", "update", "delete"];

// ── Role modal ───────────────────────────────────────────────────────────────
interface PermRow { module: string; actions: Set<string> }

function RoleModal({ projectId, role, onClose, onSaved }: {
  projectId: string; role?: Role; onClose: () => void; onSaved: () => void;
}) {
  const [name, setName] = useState(role?.role_name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [rows, setRows] = useState<PermRow[]>(() => {
    if (!role?.permissions || Object.keys(role.permissions).length === 0)
      return [{ module: "", actions: new Set() }];
    return Object.entries(role.permissions).map(([mod, acts]) => ({ module: mod, actions: new Set(acts) }));
  });
  const [saving, setSaving] = useState(false);

  const addRow = () => setRows((p) => [...p, { module: "", actions: new Set() }]);
  const removeRow = (i: number) => setRows((p) => p.filter((_, idx) => idx !== i));
  const setModule = (i: number, v: string) => setRows((p) => p.map((r, idx) => idx === i ? { ...r, module: v } : r));
  const toggleAction = (i: number, a: string) => setRows((p) => p.map((r, idx) => {
    if (idx !== i) return r;
    const next = new Set(r.actions);
    next.has(a) ? next.delete(a) : next.add(a);
    return { ...r, actions: next };
  }));

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Role name is required."); return; }
    const permissions: Record<string, string[]> = {};
    for (const row of rows) {
      if (row.module.trim()) permissions[row.module.trim()] = Array.from(row.actions);
    }
    setSaving(true);
    try {
      if (role) await updateRole(role.role_id, { name: name.trim(), description: description.trim(), permissions });
      else await createRole({ name: name.trim(), description: description.trim(), project: projectId, is_global: false, permissions });
      toast.success(role ? "Role updated!" : "Role created!");
      onSaved(); onClose();
    } catch (e: any) {
      toast.error(Object.values(e?.response?.data || {}).flat().join(" ") || "Failed to save role.");
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-xl rounded-xl border p-6 shadow-2xl max-h-[90vh] overflow-y-auto" style={{ borderColor: "var(--border)", background: "var(--surface)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{role ? "Edit Role" : "Create Role"}</h2>
          <button onClick={onClose} style={{ color: "var(--text-muted)" }}><X size={16} /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Role Name <span className="text-red-400">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium" style={{ color: "var(--text-secondary)" }}>Permissions</label>
              <button onClick={addRow} className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                <Plus size={11} /> Add module
              </button>
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-md border" style={{ borderColor: "var(--border)", background: "var(--surface-raised)" }}>
                  <input
                    value={row.module} onChange={(e) => setModule(i, e.target.value)}
                    placeholder="module (e.g. script)"
                    className="flex-1 min-w-0 bg-transparent text-sm focus:outline-none"
                    style={{ color: "var(--text-primary)" }}
                  />
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {ACTIONS.map((action) => (
                      <label key={action} className="flex items-center gap-1 text-xs cursor-pointer" style={{ color: "var(--text-muted)" }}>
                        <input type="checkbox" checked={row.actions.has(action)} onChange={() => toggleAction(i, action)} className="accent-emerald-500" />
                        {action}
                      </label>
                    ))}
                  </div>
                  <button onClick={() => removeRow(i)} className="text-red-400 flex-shrink-0"><X size={12} /></button>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-[var(--border)]">
          <button onClick={onClose} className="px-4 py-2 text-sm" style={{ color: "var(--text-secondary)" }}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold rounded-md transition-colors">
            {saving && <Loader2 size={12} className="animate-spin" />}
            {role ? "Save Changes" : "Create Role"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Crew member card ─────────────────────────────────────────────────────────
function MemberCard({ member, roles, onRemove, onChangeRole }: {
  member: ProjectMember;
  roles: Role[];
  onRemove: (userId: string, name: string) => void;
  onChangeRole: (userId: string, roleId: number, memberName: string) => void;
}) {
  const fullName = [member.user.first_name, member.user.last_name].filter(Boolean).join(" ");
  const displayName = fullName || member.user.email;
  const initials = fullName
    ? fullName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : (member.user.email?.[0] ?? "?").toUpperCase();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--surface)",
        transition: "border-color 0.15s",
      }}
      className="hover:border-emerald-500/20 group"
    >
      {/* Avatar */}
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          background: "rgba(34,197,94,0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 600,
          color: "#22c55e",
          flexShrink: 0,
          letterSpacing: "0.02em",
        }}
      >
        {initials}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {displayName}
        </p>
        {member.role?.role_name && (
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{member.role.role_name}</p>
        )}
      </div>

      {/* Role selector */}
      {roles.length > 0 ? (
        <select
          value={member.role?.role_id ?? ""}
          onChange={(e) => onChangeRole(member.user.id, Number(e.target.value), displayName)}
          style={{
            fontSize: 11,
            padding: "3px 8px",
            borderRadius: 6,
            border: "1px solid var(--border)",
            background: "var(--surface-raised)",
            color: "var(--text-secondary)",
            cursor: "pointer",
            flexShrink: 0,
            maxWidth: 130,
          }}
        >
          <option value="">No role</option>
          {roles.map((r) => <option key={r.role_id} value={r.role_id}>{r.role_name}</option>)}
        </select>
      ) : member.role ? (
        <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 20, border: "1px solid var(--border)", color: "var(--text-muted)", background: "var(--surface-raised)", flexShrink: 0 }}>
          {member.role.role_name}
        </span>
      ) : null}

      {/* Remove */}
      <button
        onClick={() => onRemove(member.user.id, displayName)}
        title="Remove member"
        className="opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, display: "flex", flexShrink: 0 }}
      >
        <Trash2 size={13} />
      </button>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function TeamPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [tab, setTab] = useState<Tab>("crew");
  const [crew, setCrew] = useState<ProjectMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [invites, setInvites] = useState<ProjectInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [showPendingInvites, setShowPendingInvites] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviting, setInviting] = useState(false);
  const [roleModal, setRoleModal] = useState<{ open: boolean; role?: Role }>({ open: false });
  const [search, setSearch] = useState("");

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
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [projectId]);

  const handleRemove = async (userId: string, name: string) => {
    if (!confirm(`Remove ${name} from this project?`)) return;
    try {
      await removeFromProject(projectId, userId);
      toast.success("Member removed.");
      setCrew((p) => p.filter((m) => m.user.id !== userId));
    } catch { toast.error("Failed to remove member."); }
  };

  const handleChangeRole = async (userId: string, roleId: number, memberName: string) => {
    const targetRoleName = roles.find((r) => r.role_id === roleId)?.role_name ?? "No role";
    if (!window.confirm(`Change ${memberName}'s role to ${targetRoleName}?`)) return;
    try {
      await changeMemberRole(projectId, { user_id: userId, role_id: roleId });
      toast.success("Role updated.");
      load();
    } catch { toast.error("Failed to change role."); }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim()) { toast.error("Email is required."); return; }
    setInviting(true);
    try {
      await sendOnboardRequest({ email: inviteEmail.trim(), project_id: projectId, role: inviteRole || undefined });
      toast.success("Invite sent!");
      setInviteEmail(""); setInviteRole(""); setShowInviteForm(false);
      load();
    } catch (e: any) {
      toast.error(Object.values(e?.response?.data || {}).flat().join(" ") || "Failed to send invite.");
    } finally { setInviting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin h-5 w-5" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  // Group crew by role for the roster view
  const roleGroups: Record<string, ProjectMember[]> = {};
  const unassigned: ProjectMember[] = [];
  for (const m of crew) {
    if (m.role?.role_name) {
      (roleGroups[m.role.role_name] = roleGroups[m.role.role_name] ?? []).push(m);
    } else {
      unassigned.push(m);
    }
  }
  if (unassigned.length > 0) roleGroups["Unassigned"] = unassigned;

  const filteredCrew = search.trim()
    ? crew.filter((m) => {
        const full = [m.user.first_name, m.user.last_name].filter(Boolean).join(" ").toLowerCase();
        const q = search.toLowerCase();
        return full.includes(q) || m.user.email.toLowerCase().includes(q) || m.role?.role_name?.toLowerCase().includes(q);
      })
    : null; // null = show grouped view

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>Team</h1>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {crew.length} member{crew.length !== 1 ? "s" : ""}{invites.length > 0 ? ` · ${invites.length} pending` : ""}
          </p>
        </div>
        <button
          onClick={() => setShowInviteForm((v) => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 6,
            padding: "7px 14px", borderRadius: 8,
            background: "linear-gradient(135deg,#22c55e,#16a34a)",
            border: "none", cursor: "pointer",
            fontSize: 12, fontWeight: 600, color: "#fff",
            boxShadow: "0 4px 12px rgba(34,197,94,0.25)",
          }}
        >
          <UserPlus size={13} /> Invite
        </button>
      </div>

      {/* Invite form */}
      {showInviteForm && (
        <div
          style={{
            padding: "14px 16px",
            borderRadius: 10,
            border: "1px solid var(--border)",
            background: "var(--surface)",
            marginBottom: 20,
          }}
        >
          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)", marginBottom: 10 }}>Invite a team member</p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              onKeyDown={(e) => e.key === "Enter" && handleInvite()}
              style={{
                flex: 1, minWidth: 200, padding: "7px 12px", borderRadius: 8,
                border: "1px solid var(--border)", background: "var(--surface-raised)",
                fontSize: 13, color: "var(--text-primary)", outline: "none",
              }}
              className="focus:border-emerald-500"
            />
            {roles.length > 0 && (
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                style={{
                  padding: "7px 10px", borderRadius: 8,
                  border: "1px solid var(--border)", background: "var(--surface-raised)",
                  fontSize: 12, color: "var(--text-secondary)", cursor: "pointer",
                }}
              >
                <option value="">No role</option>
                {roles.map((r) => <option key={r.role_id} value={r.role_name}>{r.role_name}</option>)}
              </select>
            )}
            <button
              onClick={handleInvite} disabled={inviting}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 14px", borderRadius: 8,
                background: "#22c55e", border: "none", cursor: inviting ? "not-allowed" : "pointer",
                fontSize: 12, fontWeight: 600, color: "#fff", opacity: inviting ? 0.7 : 1,
              }}
            >
              {inviting ? <Loader2 size={12} className="animate-spin" /> : <Mail size={12} />}
              Send
            </button>
            <button
              onClick={() => setShowInviteForm(false)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "7px 8px" }}
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 20 }}>
        {([["crew", Users, "Crew"], ["roles", Shield, "Roles"]] as const).map(([t, Icon, label]) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "8px 16px",
              borderBottom: `2px solid ${tab === t ? "#22c55e" : "transparent"}`,
              marginBottom: -1,
              background: "none", border: "none",
              fontSize: 13, fontWeight: tab === t ? 600 : 400,
              color: tab === t ? "#22c55e" : "var(--text-muted)",
              cursor: "pointer", transition: "all 0.15s",
            }}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* ── CREW TAB ─────────────────────────────────────────────────────────── */}
      {tab === "crew" && (
        <div>
          {/* Search */}
          {crew.length > 1 && (
            <div style={{ position: "relative", marginBottom: 16 }}>
              <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search crew…"
                style={{
                  width: "100%", padding: "7px 12px 7px 30px",
                  borderRadius: 8, border: "1px solid var(--border)",
                  background: "var(--surface-raised)", fontSize: 13,
                  color: "var(--text-primary)", outline: "none",
                }}
              />
            </div>
          )}

          {crew.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
              <Users size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>No crew members yet.</p>
              <p style={{ fontSize: 11, marginTop: 4 }}>Invite someone to get started.</p>
            </div>
          ) : filteredCrew ? (
            // Flat search results
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filteredCrew.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", padding: "24px 0" }}>No results for "{search}"</p>
              ) : (
                filteredCrew.map((m) => (
                  <MemberCard key={m.user.id} member={m} roles={roles} onRemove={handleRemove} onChangeRole={handleChangeRole} />
                ))
              )}
            </div>
          ) : (
            // Grouped by role
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {Object.entries(roleGroups).map(([groupName, members]) => (
                <RoleGroup
                  key={groupName}
                  groupName={groupName}
                  members={members}
                  roles={roles}
                  onRemove={handleRemove}
                  onChangeRole={handleChangeRole}
                />
              ))}
            </div>
          )}

          {/* Pending invites */}
          {invites.length > 0 && (
            <div style={{ marginTop: 24 }}>
              <button
                onClick={() => setShowPendingInvites((v) => !v)}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "none", border: "none", cursor: "pointer",
                  fontSize: 11, fontWeight: 600, color: "var(--text-muted)",
                  textTransform: "uppercase", letterSpacing: "0.05em",
                  padding: "4px 0", marginBottom: 8,
                }}
              >
                <Clock size={11} />
                Pending Invites ({invites.length})
                {showPendingInvites ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
              </button>
              {showPendingInvites && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {invites.map((inv) => (
                    <div
                      key={inv.id}
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        padding: "8px 12px", borderRadius: 8,
                        border: "1px solid var(--border)", background: "var(--surface)",
                      }}
                    >
                      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "rgba(234,179,8,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Mail size={12} color="#eab308" />
                      </div>
                      <span style={{ flex: 1, fontSize: 12, color: "var(--text-secondary)" }}>{inv.email}</span>
                      <span style={{ fontSize: 10, padding: "2px 7px", borderRadius: 20, background: "rgba(234,179,8,0.1)", color: "#eab308", border: "1px solid rgba(234,179,8,0.2)" }}>
                        {inv.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── ROLES TAB ────────────────────────────────────────────────────────── */}
      {tab === "roles" && (
        <div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14 }}>
            <button
              onClick={() => setRoleModal({ open: true })}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "7px 14px", borderRadius: 8,
                background: "#22c55e", border: "none", cursor: "pointer",
                fontSize: 12, fontWeight: 600, color: "#fff",
              }}
            >
              <Plus size={13} /> Create Role
            </button>
          </div>

          {roles.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--text-muted)" }}>
              <Shield size={32} style={{ margin: "0 auto 10px", opacity: 0.3 }} />
              <p style={{ fontSize: 13 }}>No roles defined yet.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {roles.map((role) => {
                const membersWithRole = crew.filter((m) => m.role?.role_id === role.role_id);
                return (
                  <div
                    key={role.role_id}
                    style={{
                      borderRadius: 10,
                      border: "1px solid var(--border)",
                      background: "var(--surface)",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: "rgba(34,197,94,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <Shield size={13} color="#22c55e" />
                        </div>
                        <div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{role.role_name}</p>
                            {role.is_global && (
                              <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 20, border: "1px solid rgba(59,130,246,0.3)", color: "#3b82f6", background: "rgba(59,130,246,0.1)" }}>global</span>
                            )}
                          </div>
                          {role.description && (
                            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>{role.description}</p>
                          )}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {membersWithRole.length > 0 && (
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            {membersWithRole.length} member{membersWithRole.length !== 1 ? "s" : ""}
                          </span>
                        )}
                        <button
                          onClick={() => setRoleModal({ open: true, role })}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: 4, borderRadius: 6, display: "flex" }}
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    </div>

                    {/* Permissions */}
                    {Object.keys(role.permissions).length > 0 && (
                      <div style={{ padding: "0 14px 10px", display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {Object.entries(role.permissions).map(([mod, acts]) => (
                          <span
                            key={mod}
                            style={{
                              fontSize: 11, padding: "2px 8px", borderRadius: 6,
                              border: "1px solid var(--border)", color: "var(--text-muted)",
                              background: "var(--surface-raised)",
                            }}
                          >
                            <span style={{ color: "var(--text-secondary)", fontWeight: 500 }}>{mod}</span>
                            {(acts as string[]).length > 0 && (
                              <span style={{ marginLeft: 4, opacity: 0.7 }}>{(acts as string[]).join(" · ")}</span>
                            )}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Members assigned to this role */}
                    {membersWithRole.length > 0 && (
                      <div style={{ borderTop: "1px solid var(--border)", padding: "8px 14px", display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {membersWithRole.map((m) => {
                          const name = [m.user.first_name, m.user.last_name].filter(Boolean).join(" ");
                          const initials = name
                            ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
                            : m.user.email[0].toUpperCase();
                          return (
                            <div key={m.user.id} style={{ display: "flex", alignItems: "center", gap: 5, padding: "2px 8px 2px 4px", borderRadius: 20, border: "1px solid var(--border)", background: "var(--surface-raised)" }}>
                              <div style={{ width: 18, height: 18, borderRadius: "50%", background: "rgba(34,197,94,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#22c55e" }}>
                                {initials}
                              </div>
                              <span style={{ fontSize: 11, color: "var(--text-secondary)" }}>{name || m.user.email}</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
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

// ── Role group (crew grouped by role) ────────────────────────────────────────
function RoleGroup({ groupName, members, roles, onRemove, onChangeRole }: {
  groupName: string;
  members: ProjectMember[];
  roles: Role[];
  onRemove: (userId: string, name: string) => void;
  onChangeRole: (userId: string, roleId: number, memberName: string) => void;
}) {
  const [open, setOpen] = useState(true);
  const isUnassigned = groupName === "Unassigned";

  return (
    <div>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: "flex", alignItems: "center", gap: 6, width: "100%",
          background: "none", border: "none", cursor: "pointer",
          padding: "4px 0", marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: isUnassigned ? "var(--text-muted)" : "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {groupName}
        </span>
        <span style={{ fontSize: 10, color: "var(--text-muted)" }}>({members.length})</span>
        <span style={{ marginLeft: "auto", color: "var(--text-muted)" }}>
          {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </span>
      </button>
      {open && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 6 }}>
          {members.map((m) => (
            <MemberCard key={m.user.id} member={m} roles={roles} onRemove={onRemove} onChangeRole={onChangeRole} />
          ))}
        </div>
      )}
    </div>
  );
}
