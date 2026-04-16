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

const CURRENCIES = ["USD ($)", "EUR (€)", "GBP (£)", "INR (₹)", "JPY (¥)"];
const CURRENCY_CODES = ["USD", "EUR", "GBP", "INR", "JPY"];

interface Props {
  project: Project;
  onClose: () => void;
  onUpdated: (updated: Project) => void;
}

export default function EditProjectModal({ project, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(project.name);
  const [brief, setBrief] = useState(project.brief ?? "");
  const [contentType, setContentType] = useState(project.content_type ?? "");
  const [budgetCurrency, setBudgetCurrency] = useState(project.budget_currency ?? "USD");
  const [budgetAmount, setBudgetAmount] = useState(project.budget_amount?.toString() ?? "");
  const [status, setStatus] = useState(project.status ?? "PLANNING");

  const handleSave = async () => {
    if (!name.trim()) { toast.error("Project name is required."); return; }
    setLoading(true);
    try {
      const updated = await updateProject(project.project_id, {
        name: name.trim(),
        brief: brief.trim(),
        content_type: contentType || undefined,
        budget_currency: budgetCurrency,
        budget_amount: budgetAmount ? parseFloat(budgetAmount) : null,
        status,
      });
      toast.success("Project updated!");
      onUpdated(updated);
      onClose();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail ?? "Failed to update project.");
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
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Brief</label>
            <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={3} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Content Type</label>
            <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500">
              <option value="">Select type…</option>
              {CONTENT_TYPES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Currency</label>
              <select value={budgetCurrency} onChange={(e) => setBudgetCurrency(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500">
                {CURRENCIES.map((c, i) => <option key={c} value={CURRENCY_CODES[i]}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">Budget Amount</label>
              <input type="number" min="0" value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)} className="w-full rounded-md border border-[var(--border)] bg-[var(--surface-raised)] px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-emerald-500" />
            </div>
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
