"use client";

import { useState } from "react";
import { X, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import { updateProject } from "@/services/project";
import { Project } from "@/types/project";

const CONTENT_TYPES = [
  "Film", "TV Series", "Commercial", "Music Video", "Documentary",
  "Short Film", "Web Series", "Other",
];

const STATUSES = [
  "PLANNING", "DEVELOPMENT", "PRE_PRODUCTION", "IN_PROGRESS",
  "POST_PRODUCTION", "COMPLETED", "PAUSED", "CANCELLED", "RELEASED",
];

interface Props {
  project: Project;
  onClose: () => void;
  onUpdated: (updated: Project) => void;
}

export default function EditProjectModal({ project, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(project.name);
  const [contentType, setContentType] = useState(project.content_type ?? "");
  const [brief, setBrief] = useState(project.brief ?? "");
  const [additionalDetails, setAdditionalDetails] = useState(project.additional_details ?? "");
  const [status, setStatus] = useState(project.status ?? "PLANNING");

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Project name is required."); return; }
    if (!brief.trim()) { toast.error("Brief is required."); return; }
    if (!contentType) { toast.error("Content type is required."); return; }
    setLoading(true);
    try {
      const updated = await updateProject(project.project_id, {
        name: name.trim(),
        content_type: contentType,
        brief: brief.trim(),
        additional_details: additionalDetails.trim(),
        status,
      });
      toast.success("Project updated!");
      onUpdated(updated);
      onClose();
    } catch (e: any) {
      const msg = Object.values(e?.response?.data || {}).flat().join(' ') || "Failed to update project.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="relative w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">Edit Project</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"><X size={18} /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Project Name <span className="text-red-400">*</span></label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Content Type <span className="text-red-400">*</span></label>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500">
              <option value="">Select type…</option>
              {CONTENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Brief <span className="text-red-400">*</span></label>
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Additional Details</label>
            <textarea value={additionalDetails} onChange={(e) => setAdditionalDetails(e.target.value)} rows={3} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500">
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end mt-6 pt-4 border-t border-[var(--border)] gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors">
            {loading && <Loader2 size={14} className="animate-spin" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
