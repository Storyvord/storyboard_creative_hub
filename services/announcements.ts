import api from './api';

export interface AnnouncementCreator {
  membership_id: number;
  user_id: number;
  personal_details: { full_name: string | null; profile_picture: string | null };
  role: { id: number; name: string; description: string };
}

export interface ProjectAnnouncement {
  id: number;
  creator: AnnouncementCreator;
  title: string;
  message: string;
  created_at: string;
  updated_at: string;
  is_urgent: boolean;
  project: string;
  recipients: number[]; // membership IDs
}

// GET /api/announcement/project-announcements/?project_id=<uuid>
export const getProjectAnnouncements = async (projectId: string): Promise<ProjectAnnouncement[]> => {
  const res = await api.get(`/api/announcement/project-announcements/?project_id=${projectId}`);
  // Response: { count, results: { message, data: [...] } }
  return res.data?.results?.data ?? res.data?.data ?? [];
};

// POST /api/announcement/v2/project-announcements/
export const createProjectAnnouncement = async (payload: {
  title: string;
  message: string;
  project: string;
  is_urgent?: boolean;
}): Promise<ProjectAnnouncement> => {
  const res = await api.post('/api/announcement/v2/project-announcements/', payload);
  return res.data?.data ?? res.data;
};
