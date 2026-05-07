import api from "./api";
import {
  CustomSceneReportType,
  SceneAvailableReportTypes,
  SceneGeneratedReport,
  SceneGeneratedReportListResponse,
  SceneReportBulkGenerateRequest,
  SceneReportGenerateRequest,
  SystemSceneReportType,
} from "@/types/scene-reports";

/**
 * Scene-level report types & generation. Mirrors the backend STO-1066/STO-1071
 * endpoints under /api/creative_hub/. Generation is **asynchronous** — the
 * generate / bulk-generate endpoints return HTTP 202 with a `task_ids` array
 * within ~200ms; callers must poll Celery via `getBulkTaskStatus` and refetch
 * the report list once tasks settle.
 */

/** Async enqueue envelope returned by both generate endpoints (STO-1071). */
export interface SceneReportEnqueueResponse {
  message: string;
  task_ids: string[];
  reports: { report_type: "system" | "custom"; report_name: string }[];
}

// ── List system / custom report types ─────────────────────────────────────────

export const getSystemSceneReportTypes = async (): Promise<SystemSceneReportType[]> => {
  try {
    const response = await api.get(`/api/creative_hub/scene-reports/system/`);
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.system_scene_reports)) return response.data.system_scene_reports;
    if (Array.isArray(response.data?.results)) return response.data.results;
    return [];
  } catch (error) {
    console.error("[getSystemSceneReportTypes] error:", error);
    throw error;
  }
};

export const getCustomSceneReportTypes = async (projectId: string): Promise<CustomSceneReportType[]> => {
  try {
    const response = await api.get(`/api/creative_hub/scene-reports/custom/project/${projectId}/`);
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.custom_scene_reports)) return response.data.custom_scene_reports;
    if (Array.isArray(response.data?.results)) return response.data.results;
    return [];
  } catch (error) {
    console.error("[getCustomSceneReportTypes] error:", error);
    throw error;
  }
};

export interface CreateCustomSceneReportPayload {
  name: string;
  display_name?: string;
  prompt_template?: string;
  system_role?: string;
  dependencies?: string[];
  schema?: Record<string, unknown> | null;
}

export const createCustomSceneReportType = async (
  projectId: string,
  payload: CreateCustomSceneReportPayload,
): Promise<CustomSceneReportType> => {
  try {
    const response = await api.post(`/api/creative_hub/scene-reports/custom/project/${projectId}/`, payload);
    return response.data;
  } catch (error) {
    console.error("[createCustomSceneReportType] error:", error);
    throw error;
  }
};

// ── Per-scene generated reports ───────────────────────────────────────────────

export const getSceneGeneratedReports = async (sceneId: number): Promise<SceneGeneratedReportListResponse> => {
  try {
    const response = await api.get(`/api/creative_hub/scenes/${sceneId}/reports/list/`);
    const data = response.data ?? {};
    return {
      scene_id: data.scene_id ?? sceneId,
      scene_name: data.scene_name,
      scene_order: data.scene_order,
      reports: Array.isArray(data.reports) ? data.reports : Array.isArray(data) ? data : [],
      count: data.count ?? (Array.isArray(data.reports) ? data.reports.length : 0),
    };
  } catch (error) {
    console.error("[getSceneGeneratedReports] error:", error);
    throw error;
  }
};

export const getSceneGeneratedReport = async (reportId: number): Promise<SceneGeneratedReport> => {
  try {
    const response = await api.get(`/api/creative_hub/scene-reports/${reportId}/`);
    return response.data;
  } catch (error) {
    console.error("[getSceneGeneratedReport] error:", error);
    throw error;
  }
};

export const getSceneAvailableReportTypes = async (sceneId: number): Promise<SceneAvailableReportTypes> => {
  try {
    const response = await api.get(`/api/creative_hub/scenes/${sceneId}/report-types/`);
    const data = response.data ?? {};
    return {
      scene_id: data.scene_id ?? sceneId,
      scene_name: data.scene_name,
      scene_order: data.scene_order,
      available_reports: {
        system: data.available_reports?.system ?? [],
        custom: data.available_reports?.custom ?? [],
      },
    };
  } catch (error) {
    console.error("[getSceneAvailableReportTypes] error:", error);
    throw error;
  }
};

// ── Generation ────────────────────────────────────────────────────────────────

/**
 * Enqueue a single scene report for async generation. Backend returns HTTP 202
 * within ~200ms with a 1-element `task_ids` array; the caller must poll via
 * `getBulkTaskStatus(task_ids)` and refetch the report list when the task
 * settles. Re-posting the same (scene, report_type, report_name) while one is
 * already in flight is idempotent — the backend returns the existing task_id
 * rather than enqueueing a duplicate.
 */
export const generateSceneReport = async (
  sceneId: number,
  payload: SceneReportGenerateRequest,
): Promise<SceneReportEnqueueResponse> => {
  try {
    const response = await api.post(
      `/api/creative_hub/scenes/${sceneId}/reports/generate/`,
      payload,
    );
    const data = response.data ?? {};
    return {
      message: data.message ?? "",
      task_ids: Array.isArray(data.task_ids) ? data.task_ids : [],
      reports: Array.isArray(data.reports) ? data.reports : [],
    };
  } catch (error) {
    console.error("[generateSceneReport] error:", error);
    throw error;
  }
};

/**
 * Enqueue multiple scene reports for async generation. Backend returns HTTP 202
 * with `task_ids` and `reports` arrays of equal length and matching order —
 * index `i` of `task_ids` corresponds to `reports[i]`, so callers can map a
 * polled task back to the originating report skeleton. Poll via
 * `getBulkTaskStatus(task_ids)` and refetch the report list as tasks settle.
 */
export const bulkGenerateSceneReports = async (
  sceneId: number,
  payload: SceneReportBulkGenerateRequest,
): Promise<SceneReportEnqueueResponse> => {
  try {
    const response = await api.post(
      `/api/creative_hub/scenes/${sceneId}/reports/bulk-generate/`,
      payload,
    );
    const data = response.data ?? {};
    return {
      message: data.message ?? "",
      task_ids: Array.isArray(data.task_ids) ? data.task_ids : [],
      reports: Array.isArray(data.reports) ? data.reports : [],
    };
  } catch (error) {
    console.error("[bulkGenerateSceneReports] error:", error);
    throw error;
  }
};