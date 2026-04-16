"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Save, AlertTriangle, Settings } from "lucide-react";
import { toast } from "react-toastify";
import { getProject, updateProject, deleteProject } from "@/services/project";
import { Project } from "@/types/project";

const CONTENT_TYPES = [
  "Film", "TV Series", "Commercial", "Music Video", "Documentary",
  "Short Film", "Web Series", "Other",
];

const STATUSES = [
  "PLANNING", "DEVELOPMENT", "PRE_PRODUCTION", "IN_PROGRESS",
  "POST_PRODUCTION", "COMPLETED", "PAUSED", "CANCELLED", "RELEASED",
];

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");

  const [name, setName] = useState("");
  const [contentType, setContentType] = useState("");
  const [brief, setBrief] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [status, setStatus] = useState("PLANNING");

  useEffect(() => {
    getProject(projectId)
      .then((p) => {
        setProject(p);
        setName(p.name);
        setContentType(p.content_type ?? "");
        setBrief(p.brief ?? "");
        setAdditionalDetails(p.additional_details ?? "");
        setStatus(p.status ?? "PLANNING");
      })
      .catch(() => toast.error("Failed to load project."))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Project name is required."); return; }
    if (!brief.trim()) { toast.error("Brief is required."); return; }
    if (!contentType) { toast.error("Content type is required."); return; }
    setSaving(true);
    try {
      const updated = await updateProject(projectId, {
        name: name.trim(),
        content_type: contentType,
        brief: brief.trim(),
        additional_details: additionalDetails.trim(),
        status,
      });
      setProject(updated);
      toast.success("Project updated!");
    } catch (e: any) {
      const msg = Object.values(e?.response?.data || {}).flat().join(' ') || "Failed to update project.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== project?.name) {
      toast.error("Project name does not match.");
      return;
    }
    setDeleting(true);
    try {
      await deleteProject(projectId);
      toast.success("Project deleted.");
      router.push("/dashboard");
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Failed to delete project.");
      setDeleting(false);
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
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Settings className="h-6 w-6" style={{ color: "var(--text-muted)" }} />
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Project Settings</h1>
      </div>

      {/* General section */}
      <section className="rounded-xl border p-6 space-y-5" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <h2 className="text-sm font-semibold uppercase tracking-widest" style={{ color: "var(--text-muted)" }}>General</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Project Name <span className="text-red-400">*</span></label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Content Type <span className="text-red-400">*</span></label>
            <select
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
            >
              <option value="">Select type…</option>
              {CONTENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Brief <span className="text-red-400">*</span></label>
            <textarea
              value={brief}
              onChange={(e) => setBrief(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Additional Details</label>
            <textarea
              value={additionalDetails}
              onChange={(e) => setAdditionalDetails(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
            >
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Save Changes
          </button>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="rounded-xl border border-red-500/30 p-6 space-y-4" style={{ background: "var(--surface)" }}>
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          <h2 className="text-sm font-semibold uppercase tracking-widest text-red-400">Danger Zone</h2>
        </div>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Deleting this project is irreversible. All data including team members, callsheets, files, and reports will be permanently removed.
        </p>
        <button
          onClick={() => setDeleteConfirm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 border border-red-500/30 text-sm font-medium rounded-md transition-colors"
        >
          <AlertTriangle size={14} /> Delete Project
        </button>
      </section>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border p-6 shadow-2xl" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
            <h3 className="text-base font-semibold mb-2 text-red-400">Delete Project?</h3>
            <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
              Type <strong style={{ color: "var(--text-primary)" }}>{project?.name}</strong> to confirm deletion.
            </p>
            <input
              value={deleteInput}
              onChange={(e) => setDeleteInput(e.target.value)}
              placeholder={project?.name}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm mb-4 focus:outline-none focus:border-red-500"
              style={{ color: "var(--text-primary)" }}
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setDeleteConfirm(false); setDeleteInput(""); }} className="px-4 py-2 text-sm rounded-md border transition-colors" style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}>
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting || deleteInput !== project?.name} className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
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
