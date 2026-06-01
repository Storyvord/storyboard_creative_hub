// STO-1854 — Video generation catalog (schema-driven Video mode).
//
// These types mirror the backend contract EXACTLY:
//   - VideoModelCatalogSerializer  (creative_hub/serializers.py)
//   - VideoClient.estimate_cost    (storyvord/utils.py)
//   - VideoClipSerializer          (creative_hub/serializers.py)
//
// The catalog is declarative: a model row carries its own `parameters` and
// `media_roles` specs, so the frontend renders the input form purely from the
// spec and never hardcodes a model's fields. Optional spec keys are tolerated.

// ── Declarative parameter spec ──────────────────────────────────────────────

export type VideoParamType = "string" | "int" | "float" | "bool" | "enum" | "list";

/** FE widget hint; falls back to a `type`-based default when absent. */
export type VideoUiWidget =
  | "select"
  | "toggle"
  | "slider"
  | "textarea"
  | "uploader"
  | "motion_path"
  | string;

/** `required` may be `true`, `false`, or the string `"conditional"` (governed
 *  by the `constraints` block, e.g. prompt XOR multi_prompt). */
export type VideoRequired = boolean | "conditional";

export interface VideoParamSpec {
  name: string;
  type: VideoParamType;
  required?: VideoRequired;
  default?: unknown;
  /** Enum values when `type === "enum"`. */
  options?: (string | number)[];
  min?: number;
  max?: number;
  /** Nested spec for `list` params (e.g. multi_prompt rows, elements). */
  item_schema?: VideoParamSpec[];
  /** Provider field-name override (resolved server-side; FE echoes `name`). */
  provider_name?: string;
  group?: string;
  help?: string;
  ui_widget?: VideoUiWidget;
}

// ── Declarative media-role spec ─────────────────────────────────────────────

export type MediaRole =
  | "start_image"
  | "end_image"
  | "image"
  | "video"
  | "audio"
  | "element"
  | string;

export interface MediaRoleSpec {
  role: MediaRole;
  required?: boolean;
  max_count?: number;
  mime_types?: string[];
  max_bytes?: number;
  notes?: string;
}

// ── Declarative cross-field constraints (closed rule set) ────────────────────

export interface VideoConstraints {
  /** Each inner group: at most one may be set. */
  mutually_exclusive?: string[][];
  /** Each inner group: at least one must be set. */
  one_of_required?: string[][];
  /** `{field: [deps...]}` — if field set, at least one dep must be set. */
  requires_any?: Record<string, string[]>;
  /** `{field: {other: expected}}` — if field set, other must equal expected. */
  requires?: Record<string, Record<string, unknown>>;
  /** Aggregate cap across all media roles. */
  max_total_media?: number;
  [key: string]: unknown;
}

// ── Catalog row (VideoModel + flattened VideoModelConfig) ───────────────────

export type VideoModelStatus = "active" | "beta" | "gated" | "deprecated" | "disabled";
export type VideoOperation =
  | "text_to_video"
  | "image_to_video"
  | "reference_to_video"
  | "motion_control"
  | "create_character";
export type VideoModality =
  | "text_to_video"
  | "image_to_video"
  | "text_and_image_to_video";

export interface VideoModel {
  provider: string;
  model_api_id: string;
  slug: string;
  family: string;
  display_name: string;
  operation: VideoOperation;
  modality: VideoModality;
  status: VideoModelStatus;
  version: string;
  thumbnail: string | null;
  description: string;
  tags: string[];
  sort_order: number;
  is_active: boolean;
  /** Authoritative FE selectability flag from the backend serializer. */
  is_selectable: boolean;

  // Declarative spec (present once a VideoModelConfig is attached).
  parameters: VideoParamSpec[];
  media_roles: MediaRoleSpec[];
  constraints: VideoConstraints;
  supports_character_id: boolean;
  max_characters_per_generation: number;
  supports_elements: boolean;
  max_elements: number;
  reference_tag_format: string;
  provider_param_mapping: Record<string, unknown>;

  // Pricing inputs (FE preflight + transparency). Present with a config.
  credits_base?: number;
  credits_per_second?: number;
  resolution_multipliers?: Record<string, number>;
  mode_multipliers?: Record<string, number>;
  audio_surcharge?: number;
  per_extra_reference?: number;
  usd_base?: number;
  usd_per_second?: number;
  min_billable_seconds?: number | null;
  spec_version?: string;
  source_schema_ref?: string;
}

/** Alias matching the PRD component breakdown (config == flattened catalog row). */
export type VideoModelConfig = VideoModel;

// ── Cost preflight ──────────────────────────────────────────────────────────

export interface VideoResolvedParams {
  duration: string | number | null;
  resolution: string | null;
  mode: string | null;
  billed_seconds: number | null;
}

export interface VideoCostEstimate {
  credits: number;
  usd: number;
  resolved_params: VideoResolvedParams;
}

// ── Generation payload + request building blocks ────────────────────────────

/** A media-role file already uploaded to a hosted URL (with optional metadata
 *  the backend uses for mime/size validation). */
export interface UploadedMedia {
  url: string;
  mime?: string;
  bytes?: number;
  /** Local-only fields for the FE preview (stripped before submit). */
  name?: string;
}

/** Kling per-request identity element. Shape is driven by the spec's
 *  `item_schema`; kept loose so a corrected seed fixes the UI for free. */
export type ElementInput = Record<string, unknown>;

/** Generic generate payload. Provider field-name mapping happens server-side. */
export interface GenerateVideoPayload {
  slug: string;
  params: Record<string, unknown>;
  /** `{role: [url, ...]}` — the backend accepts plain URLs or `{url,mime,bytes}`. */
  media: Record<string, (string | UploadedMedia)[]>;
  elements?: ElementInput[];
  character_ids?: (string | number)[];
  project_id?: string;
  script_id?: number;
  source_previz_id?: number;
  // Legacy fields still accepted by the backend for back-compat.
  prompt?: string;
  duration_seconds?: number;
  aspect_ratio?: string;
}

export interface GenerateVideoResponse {
  task_id: string;
  status: string;
  clip_id: number;
}

// ── Clip detail (poll-complete fetch) ───────────────────────────────────────

export interface VideoClip {
  id: number;
  video_url: string | null;
  aspect_ratio: string;
  duration_seconds: number;
  prompt: string;
  provider_meta: Record<string, unknown> | null;
  created_at: string;
}
