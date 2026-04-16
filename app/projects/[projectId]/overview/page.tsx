"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Pencil, Trash2, Users, Calendar } from "lucide-react";
import { toast } from "react-toastify";
import { getProject, deleteProject, getProjectCrew } from "@/services/project";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { Project, ProjectMember } from "@/types/project";
import StatusBadge from "@/components/project/StatusBadge";
import MemberAvatar from "@/components/project/MemberAvatar";
import EditProjectModal from "@/components/project/EditProjectModal";

export default function OverviewPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [crew, setCrew] = useState<ProjectMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const { canDo } = useProjectPermissions(projectId);

  useEffect(() => {
    Promise.all([
      getProject(projectId).then(setProject),
      getProjectCrew(projectId).then(setCrew).catch(() => {}),
    ])
      .catch((e) => {
        toast.error("Failed to load project.");
        console.error(e);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteProject(projectId);
      toast.success("Project deleted.");
      router.push("/dashboard");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Failed to delete project.");
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <Loader2 className="animate-spin h-6 w-6" style={{ color: "var(--text-muted)" }} />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center h-full min-h-[60vh]">
        <p style={{ color: "var(--text-muted)" }}>Project not found.</p>
      </div>
    );
  }

  const formattedDate = project.created_at
    ? new Date(project.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : null;

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: "var(--text-primary)" }}>{project.name}</h1>
          <div className="flex items-center gap-2 flex-wrap">
            {project.status && <StatusBadge status={project.status} />}
            {project.content_type && (
              <span className="text-xs px-2 py-0.5 rounded border" style={{ color: "var(--text-secondary)", borderColor: "var(--border)", background: "var(--surface-raised)" }}>
                {project.content_type}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors hover:border-emerald-500/50"
            style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-secondary)" }}
          >
            <Pencil size={13} /> Edit
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-sm font-medium transition-colors hover:border-red-500/50 hover:text-red-400"
            style={{ borderColor: "var(--border)", background: "var(--surface-raised)", color: "var(--text-secondary)" }}
          >
            <Trash2 size={13} /> Delete
          </button>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-4">
        {/* Brief */}
        {project.brief && (
          <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Brief</h2>
            <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{project.brief}</p>
          </div>
        )}

        {/* Additional details + Created row */}
        <div className="grid grid-cols-1 gap-4">
          {project.additional_details && (
            <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--text-muted)" }}>Additional Details</h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>{project.additional_details}</p>
            </div>
          )}
          {formattedDate && (
            <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <h2 className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "var(--text-muted)" }}>Created</h2>
              <p className="text-sm flex items-center gap-1.5" style={{ color: "var(--text-primary)" }}>
                <Calendar size={13} /> {formattedDate}
              </p>
            </div>
          )}
        </div>

        {/* Team preview */}
        <div className="p-4 rounded-lg border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold uppercase tracking-widest flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
              <Users size={12} /> Team Members
            </h2>
            <Link href={`/projects/${projectId}/team`} className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors">
              View all →
            </Link>
          </div>
          {crew.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>No team members yet.</p>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              {crew.slice(0, 5).map((m) => {
                const full = [m.user.first_name, m.user.last_name].filter(Boolean).join(" ");
                return (
                  <MemberAvatar key={m.user.id} name={full || undefined} email={m.user.email} size="md" />
                );
              })}
              {crew.length > 5 && (
                <span className="text-xs" style={{ color: "var(--text-muted)" }}>+{crew.length - 5} more</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Edit modal */}
      {editOpen && (
        <EditProjectModal
          project={project}
          onClose={() => setEditOpen(false)}
          onUpdated={(updated) => setProject(updated)}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border p-6 shadow-2xl" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h3 className="text-base font-semibold mb-2" style={{ color: "var(--text-primary)" }}>Delete Project?</h3>
            <p className="text-sm mb-5" style={{ color: "var(--text-secondary)" }}>
              This will permanently delete <strong>{project.name}</strong> and all its data. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm rounded-md border transition-colors" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
                {deleting && <Loader2 size={13} className="animate-spin" />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
