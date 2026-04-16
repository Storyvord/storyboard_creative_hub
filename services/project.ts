import api from "./api";
import { Project, ProjectMember, Role, Permission, ProjectInvite } from "@/types/project";

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

export const createProject = async (data: Partial<Project>): Promise<Project> => {
  const response = await api.post("/api/project/v2/projects/", data);
  return response.data;
};

export const updateProject = async (id: string, data: Partial<Project>): Promise<Project> => {
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

export const createRole = async (data: Partial<Role> & { project_id: string }): Promise<Role> => {
  const response = await api.post("/api/project/v2/roles/", data);
  return response.data;
};

export const updateRole = async (id: number, data: Partial<Role>): Promise<Role> => {
  const response = await api.put(`/api/project/v2/roles/${id}/`, data);
  return response.data;
};

export const changeMemberRole = async (
  projectId: string,
  data: { user_id: string; role_id: number }
): Promise<void> => {
  await api.post(`/api/project/v2/roles/${projectId}/change_member_role/`, data);
};

// ── Invites ───────────────────────────────────────────────────────────────────

export const getInvites = async (projectId: string): Promise<ProjectInvite[]> => {
  const response = await api.get(`/api/project/v2/get_invites/?project_id=${projectId}`);
  if (Array.isArray(response.data)) return response.data;
  if (response.data.results) return response.data.results;
  return [];
};

export const sendOnboardRequest = async (data: {
  email: string;
  project_id: string;
  role?: string;
}): Promise<void> => {
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
  const response = await api.get(`/api/project/v2/user_permissions/${projectId}/`);
  // API may return { permissions: [...] } or just an array
  if (Array.isArray(response.data)) return response.data;
  if (response.data.permissions) return response.data.permissions;
  return [];
};
