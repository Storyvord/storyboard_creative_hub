import axios from "axios";
import api from "./api";
import {
  CancelResponse,
  CreateFindingBody,
  CreateMitigationBody,
  PatchFindingBody,
  PatchMitigationBody,
  RiskAnalysis,
  RiskAnalysisListItem,
  RiskAnalysisStatusPayload,
  RiskApiError,
  RiskApiResult,
  RiskFinding,
  RiskGraph,
  RiskMitigation,
  StartAnalysisBody,
  StartAnalysisResponse,
} from "@/types/risk-analyzer";

/**
 * Risk Analyzer API client. Mirrors the endpoint table in
 * `creative_hub/risk/FRONTEND_INTEGRATION.md` §2. Most write endpoints
 * return a typed `RiskApiResult<T>` so callers can branch on
 * 402/409/413/415/422/429 without using throw/catch in render code.
 *
 * The read endpoints (lists, results, graph, status) still throw — these
 * surface in `useEffect` loaders where a try/catch is natural.
 */

const BASE = "/api/creative_hub";

// ── Error normalisation ────────────────────────────────────────────────────
type ErrorDetail = Record<string, unknown> | undefined;

function getDetail(data: unknown): ErrorDetail {
  if (data && typeof data === "object") return data as ErrorDetail;
  return undefined;
}

function getMessage(data: unknown, fallback: string): string {
  const d = getDetail(data);
  if (!d) return fallback;
  if (typeof d.message === "string") return d.message;
  if (typeof d.detail === "string") return d.detail;
  if (typeof d.error === "string") return d.error;
  return fallback;
}

function toRiskApiError(error: unknown): RiskApiError {
  if (!axios.isAxiosError(error)) {
    const msg = error instanceof Error ? error.message : "Unexpected error.";
    return { ok: false, code: "unknown", message: msg };
  }
  const status = error.response?.status;
  const data = error.response?.data;
  const detail = getDetail(data);
  switch (status) {
    case 402:
      return {
        ok: false,
        code: "insufficient_credits",
        status,
        message: getMessage(data, "Insufficient credits."),
        detail,
      };
    case 409:
      return {
        ok: false,
        code: "finalized_readonly",
        status,
        message: getMessage(data, "This analysis is finalized and read-only."),
        detail,
      };
    case 413:
      return {
        ok: false,
        code: "payload_too_large",
        status,
        message: getMessage(data, "File is too large (max 25 MB)."),
        detail,
      };
    case 415: {
      // Backend distinguishes "wrong declared MIME" (generic 415) from
      // "magic-byte mismatch" via the `detail` string. We surface the
      // mismatch as its own code so the UI can show the specific message
      // verbatim — see backend production-hardening PR.
      const rawDetail = typeof data === "object" && data !== null
        ? (data as Record<string, unknown>).detail
        : undefined;
      const detailStr = typeof rawDetail === "string" ? rawDetail : "";
      const isMismatch = /do not match declared type/i.test(detailStr);
      if (isMismatch) {
        return {
          ok: false,
          code: "content_type_mismatch",
          status,
          message: detailStr || "File contents do not match declared type.",
          detail,
        };
      }
      return {
        ok: false,
        code: "unsupported_media",
        status,
        message: getMessage(data, "Unsupported file type. Use PNG, JPG, or PDF."),
        detail,
      };
    }
    case 422:
      return {
        ok: false,
        code: "max_scenes_exceeded",
        status,
        message: getMessage(data, "Maximum scenes per analysis exceeded."),
        detail,
      };
    case 429: {
      const retry = Number(error.response?.headers?.["retry-after"] ?? 0);
      return {
        ok: false,
        code: "throttled",
        status,
        message: getMessage(data, "Too many requests. Try again shortly."),
        detail,
        retry_after: Number.isFinite(retry) && retry > 0 ? retry : undefined,
      };
    }
    default:
      return {
        ok: false,
        code: "unknown",
        status,
        message: getMessage(data, "Something went wrong."),
        detail,
      };
  }
}

async function safe<T>(p: Promise<T>): Promise<RiskApiResult<T>> {
  try {
    const data = await p;
    return { ok: true, data };
  } catch (err) {
    return toRiskApiError(err);
  }
}

// ── Analysis lifecycle (read endpoints throw) ──────────────────────────────

export const listAnalyses = async (
  scriptId: number,
): Promise<RiskAnalysisListItem[]> => {
  const res = await api.get(`${BASE}/scripts/${scriptId}/risk-analyses/`);
  const data = res.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.analyses)) return data.analyses;
  return [];
};

export const startAnalysis = async (
  scriptId: number,
  body: StartAnalysisBody,
): Promise<RiskApiResult<StartAnalysisResponse>> => {
  const docs = body.mitigations_docs;
  if (docs && docs.length > 0) {
    const form = new FormData();
    if (body.mitigations_text) form.append("mitigations_text", body.mitigations_text);
    for (const f of docs) form.append("mitigations_docs", f);
    return safe(
      api
        .post(`${BASE}/scripts/${scriptId}/risk-analyzer/start/`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data as StartAnalysisResponse),
    );
  }
  return safe(
    api
      .post(`${BASE}/scripts/${scriptId}/risk-analyzer/start/`, {
        mitigations_text: body.mitigations_text ?? "",
      })
      .then((r) => r.data as StartAnalysisResponse),
  );
};

export const getStatus = async (
  scriptId: number,
  analysisId: number,
): Promise<RiskAnalysisStatusPayload> => {
  const res = await api.get(
    `${BASE}/scripts/${scriptId}/risk-analyzer/${analysisId}/status/`,
  );
  const raw = (res.data ?? {}) as Record<string, unknown>;

  // Defensive parsing: `is_stalled` / `stalled_seconds` were added by the
  // backend watchdog rollout and may not be present on older deployments.
  // Coerce only when the keys are actually present so callers can distinguish
  // "server says not stalled" from "server didn't tell us".
  const payload: RiskAnalysisStatusPayload = {
    status: raw.status as RiskAnalysisStatusPayload["status"],
    progress: typeof raw.progress === "number" ? raw.progress : 0,
    scenes_processed:
      typeof raw.scenes_processed === "number" ? raw.scenes_processed : 0,
    scenes_total:
      typeof raw.scenes_total === "number" ? raw.scenes_total : 0,
    task_status:
      typeof raw.task_status === "string" ? raw.task_status : undefined,
    drift_warnings: Array.isArray(raw.drift_warnings)
      ? (raw.drift_warnings as RiskAnalysisStatusPayload["drift_warnings"])
      : undefined,
  };
  if (typeof raw.is_stalled === "boolean") {
    payload.is_stalled = raw.is_stalled;
  }
  if (typeof raw.stalled_seconds === "number") {
    payload.stalled_seconds = raw.stalled_seconds;
  }
  return payload;
};

export const getResults = async (
  scriptId: number,
  analysisId: number,
): Promise<RiskAnalysis> => {
  const res = await api.get(
    `${BASE}/scripts/${scriptId}/risk-analyzer/${analysisId}/results/`,
  );
  return res.data as RiskAnalysis;
};

export const getGraph = async (
  scriptId: number,
  analysisId: number,
): Promise<RiskGraph> => {
  const res = await api.get(
    `${BASE}/scripts/${scriptId}/risk-analyzer/${analysisId}/graph/`,
  );
  return res.data as RiskGraph;
};

export const resume = async (
  scriptId: number,
  analysisId: number,
): Promise<RiskApiResult<StartAnalysisResponse>> => {
  return safe(
    api
      .post(`${BASE}/scripts/${scriptId}/risk-analyzer/${analysisId}/resume/`)
      .then((r) => r.data as StartAnalysisResponse),
  );
};

/**
 * Cancel an in-flight analysis. Per the backend contract:
 *   - 200 → `{status: "CANCELLED", credits_refunded: 0}` (no refunds on
 *     cancel; credits already consumed are gone — Plan §8.10).
 *   - 409 if the row is not in {PENDING, CLASSIFYING, MITIGATING, FINALIZING}
 *     → mapped to typed code `not_cancellable`.
 *   - 403 if the caller is not an editor → mapped to `forbidden`.
 *
 * Replaces the previous `markAnalysisFailedAndResume()` resume-hack: the
 * `GET /status/` endpoint now fails stalled analyses inline, so the user's
 * "give up on this run" affordance is a real cancel rather than a re-enqueue.
 */
export const cancelAnalysis = async (
  scriptId: number,
  analysisId: number,
  reason?: string,
): Promise<RiskApiResult<CancelResponse>> => {
  try {
    const body = reason && reason.trim().length > 0 ? { reason } : {};
    const res = await api.post(
      `${BASE}/scripts/${scriptId}/risk-analyzer/${analysisId}/cancel/`,
      body,
    );
    return { ok: true, data: res.data as CancelResponse };
  } catch (err) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status;
      const data = err.response?.data;
      const detail = getDetail(data);
      if (status === 409) {
        return {
          ok: false,
          code: "not_cancellable",
          status,
          message: getMessage(
            data,
            "Analysis is not in a cancellable state.",
          ),
          detail,
        };
      }
      if (status === 403) {
        return {
          ok: false,
          code: "forbidden",
          status,
          message: getMessage(
            data,
            "You don't have permission to cancel this analysis.",
          ),
          detail,
        };
      }
    }
    return toRiskApiError(err);
  }
};

export const finalize = async (
  scriptId: number,
  analysisId: number,
): Promise<RiskApiResult<StartAnalysisResponse>> => {
  return safe(
    api
      .post(`${BASE}/scripts/${scriptId}/risk-analyzer/${analysisId}/finalize/`)
      .then((r) => r.data as StartAnalysisResponse),
  );
};

/**
 * Returns the absolute URL the browser can open directly to download the
 * signed PDF. The backend serves a FileResponse; the auth interceptor on
 * `api` is fine for `window.open` because the server sets `Content-Disposition`
 * and we attach the bearer token via fetch when used as a download below.
 */
export const getReportPdfUrl = (
  scriptId: number,
  analysisId: number,
): string =>
  `${BASE}/scripts/${scriptId}/risk-analyzer/${analysisId}/report/pdf/`;

// ── Scene-scoped findings ──────────────────────────────────────────────────
export const getSceneFindings = async (
  sceneId: number,
  analysisId?: number,
): Promise<RiskFinding[]> => {
  const url = `${BASE}/scenes/${sceneId}/risk-findings/`;
  const res = await api.get(url, {
    params: analysisId ? { analysis_id: analysisId } : undefined,
  });
  const data = res.data;
  if (Array.isArray(data)) return data as RiskFinding[];
  if (Array.isArray(data?.findings)) return data.findings as RiskFinding[];
  if (Array.isArray(data?.results)) return data.results as RiskFinding[];
  return [];
};

// ── Finding edits ──────────────────────────────────────────────────────────
export const createFinding = (
  analysisId: number,
  sceneId: number,
  body: CreateFindingBody,
): Promise<RiskApiResult<RiskFinding>> =>
  safe(
    api
      .post(
        `${BASE}/risk-analyzer/${analysisId}/scenes/${sceneId}/findings/`,
        body,
      )
      .then((r) => r.data as RiskFinding),
  );

export const patchFinding = (
  findingId: number,
  body: PatchFindingBody,
): Promise<RiskApiResult<RiskFinding>> =>
  safe(
    api
      .patch(`${BASE}/risk-analyzer/findings/${findingId}/`, body)
      .then((r) => r.data as RiskFinding),
  );

export const deleteFinding = (
  findingId: number,
): Promise<RiskApiResult<{ ok: true }>> =>
  safe(
    api
      .delete(`${BASE}/risk-analyzer/findings/${findingId}/`)
      .then(() => ({ ok: true as const })),
  );

export const restoreFinding = (
  findingId: number,
): Promise<RiskApiResult<RiskFinding>> =>
  safe(
    api
      .post(`${BASE}/risk-analyzer/findings/${findingId}/restore/`)
      .then((r) => r.data as RiskFinding),
  );

export const revertFinding = (
  findingId: number,
): Promise<RiskApiResult<RiskFinding>> =>
  safe(
    api
      .post(`${BASE}/risk-analyzer/findings/${findingId}/revert/`)
      .then((r) => r.data as RiskFinding),
  );

export const approveFinding = (
  findingId: number,
  approve: boolean,
): Promise<RiskApiResult<RiskFinding>> =>
  safe(
    api
      .post(`${BASE}/risk-analyzer/findings/${findingId}/approve/`, { approve })
      .then((r) => r.data as RiskFinding),
  );

export const uploadEvidence = (
  findingId: number,
  file: File,
): Promise<RiskApiResult<RiskMitigation>> => {
  const form = new FormData();
  form.append("file", file);
  return safe(
    api
      .post(`${BASE}/risk-analyzer/findings/${findingId}/evidence/`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      })
      .then((r) => r.data as RiskMitigation),
  );
};

// ── Mitigation edits ───────────────────────────────────────────────────────
export const patchMitigation = (
  mitigationId: number,
  body: PatchMitigationBody,
): Promise<RiskApiResult<RiskMitigation>> =>
  safe(
    api
      .patch(`${BASE}/risk-analyzer/mitigations/${mitigationId}/`, body)
      .then((r) => r.data as RiskMitigation),
  );

export const createMitigationForFinding = (
  findingId: number,
  body: CreateMitigationBody,
): Promise<RiskApiResult<RiskMitigation>> =>
  safe(
    api
      .post(`${BASE}/risk-analyzer/findings/${findingId}/mitigation/`, body)
      .then((r) => r.data as RiskMitigation),
  );

export const revertMitigation = (
  mitigationId: number,
): Promise<RiskApiResult<RiskMitigation>> =>
  safe(
    api
      .post(`${BASE}/risk-analyzer/mitigations/${mitigationId}/revert/`)
      .then((r) => r.data as RiskMitigation),
  );

// ── Client-side validators ─────────────────────────────────────────────────
export const EVIDENCE_MAX_BYTES = 25 * 1024 * 1024; // 25 MB
export const EVIDENCE_ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "application/pdf",
];
export const EVIDENCE_ALLOWED_EXT = [".png", ".jpg", ".jpeg", ".pdf"];

export function validateEvidenceFile(file: File): string | null {
  if (file.size > EVIDENCE_MAX_BYTES) {
    return `File is too large. Max 25 MB (got ${(file.size / 1024 / 1024).toFixed(1)} MB).`;
  }
  const type = (file.type || "").toLowerCase();
  const name = file.name.toLowerCase();
  const okType = EVIDENCE_ALLOWED_TYPES.includes(type);
  const okExt = EVIDENCE_ALLOWED_EXT.some((ext) => name.endsWith(ext));
  if (!okType && !okExt) {
    return "Unsupported file type. Use PNG, JPG, or PDF.";
  }
  return null;
}
