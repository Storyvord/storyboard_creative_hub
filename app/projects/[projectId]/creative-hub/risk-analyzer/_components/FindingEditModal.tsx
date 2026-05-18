"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { RiskFinding, Severity } from "@/types/risk-analyzer";
import { RISK_CATEGORIES, SEVERITIES, categoryLabel } from "./constants";

/**
 * Add or edit a finding. `finding` is `null` for the "add new" flow,
 * otherwise the modal seeds inputs from the existing finding.
 */
interface FindingEditModalProps {
  open: boolean;
  finding: RiskFinding | null;
  /** Whether the modal is for a new finding (vs editing). */
  mode: "create" | "edit";
  onClose: () => void;
  onSubmit: (values: {
    category_slug: string;
    severity: Severity;
    reason: string;
  }) => Promise<void> | void;
  submitting?: boolean;
}

/**
 * Inner form, re-mounted whenever the wrapper's `key` changes (driven by
 * `finding?.id`). Remount + initial useState seeds avoid the
 * setState-in-effect anti-pattern — opening the modal for a different row
 * mounts a fresh form with the right defaults.
 */
function FindingEditForm({
  finding,
  mode,
  onClose,
  onSubmit,
  submitting,
}: Omit<FindingEditModalProps, "open">) {
  const [categorySlug, setCategorySlug] = useState<string>(
    finding?.category_slug ?? RISK_CATEGORIES[0]?.slug ?? "",
  );
  const [severity, setSeverity] = useState<Severity>(finding?.severity ?? "Medium");
  const [reason, setReason] = useState<string>(finding?.reason ?? "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categorySlug || !severity || !reason.trim()) return;
    await onSubmit({ category_slug: categorySlug, severity, reason: reason.trim() });
  };
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">
            {mode === "create" ? "Add manual finding" : `Edit finding · ${categoryLabel(categorySlug)}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </header>

        <div className="space-y-3 px-4 py-3">
          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Category
            </label>
            <select
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
              className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-2 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
            >
              {RISK_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Severity
            </label>
            <div className="flex gap-1.5">
              {SEVERITIES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-semibold transition-colors ${
                    severity === s
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                      : "border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Reason
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              required
              minLength={3}
              placeholder="Why is this a risk? What scene context?"
              className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-[var(--border)] px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !reason.trim()}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            {mode === "create" ? "Add finding" : "Save changes"}
          </button>
        </footer>
      </form>
    </div>
  );
}

export default function FindingEditModal({
  open,
  finding,
  mode,
  onClose,
  onSubmit,
  submitting,
}: FindingEditModalProps) {
  if (!open) return null;
  // Keyed by finding identity (or "new") so the inner form re-mounts whenever
  // we open the modal against a different row — sidesteps the
  // setState-in-effect lint pattern.
  const key = finding?.id ?? "new";
  return (
    <FindingEditForm
      key={key}
      finding={finding}
      mode={mode}
      onClose={onClose}
      onSubmit={onSubmit}
      submitting={submitting}
    />
  );
}
