import api from "./api";
import {
  CustomSceneReportType,
  SceneAvailableReportTypes,
  SceneGeneratedReport,
  SceneGeneratedReportListResponse,
  SceneReportBulkGenerateRequest,
  SceneReportGenerateRequest,
  SceneReportGenerateResponse,
  SystemSceneReportType,
} from "@/types/scene-reports";

/**
 * Scene-level report types & generation. Mirrors the backend STO-1066
 * endpoints under /api/creative_hub/. Generation is **synchronous** on this
 * path — the response carries the envelope immediately, no Celery polling.
 */

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

export const generateSceneReport = async (
  sceneId: number,
  payload: SceneReportGenerateRequest,
): Promise<SceneReportGenerateResponse> => {
  try {
    const response = await api.post(`/api/creative_hub/scenes/${sceneId}/reports/generate/`, payload);
    return response.data;
  } catch (error) {
    console.error("[generateSceneReport] error:", error);
    throw error;
  }
};

export const bulkGenerateSceneReports = async (
  sceneId: number,
  payload: SceneReportBulkGenerateRequest,
): Promise<SceneGeneratedReport[]> => {
  try {
    const response = await api.post(`/api/creative_hub/scenes/${sceneId}/reports/bulk-generate/`, payload);
    if (Array.isArray(response.data)) return response.data;
    if (Array.isArray(response.data?.reports)) return response.data.reports;
    return [];
  } catch (error) {
    console.error("[bulkGenerateSceneReports] error:", error);
    throw error;
  }
};
