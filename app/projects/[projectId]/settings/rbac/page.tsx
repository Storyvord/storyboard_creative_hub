"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Loader2, Plus, Pencil, ShieldCheck } from "lucide-react";
import { toast } from "react-toastify";
import { getProjectRoles, createRole, updateRole, getPermissions } from "@/services/project";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { Role, Permission } from "@/types/project";

const ACTIONS = ["create", "read", "update", "delete"];

interface RoleFormState {
  role_name: string;
  description: string;
  permissions: Record<string, string[]>;
}

function RoleModal({
  projectId,
  role,
  allPermissions,
  onClose,
  onSaved,
}: {
  projectId: string;
  role?: Role;
  allPermissions: Permission[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<RoleFormState>({
    role_name: role?.role_name ?? "",
    description: role?.description ?? "",
    permissions: role?.permissions ? JSON.parse(JSON.stringify(role.permissions)) : {},
  });

  // Build modules list from allPermissions
  const modules = Array.from(new Set(allPermissions.map((p) => p.resource)));

  const togglePerm = (resource: string, action: string) => {
    setForm((prev) => {
      const current = prev.permissions[resource] ?? [];
      const updated = current.includes(action)
        ? current.filter((a) => a !== action)
        : [...current, action];
      return { ...prev, permissions: { ...prev.permissions, [resource]: updated } };
    });
  };

  const handleSave = async () => {
    if (!form.role_name.trim()) { toast.error("Role name is required."); return; }
    setLoading(true);
    try {
      if (role) {
        await updateRole(role.role_id, { ...form, is_global: false });
      } else {
        await createRole({ ...form, project_id: projectId, is_global: false });
      }
      toast.success(role ? "Role updated." : "Role created.");
      onSaved();
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Failed to save role.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
      <div className="relative w-full max-w-2xl rounded-xl border p-6 shadow-2xl mx-4" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <h2 className="text-lg font-semibold mb-5" style={{ color: "var(--text-primary)" }}>{role ? "Edit Role" : "Create Role"}</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Role Name *</label>
            <input
              value={form.role_name}
              onChange={(e) => setForm((p) => ({ ...p, role_name: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)" }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
              style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-primary)" }}
            />
          </div>

          {modules.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "var(--text-secondary)" }}>Permissions</label>
              <div className="rounded-lg border overflow-hidden" style={{ borderColor: "var(--border)" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ background: "var(--surface-raised)" }}>
                      <th className="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--text-muted)" }}>Module</th>
                      {ACTIONS.map((a) => (
                        <th key={a} className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-center" style={{ color: "var(--text-muted)" }}>{a}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {modules.map((mod) => (
                      <tr key={mod} className="border-t" style={{ borderColor: "var(--border)" }}>
                        <td className="px-3 py-2 font-medium" style={{ color: "var(--text-secondary)" }}>{mod}</td>
                        {ACTIONS.map((action) => (
                          <td key={action} className="px-3 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={(form.permissions[mod] ?? []).includes(action)}
                              onChange={() => togglePerm(mod, action)}
                              className="accent-emerald-500 h-3.5 w-3.5 cursor-pointer"
                            />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          <button onClick={onClose} className="px-4 py-2 text-sm transition-colors" style={{ color: "var(--text-secondary)" }}>Cancel</button>
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {loading && <Loader2 size={13} className="animate-spin" />}
            Save Role
          </button>
        </div>
      </div>
    </div>
  );
}

export default function RBACPage() {
  const params = useParams();
  const projectId = params.projectId as string;

  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | undefined>(undefined);

  const { permissions: myPerms, loading: permsLoading } = useProjectPermissions(projectId);

  const load = async () => {
    setLoading(true);
    try {
      const [rolesData, permsData] = await Promise.allSettled([
        getProjectRoles(projectId),
        getPermissions(),
      ]);
      if (rolesData.status === "fulfilled") setRoles(rolesData.value);
      if (permsData.status === "fulfilled") setAllPermissions(permsData.value);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [projectId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="animate-spin h-6 w-6" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Roles & Permissions</h1>
        <button
          onClick={() => { setEditingRole(undefined); setModalOpen(true); }}
          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-md transition-colors"
        >
          <Plus size={14} /> Create Role
        </button>
      </div>

      {/* My permissions */}
      {!permsLoading && myPerms.length > 0 && (
        <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <h2 className="text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <ShieldCheck size={12} /> My Permissions
          </h2>
          <div className="flex flex-wrap gap-1.5">
            {myPerms.map((p) => (
              <span key={p} className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{p}</span>
            ))}
          </div>
        </div>
      )}

      {/* Roles list */}
      {roles.length === 0 ? (
        <div className="text-center py-16">
          <p style={{ color: "var(--text-muted)" }}>No roles defined yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {roles.map((role) => (
            <div
              key={role.role_id}
              className="p-4 rounded-lg border"
              style={{ borderColor: "var(--border)", background: "var(--surface)" }}
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{role.role_name}</h3>
                  {role.description && <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>{role.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {role.member_count !== undefined && (
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{role.member_count} members</span>
                  )}
                  <button
                    onClick={() => { setEditingRole(role); setModalOpen(true); }}
                    className="p-1.5 rounded transition-colors hover:text-emerald-400"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              </div>
              {/* Permissions grouped by module */}
              {Object.keys(role.permissions).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {Object.entries(role.permissions).map(([mod, actions]) =>
                    (actions as string[]).map((action) => (
                      <span key={`${mod}-${action}`} className="text-[10px] px-1.5 py-0.5 rounded border" style={{ color: "var(--text-muted)", borderColor: "var(--border)", background: "var(--surface-raised)" }}>
                        {mod}:{action}
                      </span>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <RoleModal
          projectId={projectId}
          role={editingRole}
          allPermissions={allPermissions}
          onClose={() => setModalOpen(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
