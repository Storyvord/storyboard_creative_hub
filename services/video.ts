// STO-1854 — Video generation service layer.
//
// Thin wrappers over the creative_hub video catalog + clip endpoints, using the
// shared axios singleton (auth header + 401 refresh) and `extractApiError` for
// messaging at the call sites. Endpoints (all under /api/creative_hub/):
//   GET  video-models/                       → catalog (drives the dynamic form)
//   POST video-clip/ {preflight:true}        → cost preflight (no side effects)
//   POST video-clip/                         → enqueue generation
//   GET  video-clip/<id>/                    → clip detail (poll-complete swap)
//   GET  tasks/latest/?...                   → latest TaskStatus (reload restore)
// Media uploads reuse the existing previz/reference upload path to obtain
// hosted URLs (creative_hub/previsualization/create/).

import api from "./api";
import {
  VideoModel,
  VideoCostEstimate,
  GenerateVideoPayload,
  GenerateVideoResponse,
  VideoClip,
  UploadedMedia,
} from "@/types/video";
import { LatestTaskStatus } from "./creative-hub";

/** Fetch the active video catalog. Rows are flattened VideoModel+config. */
export const getVideoModels = async (): Promise<VideoModel[]> => {
  const response = await api.get("/api/creative_hub/video-models/");
  return Array.isArray(response.data) ? response.data : [];
};

/** Cost preflight — validate + price WITHOUT deducting or dispatching.
 *  Uses POST {preflight:true} so object `params`/`media` ride in the body
 *  (the GET form requires JSON-string query params). */
export const preflightVideoCost = async (
  slug: string,
  params: Record<string, unknown>,
  media: Record<string, (string | UploadedMedia)[]>,
  elements: GenerateVideoPayload["elements"] = [],
  character_ids: GenerateVideoPayload["character_ids"] = [],
  signal?: AbortSignal,
): Promise<VideoCostEstimate> => {
  const response = await api.post(
    "/api/creative_hub/video-clip/",
    { preflight: true, slug, params, media, elements, character_ids },
    { signal },
  );
  return response.data as VideoCostEstimate;
};

/** Enqueue a generation. Returns the poll target (task_id + clip_id). */
export const generateVideoClip = async (
  payload: GenerateVideoPayload,
): Promise<GenerateVideoResponse> => {
  const response = await api.post("/api/creative_hub/video-clip/", payload);
  return response.data as GenerateVideoResponse;
};

/** Fetch a generated clip (after the poll reports completion). */
export const getVideoClip = async (clipId: number): Promise<VideoClip> => {
  const response = await api.get(`/api/creative_hub/video-clip/${clipId}/`);
  return response.data as VideoClip;
};

/** A page of script-wide video clips for the "View History" feed. */
export interface VideoClipPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: VideoClip[];
}

/** Fetch completed video clips for a script (newest first), for the script-wide
 *  history feed. Mirrors `getScriptPrevizHistory`'s paginated-envelope handling:
 *  tolerates either a DRF page object or a bare array. The list excludes
 *  in-flight clips by design — reload recovery handles still-generating ones. */
export const getScriptVideoClips = async (
  scriptId: number,
  page: number = 1,
): Promise<VideoClipPage> => {
  const response = await api.get(
    `/api/creative_hub/scripts/${scriptId}/video-clips/?page=${page}`,
  );
  const data = response.data;
  if (Array.isArray(data)) {
    return { count: data.length, next: null, previous: null, results: data };
  }
  return {
    count: data.count ?? data.results?.length ?? 0,
    next: data.next ?? null,
    previous: data.previous ?? null,
    results: data.results ?? [],
  };
};

/** Latest TaskStatus for a video clip — used by reload recovery to resume an
 *  in-flight `video_clip_generation` task. Returns null on 404 (no row) and,
 *  defensively, on 400 — the backend's tasks/latest/ resolver table may not yet
 *  register `videoclip` (see CONTRACT NOTES), and recovery must degrade
 *  gracefully rather than throw and break the page mount. */
export const getLatestVideoTaskStatus = async (
  clipId: number,
): Promise<LatestTaskStatus | null> => {
  try {
    const response = await api.get("/api/creative_hub/tasks/latest/", {
      params: {
        content_type: "videoclip",
        object_id: clipId,
        task_type: "video_clip_generation",
      },
    });
    return response.data as LatestTaskStatus;
  } catch (error: unknown) {
    const statusCode =
      typeof error === "object" && error !== null
        ? (error as { response?: { status?: number } }).response?.status
        : undefined;
    if (statusCode === 404 || statusCode === 400) return null;
    throw error;
  }
};

/** Upload a media-role file and return a hosted URL + metadata. Reuses the
 *  previz create endpoint (generate_ai_image=false) which mirrors the file to
 *  storage and returns its public `image_url`. The backend stores any media
 *  type on the FileField, so videos/audio round-trip through the same path. */
export const uploadVideoMedia = async (
  scriptId: number,
  file: File,
): Promise<UploadedMedia> => {
  const formData = new FormData();
  formData.append("image_file", file);
  formData.append("script", String(scriptId));
  formData.append("generate_ai_image", "false");
  formData.append("description", "Video reference");
  const response = await api.post(
    "/api/creative_hub/previsualization/create/",
    formData,
    { headers: { "Content-Type": "multipart/form-data" } },
  );
  const url: string = response.data?.image_url || response.data?.video_url || "";
  return { url, mime: file.type, bytes: file.size, name: file.name };
};
