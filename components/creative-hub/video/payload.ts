// STO-1854 — Generic video request assembly + tag helpers.
//
// The FE echoes the catalog's generic param/role `name`s only; provider
// field-name mapping happens server-side. This module builds the {slug, params,
// media, elements, character_ids} payload from the form state and computes the
// in-prompt reference tags from `reference_tag_format`.

import {
  VideoModel,
  GenerateVideoPayload,
  UploadedMedia,
  ElementInput,
} from "@/types/video";

export interface VideoFormState {
  values: Record<string, unknown>;
  mediaRoles: Record<string, UploadedMedia[]>;
  elements: ElementInput[];
  characterIds: (string | number)[];
}

export function emptyFormState(): VideoFormState {
  return { values: {}, mediaRoles: {}, elements: [], characterIds: [] };
}

/** Seed default values from a model's parameter spec (used on model change). */
export function defaultsForModel(model: VideoModel): VideoFormState {
  const values: Record<string, unknown> = {};
  for (const p of model.parameters) {
    if (p.default !== undefined && p.default !== null) {
      values[p.name] = p.default;
    }
  }
  return { values, mediaRoles: {}, elements: [], characterIds: [] };
}

/** Build an in-prompt reference tag like `@Image1` from `reference_tag_format`.
 *  Supports both `@{Type}{n}` and `@Image{n}` style formats; falls back to
 *  `@{Type}{n}` when the format string is empty. */
export function buildTag(
  format: string | undefined,
  type: string,
  n: number,
): string {
  if (!format) return `@${type}${n}`;
  if (format.includes("{Type}") || format.includes("{type}")) {
    return format.replace(/\{Type\}/gi, type).replace(/\{n\}/gi, String(n));
  }
  // Format already encodes the type, e.g. "@Image{n}" or "@Element{n}".
  return format.replace(/\{n\}/gi, String(n));
}

/** Build the generic generate payload from form state, stripping empty values
 *  and local-only media fields. Media URLs ride as {url,mime,bytes} so the
 *  backend can run its mime/size validation. */
export function buildGeneratePayload(
  model: VideoModel,
  state: VideoFormState,
  ctx: { projectId?: string; scriptId?: number; sourcePrevizId?: number },
): GenerateVideoPayload {
  const params: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(state.values)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    params[k] = v;
  }

  const media: Record<string, UploadedMedia[]> = {};
  for (const [role, files] of Object.entries(state.mediaRoles)) {
    const mapped = (files || [])
      .filter((f) => f.url)
      // Keep `previz_id`/`video_clip_id` so the backend re-signs a fresh storage
      // URL at task time (the captured SAS URL expires); strip local-only fields.
      .map((f) => ({
        url: f.url,
        mime: f.mime,
        bytes: f.bytes,
        previz_id: f.previz_id,
        video_clip_id: f.video_clip_id,
      }));
    if (mapped.length > 0) media[role] = mapped;
  }

  const payload: GenerateVideoPayload = {
    slug: model.slug,
    params,
    media,
  };
  if (state.elements.length > 0) payload.elements = state.elements;
  if (state.characterIds.length > 0) payload.character_ids = state.characterIds;
  if (ctx.projectId) payload.project_id = ctx.projectId;
  if (ctx.scriptId != null) payload.script_id = ctx.scriptId;
  if (ctx.sourcePrevizId != null) payload.source_previz_id = ctx.sourcePrevizId;

  // Legacy back-compat fields the backend still reads for the stored VideoClip
  // columns (prompt/duration/aspect). Harmless when also present in params.
  if (typeof params.prompt === "string") payload.prompt = params.prompt;
  if (params.duration != null) {
    const d = Number(params.duration);
    if (!Number.isNaN(d)) payload.duration_seconds = d;
  }
  if (typeof params.aspect_ratio === "string") payload.aspect_ratio = params.aspect_ratio;

  return payload;
}
