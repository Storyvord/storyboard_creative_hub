"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";
import { createProject } from "@/services/project";

const CONTENT_TYPES = [
  "Film", "TV Series", "Commercial", "Music Video", "Documentary",
  "Short Film", "Web Series", "Other",
];

const STATUSES = [
  "PLANNING", "DEVELOPMENT", "PRE_PRODUCTION", "IN_PROGRESS",
  "POST_PRODUCTION", "COMPLETED", "PAUSED", "CANCELLED", "RELEASED",
];

interface Props {
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateProjectModal({ onClose, onCreated }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState("");
  const [contentType, setContentType] = useState("");
  const [brief, setBrief] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [status, setStatus] = useState("PLANNING");

  const handleNext = () => {
    if (!name.trim()) { toast.error("Project name is required."); return; }
    if (!brief.trim()) { toast.error("Brief is required."); return; }
    if (!contentType) { toast.error("Content type is required."); return; }
    setStep(2);
  };

  const handleCreate = async () => {
    if (!additionalDetails.trim()) { toast.error("Additional details are required."); return; }
    setLoading(true);
    try {
      const project = await createProject({
        name: name.trim(),
        content_type: contentType,
        brief: brief.trim(),
        additional_details: additionalDetails.trim(),
        status,
      });
      toast.success("Project created!");
      onCreated?.();
      onClose();
      router.push(`/projects/${project.project_id}/overview`);
    } catch (e: any) {
      const msg = Object.values(e?.response?.data || {}).flat().join(' ') || "Failed to create project.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className="relative w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">New Project</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          {[1, 2].map((s) => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-colors ${step >= s ? "bg-emerald-500" : "bg-[var(--border)]"}`} />
          ))}
        </div>
        <p className="text-xs text-[var(--text-muted)] mb-5">Step {step} of 2</p>

        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Project Name <span className="text-red-400">*</span></label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Film Project"
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Content Type <span className="text-red-400">*</span></label>
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
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Brief <span className="text-red-400">*</span></label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={4}
                placeholder="A short description of the project..."
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Additional Details <span className="text-red-400">*</span></label>
              <textarea
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                rows={5}
                placeholder="Any extra context, requirements, or notes for this project..."
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-emerald-500 resize-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="flex justify-between mt-6 pt-4 border-t border-[var(--border)]">
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ChevronLeft size={16} /> Back
            </button>
          ) : (
            <div />
          )}

          {step === 1 ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium rounded-md transition-colors"
            >
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={handleCreate}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium rounded-md transition-colors"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              Create Project
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
