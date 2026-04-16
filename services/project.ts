import api from "./api";
import { Project, ProjectMember, Role, Permission, ProjectInvite, CallSheet, Folder, ProjectFile, ChatSession, ChatMessage, ProjectReport, AvailableReport } from "@/types/project";

// ── Projects ──────────────────────────────────────────────────────────────────
export const getProjects = async (): Promise<Project[]> => {
  const response = await api.get("/api/project/v2/projects/");
  if (Array.isArray(response.data)) return response.data;
  if (response.data.results) return response.data.results;
  return [];
};

export const getProject = async (id: string): Promise<Project> => {
  const response = await api.get(`/api/project/v2/projects/${id}/`);
  return response.data;
};

export interface CreateProjectPayload {
  name: string;
  content_type: string;
  brief: string;
  additional_details: string;
  status?: string;
}

export const createProject = async (data: CreateProjectPayload): Promise<Project> => {
  const response = await api.post("/api/project/v2/projects/", data);
  return response.data;
};

export const updateProject = async (id: string, data: Partial<CreateProjectPayload>): Promise<Project> => {
  const response = await api.put(`/api/project/v2/projects/${id}/`, data);
  return response.data;
};

export const deleteProject = async (id: string): Promise<void> => {
  await api.delete(`/api/project/v2/projects/${id}/`);
};

// ── Crew / Members ────────────────────────────────────────────────────────────
export const getProjectCrew = async (projectId: string): Promise<ProjectMember[]> => {
  const response = await api.get(`/api/project/crew/${projectId}/`);
  if (Array.isArray(response.data)) return response.data;
  if (response.data.results) return response.data.results;
  return [];
};

export const removeFromProject = async (projectId: string, userId: string): Promise<void> => {
  await api.post("/api/project/v2/remove_from_project/", { project_id: projectId, user_id: userId });
};

// ── Roles ─────────────────────────────────────────────────────────────────────
export const getProjectRoles = async (projectId: string): Promise<Role[]> => {
  const response = await api.get(`/api/project/v2/roles/?project_id=${projectId}`);
  if (Array.isArray(response.data)) return response.data;
  if (response.data.results) return response.data.results;
  return [];
};

export const createRole = async (data: { name: string; description?: string; project: string; is_global: boolean; permissions: Record<string, string[]> }): Promise<Role> => {
  const response = await api.post("/api/project/v2/roles/", data);
  return response.data;
};

export const updateRole = async (id: number, data: Partial<{ name: string; description: string; permissions: Record<string, string[]> }>): Promise<Role> => {
  const response = await api.put(`/api/project/v2/roles/${id}/`, data);
  return response.data;
};

export const changeMemberRole = async (projectId: string, data: { user_id: string; role_id: number }): Promise<void> => {
  await api.post(`/api/project/v2/roles/${projectId}/change_member_role/`, data);
};

// ── Invites ───────────────────────────────────────────────────────────────────
export const getInvites = async (projectId: string): Promise<ProjectInvite[]> => {
  try {
    const response = await api.get(`/api/project/v2/get_invites/?project_id=${projectId}`);
    if (Array.isArray(response.data)) return response.data;
    if (response.data.results) return response.data.results;
    return [];
  } catch { return []; }
};

export const sendOnboardRequest = async (data: { email: string; project_id: string; role?: string }): Promise<void> => {
  await api.post("/api/project/onboard-requests/send/", data);
};

// ── Permissions ───────────────────────────────────────────────────────────────
export const getPermissions = async (): Promise<Permission[]> => {
  const response = await api.get("/api/project/v2/permissions/");
  if (Array.isArray(response.data)) return response.data;
  if (response.data.results) return response.data.results;
  return [];
};

export const getUserPermissions = async (projectId: string): Promise<string[]> => {
  try {
    const response = await api.get(`/api/project/v2/user_permissions/${projectId}/`);
    if (Array.isArray(response.data)) return response.data;
    if (response.data.permissions) return response.data.permissions;
    return [];
  } catch { return []; }
};

// ── Callsheets ────────────────────────────────────────────────────────────────
export const getCallSheets = async (projectId: string): Promise<CallSheet[]> => {
  const response = await api.get(`/api/callsheets/${projectId}/`);
  if (Array.isArray(response.data)) return response.data;
  if (response.data.results) return response.data.results;
  return [];
};

export const getCallSheet = async (pk: number): Promise<CallSheet> => {
  const response = await api.get(`/api/callsheets/details/${pk}/`);
  return response.data;
};

export const createCallSheet = async (projectId: string, data: Partial<CallSheet>): Promise<CallSheet> => {
  const response = await api.post(`/api/callsheets/${projectId}/`, data);
  return response.data;
};

export const updateCallSheet = async (pk: number, data: Partial<CallSheet>): Promise<CallSheet> => {
  const response = await api.put(`/api/callsheets/details/${pk}/`, data);
  return response.data;
};

export const deleteCallSheet = async (pk: number): Promise<void> => {
  await api.delete(`/api/callsheets/details/${pk}/`);
};

// ── Files ─────────────────────────────────────────────────────────────────────
export const getFolders = async (projectId: string): Promise<Folder[]> => {
  const response = await api.get(`/api/files/folders/${projectId}/`);
  if (response.data?.data) return response.data.data;
  if (Array.isArray(response.data)) return response.data;
  return [];
};

export const createFolder = async (
  projectId: string,
  data: { name: string; description?: string; icon?: string; allowed_users?: number[] }
): Promise<Folder> => {
  const DEFAULT_FOLDER_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`;
  const response = await api.post(`/api/files/folders/${projectId}/`, {
    ...data,
    icon: data.icon || DEFAULT_FOLDER_SVG,
    allowed_users: data.allowed_users ?? [],
  });
  return response.data?.data ?? response.data;
};

export const getFilesInFolder = async (folderId: number): Promise<ProjectFile[]> => {
  const response = await api.get(`/api/files/folders/files/${folderId}/`);
  if (response.data?.data) return response.data.data;
  if (Array.isArray(response.data)) return response.data;
  return [];
};

export const uploadFile = async (folderId: number, file: File): Promise<ProjectFile> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('name', file.name);
  formData.append('folder', String(folderId));
  const response = await api.post(`/api/files/folders/files/${folderId}/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data?.data ?? response.data;
};

export const deleteFile = async (fileId: number): Promise<void> => {
  await api.delete(`/api/files/${fileId}/`);
};

// ── AI Chat Sessions ──────────────────────────────────────────────────────────
export const getChatSessions = async (): Promise<ChatSession[]> => {
  const response = await api.get("/api/ai_chat/sessions/");
  if (Array.isArray(response.data)) return response.data;
  if (response.data.results) return response.data.results;
  return [];
};

export const getChatHistory = async (sessionId: string): Promise<ChatMessage[]> => {
  const response = await api.get(`/api/ai_chat/history/${sessionId}/`);
  if (Array.isArray(response.data)) return response.data;
  if (response.data.results) return response.data.results;
  return [];
};

export const deleteChatSession = async (sessionId: string): Promise<void> => {
  await api.delete(`/api/ai_chat/sessions/${sessionId}/`);
};

// ── Reports ───────────────────────────────────────────────────────────────────
export const getAvailableReports = async (projectId: string): Promise<{ system_reports: AvailableReport[]; custom_reports: AvailableReport[] }> => {
  const response = await api.get(`/api/project/reports/list/?project_id=${projectId}`);
  return response.data;
};

export const getGeneratedReports = async (projectId: string): Promise<ProjectReport[]> => {
  const response = await api.get(`/api/project/reports/generated/?project_id=${projectId}`);
  if (response.data?.reports) return response.data.reports;
  if (Array.isArray(response.data)) return response.data;
  return [];
};

export const generateReports = async (projectId: string, reportNames: string[]): Promise<{ task_id?: string; message?: string }> => {
  const response = await api.post(`/api/project/reports/generate/?project_id=${projectId}`, { reports: reportNames });
  return response.data;
};

export const createCustomReport = async (data: { project_id: string; name: string; display_name?: string; prompt_template?: string; dependencies?: string[] }): Promise<{ report_id: number; message: string }> => {
  const response = await api.post("/api/project/custom-reports/create/", data);
  return response.data;
};
