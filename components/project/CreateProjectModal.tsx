"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X, Loader2, ChevronRight, ChevronLeft } from "lucide-react";
import { toast } from "react-toastify";
import { createProject } from "@/services/project";

const CONTENT_TYPES = [
  "Film",
  "TV Series",
  "Commercial",
  "Music Video",
  "Documentary",
  "Short Film",
  "Web Series",
  "Other",
];

const STATUSES: { value: string; label: string }[] = [
  { value: "PLANNING", label: "Planning" },
  { value: "DEVELOPMENT", label: "Development" },
  { value: "PRE_PRODUCTION", label: "Pre-Production" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "POST_PRODUCTION", label: "Post-Production" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PAUSED", label: "Paused" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "RELEASED", label: "Released" },
];

interface Props {
  onClose: () => void;
  onCreated?: () => void;
}

export default function CreateProjectModal({ onClose, onCreated }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1
  const [name, setName] = useState("");
  const [contentType, setContentType] = useState("");
  const [brief, setBrief] = useState("");

  // Step 2
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [status, setStatus] = useState("PLANNING");

  const handleNext = () => {
    if (!name.trim()) { toast.error("Project name is required."); return; }
    if (!contentType) { toast.error("Content type is required."); return; }
    if (!brief.trim()) { toast.error("Brief is required."); return; }
    setStep(2);
  };

  const handleCreate = async () => {
    if (!additionalDetails.trim()) {
      toast.error("Additional details are required.");
      return;
    }
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
      window.dispatchEvent(new CustomEvent("viewfinder:record", { detail: { label: "project created" } }));
      onCreated?.();
      onClose();
      router.push(`/projects/${project.project_id}/overview`);
    } catch (e: any) {
      const data = e?.response?.data;
      const msg =
        data?.detail ??
        (typeof data === "object" ? Object.values(data).flat().join(" ") : null) ??
        "Failed to create project.";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-xl border shadow-2xl p-6"
        style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
            New Project
          </h2>
          <button
            onClick={onClose}
            className="transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-2 mb-1">
          {[1, 2].map((s) => (
            <div
              key={s}
              className="flex-1 h-1 rounded-full transition-colors"
              style={{ background: step >= s ? "var(--accent)" : "var(--border)" }}
            />
          ))}
        </div>
        <p className="text-xs mb-5" style={{ color: "var(--text-muted)" }}>
          Step {step} of 2
        </p>

        {/* Step 1 */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Project Name <span className="text-red-400">*</span>
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleNext(); } }}
                placeholder="My Film Project"
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-raised)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Content Type <span className="text-red-400">*</span>
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleNext(); } }}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-raised)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="">Select type…</option>
                {CONTENT_TYPES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Brief <span className="text-red-400">*</span>
              </label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) { e.preventDefault(); handleNext(); } }}
                rows={4}
                placeholder="A short description of the project and its goals…"
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-raised)",
                  color: "var(--text-primary)",
                }}
              />
            </div>
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Additional Details <span className="text-red-400">*</span>
              </label>
              <textarea
                value={additionalDetails}
                onChange={(e) => setAdditionalDetails(e.target.value)}
                rows={5}
                placeholder="Provide any extra context — shooting schedule, tone, target audience, special requirements…"
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-raised)",
                  color: "var(--text-primary)",
                }}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: "var(--text-secondary)" }}>
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                style={{
                  borderColor: "var(--border)",
                  background: "var(--surface-raised)",
                  color: "var(--text-primary)",
                }}
              >
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-between mt-6 pt-4 border-t" style={{ borderColor: "var(--border)" }}>
          {step === 2 ? (
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm transition-colors"
              style={{ color: "var(--text-secondary)" }}
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
