"use client";

import { useRef, useState } from "react";
import { Loader2, Paperclip, Pencil, RotateCcw, Save, Upload, X } from "lucide-react";
import { clsx } from "clsx";
import { RiskFinding, RiskMitigation } from "@/types/risk-analyzer";
import { validateEvidenceFile } from "@/services/risk-analyzer";
import { SOURCE_BADGE } from "./constants";

interface MitigationPanelProps {
  finding: RiskFinding;
  mitigation: RiskMitigation | null;
  readOnly?: boolean;
  onPatch?: (mitigationId: number, body: { recommendation?: string; equipment_needed?: string; personnel_required?: string }) => Promise<void> | void;
  onCreate?: (findingId: number, body: { recommendation: string; equipment_needed?: string; personnel_required?: string }) => Promise<void> | void;
  onRevert?: (mitigationId: number) => Promise<void> | void;
  onUploadEvidence?: (findingId: number, file: File) => Promise<void> | void;
}

/**
 * Sibling-of-FindingCard panel for the mitigation row. Supports inline edit
 * (recommendation + equipment + personnel), revert-to-AI, and evidence
 * upload (client-side validated to 25 MB / png|jpg|pdf before POST).
 */
export default function MitigationPanel({
  finding,
  mitigation,
  readOnly,
  onPatch,
  onCreate,
  onRevert,
  onUploadEvidence,
}: MitigationPanelProps) {
  const [editing, setEditing] = useState(false);
  const [recommendation, setRecommendation] = useState(mitigation?.recommendation ?? "");
  const [equipment, setEquipment] = useState(mitigation?.equipment_needed ?? "");
  const [personnel, setPersonnel] = useState(mitigation?.personnel_required ?? "");
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const sourceBadge = mitigation ? SOURCE_BADGE[mitigation.source] : undefined;
  const canRevert = mitigation?.source === "user_modified";

  const startEdit = () => {
    setRecommendation(mitigation?.recommendation ?? "");
    setEquipment(mitigation?.equipment_needed ?? "");
    setPersonnel(mitigation?.personnel_required ?? "");
    setEditing(true);
  };

  const save = async () => {
    if (!recommendation.trim()) return;
    setSaving(true);
    try {
      if (mitigation && mitigation.id) {
        await onPatch?.(mitigation.id, {
          recommendation: recommendation.trim(),
          equipment_needed: equipment.trim() || undefined,
          personnel_required: personnel.trim() || undefined,
        });
      } else {
        await onCreate?.(finding.id, {
          recommendation: recommendation.trim(),
          equipment_needed: equipment.trim() || undefined,
          personnel_required: personnel.trim() || undefined,
        });
      }
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleFile = async (file: File) => {
    setUploadError(null);
    const err = validateEvidenceFile(file);
    if (err) {
      setUploadError(err);
      return;
    }
    await onUploadEvidence?.(finding.id, file);
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  return (
    <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
            Mitigation
          </span>
          {sourceBadge && (
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
              style={{ backgroundColor: sourceBadge.bg, color: sourceBadge.color }}
            >
              {sourceBadge.label}
            </span>
          )}
        </div>
        {!readOnly && !editing && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={startEdit}
              title={mitigation ? "Edit mitigation" : "Add mitigation"}
              className="inline-flex items-center gap-1 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"
            >
              <Pencil size={12} />
            </button>
            {canRevert && mitigation?.id && (
              <button
                type="button"
                onClick={() => onRevert?.(mitigation.id!)}
                title="Revert to AI baseline"
                className="inline-flex items-center gap-1 rounded p-1 text-[var(--text-muted)] hover:bg-[var(--surface-hover)]"
              >
                <RotateCcw size={12} />
              </button>
            )}
          </div>
        )}
      </div>

      {editing && !readOnly ? (
        <div className="space-y-2">
          <textarea
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
            rows={2}
            placeholder="Recommendation"
            className="w-full resize-none rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs"
          />
          <input
            value={equipment}
            onChange={(e) => setEquipment(e.target.value)}
            placeholder="Equipment needed"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs"
          />
          <input
            value={personnel}
            onChange={(e) => setPersonnel(e.target.value)}
            placeholder="Personnel required"
            className="w-full rounded-md border border-[var(--border)] bg-[var(--background)] px-2 py-1.5 text-xs"
          />
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded border border-[var(--border)] px-2 py-1 text-xs text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            >
              <X size={12} className="inline" /> Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !recommendation.trim()}
              className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Save
            </button>
          </div>
        </div>
      ) : (
        <>
          {mitigation ? (
            <>
              <p className="text-xs text-[var(--text-primary)]">{mitigation.recommendation}</p>
              {(mitigation.equipment_needed || mitigation.personnel_required) && (
                <dl className="mt-1.5 grid grid-cols-1 gap-x-3 gap-y-0.5 text-[11px] sm:grid-cols-2">
                  {mitigation.equipment_needed && (
                    <div>
                      <dt className="inline text-[var(--text-muted)]">Equipment: </dt>
                      <dd className="inline text-[var(--text-secondary)]">{mitigation.equipment_needed}</dd>
                    </div>
                  )}
                  {mitigation.personnel_required && (
                    <div>
                      <dt className="inline text-[var(--text-muted)]">Personnel: </dt>
                      <dd className="inline text-[var(--text-secondary)]">{mitigation.personnel_required}</dd>
                    </div>
                  )}
                </dl>
              )}
            </>
          ) : (
            <p className="text-xs italic text-[var(--text-muted)]">
              No mitigation yet — add one to track production safeguards.
            </p>
          )}
        </>
      )}

      {/* Evidence: file URL or upload */}
      {mitigation?.evidence_file_url ? (
        <a
          href={mitigation.evidence_file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 text-[11px] text-emerald-500 hover:underline"
        >
          <Paperclip size={11} /> Evidence attached
        </a>
      ) : !readOnly ? (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={clsx(
            "mt-2 flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed py-2 text-[11px] transition-colors",
            dragOver
              ? "border-emerald-500 bg-emerald-500/10 text-emerald-500"
              : "border-[var(--border)] text-[var(--text-muted)] hover:border-emerald-500/40",
          )}
          onClick={() => fileRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <Upload size={12} /> Drop evidence here, or click to upload (PNG/JPG/PDF, ≤25 MB)
          <input
            ref={fileRef}
            type="file"
            accept=".png,.jpg,.jpeg,.pdf,image/png,image/jpeg,application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
              if (fileRef.current) fileRef.current.value = "";
            }}
          />
        </div>
      ) : null}
      {uploadError && (
        <p className="mt-1 text-[11px] text-red-500">{uploadError}</p>
      )}
    </div>
  );
}
