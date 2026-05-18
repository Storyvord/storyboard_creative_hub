"use client";

import { useRef, useState } from "react";
import { AlertTriangle, Loader2, Paperclip, ShieldAlert, Upload, X } from "lucide-react";
import { clsx } from "clsx";
import { validateEvidenceFile } from "@/services/risk-analyzer";
import { CreditEstimate, RiskApiError, StartAnalysisBody } from "@/types/risk-analyzer";

interface StartAnalysisDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (body: StartAnalysisBody) => Promise<RiskApiError | { ok: true; estimate?: CreditEstimate } | void>;
  /** Optional pre-flight estimate displayed before submission. */
  estimate?: CreditEstimate | null;
}

/**
 * Pre-flight modal for `POST start/`. Accepts free-text mitigations and any
 * supporting docs (PDFs/images, ≤25 MB each). Surfaces a 402 shortfall +
 * top-up CTA inline when the backend rejects for insufficient credits.
 */
export default function StartAnalysisDialog({
  open,
  onClose,
  onSubmit,
  estimate,
}: StartAnalysisDialogProps) {
  const [mitigationsText, setMitigationsText] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creditsError, setCreditsError] = useState<RiskApiError | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const addFiles = (incoming: File[]) => {
    const accepted: File[] = [];
    for (const f of incoming) {
      const err = validateEvidenceFile(f);
      if (err) {
        setError(err);
        continue;
      }
      accepted.push(f);
    }
    if (accepted.length > 0) {
      setError(null);
      setFiles((prev) => [...prev, ...accepted]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setCreditsError(null);
    try {
      const res = await onSubmit({
        mitigations_text: mitigationsText.trim() || undefined,
        mitigations_docs: files.length > 0 ? files : undefined,
      });
      if (res && "ok" in res && res.ok === false) {
        if (res.code === "insufficient_credits") setCreditsError(res);
        else setError(res.message);
        return;
      }
      // Success path — parent will close + transition view.
    } finally {
      setSubmitting(false);
    }
  };

  const shortfall =
    creditsError?.detail && typeof creditsError.detail === "object"
      ? (creditsError.detail as { shortfall?: number; needed?: number; balance?: number })
      : undefined;

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
        className="w-full max-w-lg rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl"
      >
        <header className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-emerald-500" />
            <h2 className="text-sm font-semibold text-[var(--text-primary)]">
              Start Risk Analysis
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
            aria-label="Close"
          >
            <X size={14} />
          </button>
        </header>

        <div className="space-y-3 px-4 py-4">
          {estimate && (
            <p className="rounded-md border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
              <span className="font-semibold text-emerald-500">Estimate:</span>{" "}
              ~{estimate.estimated_calls} calls · ~{estimate.estimated_credits} credits · ~
              {estimate.estimated_minutes} min
            </p>
          )}

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Known mitigations (optional)
            </label>
            <textarea
              value={mitigationsText}
              onChange={(e) => setMitigationsText(e.target.value)}
              rows={4}
              placeholder="e.g. Stunt coordinator booked. Pyrotechnician on standby for scene 12."
              className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--background)] px-2.5 py-2 text-sm text-[var(--text-primary)] focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-[var(--text-muted)]">
              Supporting documents (optional)
            </label>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files) addFiles(Array.from(e.dataTransfer.files));
              }}
              onClick={() => fileRef.current?.click()}
              className={clsx(
                "flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed py-3 text-xs transition-colors",
                dragOver
                  ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
                  : "border-[var(--border)] text-[var(--text-muted)] hover:border-emerald-500/40",
              )}
              role="button"
              tabIndex={0}
            >
              <Upload size={12} /> Drop files or click to add (PNG/JPG/PDF, ≤25 MB each)
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(Array.from(e.target.files));
                if (fileRef.current) fileRef.current.value = "";
              }}
            />
            {files.length > 0 && (
              <ul className="mt-2 space-y-1">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded border border-[var(--border)] bg-[var(--background)] px-2 py-1 text-[11px]">
                    <span className="inline-flex items-center gap-1.5 text-[var(--text-secondary)]">
                      <Paperclip size={11} />
                      {f.name}
                      <span className="text-[var(--text-muted)]">({(f.size / 1024 / 1024).toFixed(1)} MB)</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-[var(--text-muted)] hover:text-red-500"
                    >
                      <X size={11} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-md border border-red-500/30 bg-red-500/5 px-3 py-2 text-[11px] text-red-500">
              <AlertTriangle size={13} className="mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {creditsError && (
            <div className="rounded-md border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-[11px] text-[var(--text-secondary)]">
              <p className="font-semibold text-amber-500">Insufficient credits.</p>
              {shortfall && (
                <p className="mt-1 text-[var(--text-muted)]">
                  Needed: <span className="font-semibold tabular-nums">{shortfall.needed ?? "—"}</span> ·
                  Balance: <span className="font-semibold tabular-nums">{shortfall.balance ?? "—"}</span>
                  {shortfall.shortfall !== undefined && (
                    <>
                      {" "}· Short by{" "}
                      <span className="font-semibold tabular-nums text-amber-500">{shortfall.shortfall}</span>
                    </>
                  )}
                </p>
              )}
              <a
                href="/billing/credits"
                className="mt-2 inline-flex items-center gap-1 rounded bg-amber-500 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-400"
              >
                Top up credits
              </a>
            </div>
          )}
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
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            {submitting && <Loader2 size={12} className="animate-spin" />}
            Start analysis
          </button>
        </footer>
      </form>
    </div>
  );
}
