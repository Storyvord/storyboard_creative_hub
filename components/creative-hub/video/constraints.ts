// STO-1854 — Client-side constraints engine (UX-only mirror of the backend's
// closed rule set in VideoClient._validate_constraints). The server re-validates
// authoritatively; this gives fast inline feedback and gates the Submit button.
//
// Rule types (declarative `constraints` block):
//   mutually_exclusive : [[a, b], ...]      at most one of each group set
//   one_of_required    : [[a, b], ...]      at least one of each group set
//   requires_any       : {field: [deps]}    field set ⇒ ≥1 dep set
//   requires           : {field:{o:val}}    field set ⇒ params[o] === val
//   max_total_media    : number             aggregate media-file cap

import { VideoConstraints, UploadedMedia, ElementInput } from "@/types/video";

export interface ConstraintEvalInput {
  values: Record<string, unknown>;
  mediaRoles: Record<string, (string | UploadedMedia)[]>;
  elements?: ElementInput[];
}

export interface ConstraintResult {
  ok: boolean;
  errors: string[];
}

export function totalMediaCount(
  mediaRoles: Record<string, (string | UploadedMedia)[]>,
): number {
  return Object.values(mediaRoles).reduce(
    (sum, arr) => sum + (Array.isArray(arr) ? arr.length : 0),
    0,
  );
}

export function evaluateConstraints(
  constraints: VideoConstraints | undefined | null,
  values: Record<string, unknown>,
  mediaRoles: Record<string, (string | UploadedMedia)[]>,
  elements: ElementInput[] = [],
): ConstraintResult {
  const errors: string[] = [];
  if (!constraints) return { ok: true, errors };

  const present = (key: string): boolean => {
    // The per-request identity `elements` list is a dedicated input, not a
    // param/media role — a constraint referencing "element"/"elements" must
    // see it (parity with the backend).
    if ((key === "element" || key === "elements") && elements.length > 0) return true;
    if (key in values) {
      const v = values[key];
      if (Array.isArray(v)) return v.length > 0;
      return v !== null && v !== undefined && v !== "";
    }
    if (key in mediaRoles) return (mediaRoles[key] || []).length > 0;
    return false;
  };

  for (const group of constraints.mutually_exclusive ?? []) {
    const set = group.filter(present);
    if (set.length > 1) {
      errors.push(`${set.join(" and ")} are mutually exclusive — provide only one.`);
    }
  }

  for (const group of constraints.one_of_required ?? []) {
    if (!group.some(present)) {
      errors.push(`Provide one of: ${group.join(", ")}.`);
    }
  }

  for (const [field, deps] of Object.entries(constraints.requires_any ?? {})) {
    if (present(field) && !deps.some(present)) {
      errors.push(`${field} requires at least one of: ${deps.join(", ")}.`);
    }
  }

  for (const [field, reqs] of Object.entries(constraints.requires ?? {})) {
    if (!present(field)) continue;
    for (const [other, expected] of Object.entries(reqs || {})) {
      if (values[other] !== expected) {
        errors.push(`${field} requires ${other} = ${String(expected)}.`);
      }
    }
  }

  const maxTotal = constraints.max_total_media;
  if (typeof maxTotal === "number") {
    const total = totalMediaCount(mediaRoles);
    if (total > maxTotal) {
      errors.push(`Total media files (${total}) exceed the limit of ${maxTotal}.`);
    }
  }

  return { ok: errors.length === 0, errors };
}
