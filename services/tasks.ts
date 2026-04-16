import api from './api';

// ── Types ──────────────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'on_hold';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AssignedMember {
  id: number;
  is_active: boolean;
  user: { id: number; email: string; full_name: string | null; job_title: string | null; image: string | null };
  role: { id: number; name: string };
}

export interface ProjectTask {
  taskid: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  duedate: string | null;
  ProjectId: { projectid: string; name: string };
  role: { id: number; name: string } | null;
  member: { id: number; user: { id: number; email: string; is_active: boolean }; role: { id: number; name: string } } | null;
  AssignedTo: AssignedMember[];
  creator: { id: number; email: string; full_name?: string | null; image?: string | null } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTaskCheckList {
  checklistID: number;
  taskid: { taskid: number; title: string };
  userid: { id: number; email: string } | null;
  item: string;
  duedate: string | null;
  is_done: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTaskComment {
  commentID: number;
  taskID: { taskid: number; title: string };
  memberid: {
    id: number; is_active: boolean;
    user: { id: number; email: string; full_name: string | null; image: string | null };
    role: { id: number; name: string };
  };
  content: string;
  parentID: { commentID: number; content: string } | null;
  name: string | null;
  image_url: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Project Tasks ──────────────────────────────────────────────────────────────

export const getProjectTasks = async (projectId: string): Promise<ProjectTask[]> => {
  const res = await api.get(`/api/tasks/project-tasks/${projectId}/`);
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? data : [];
};

export const createProjectTask = async (payload: {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  duedate?: string;
  ProjectId: string;
  member?: number;
  role?: number;
  AssignedTo?: number[];
}): Promise<ProjectTask> => {
  const res = await api.post('/api/tasks/project-task/', payload);
  return res.data?.data ?? res.data;
};

export const updateProjectTask = async (taskId: number, payload: Partial<{
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  duedate: string;
  member: number;
  role: number;
  AssignedTo: number[];
}>): Promise<ProjectTask> => {
  const res = await api.patch(`/api/tasks/project-tasks/${taskId}/`, payload);
  return res.data?.data ?? res.data;
};

export const deleteProjectTask = async (taskId: number): Promise<void> => {
  await api.delete(`/api/tasks/project-tasks/${taskId}/delete/`);
};

// ── Task Checklists ────────────────────────────────────────────────────────────

export const getProjectTaskChecklists = async (taskId: number): Promise<ProjectTaskCheckList[]> => {
  const res = await api.get(`/api/tasks/project-task-checklists/${taskId}/`);
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? data : [];
};

export const createProjectTaskChecklist = async (payload: {
  taskid: number; item: string; duedate?: string;
}): Promise<ProjectTaskCheckList> => {
  const res = await api.post('/api/tasks/project-task-checklist/', payload);
  return res.data?.data ?? res.data;
};

export const updateProjectTaskChecklist = async (checklistId: number, payload: {
  item?: string; duedate?: string; is_done?: boolean;
}): Promise<ProjectTaskCheckList> => {
  const res = await api.patch(`/api/tasks/checklist/${checklistId}/`, payload);
  return res.data?.data ?? res.data;
};

export const deleteProjectTaskChecklist = async (checklistId: number): Promise<void> => {
  await api.delete(`/api/tasks/project-tasks-checklist/${checklistId}/delete`);
};

// ── Task Comments ──────────────────────────────────────────────────────────────

export const getProjectTaskComments = async (taskId: number): Promise<ProjectTaskComment[]> => {
  const res = await api.get(`/api/tasks/project-task-comments/${taskId}/`);
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? data : [];
};

export const createProjectTaskComment = async (payload: {
  taskID: number; content: string; parentID?: number;
}): Promise<ProjectTaskComment> => {
  const res = await api.post('/api/tasks/project-task-comment/', payload);
  return res.data?.data ?? res.data;
};
