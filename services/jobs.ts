import api from './api';

export type JobType = 'full_time' | 'part_time' | 'contract' | 'internship' | 'freelance';
export type JobMode = 'onsite' | 'remote' | 'hybrid';

export interface ProjectJob {
  id: string;
  project: string;
  created_by: number;
  date: string;
  roles: string;
  rates: string;
  location: string;
  description: string;
  job_type: JobType;
  job_mode: JobMode;
  number_of_views: number;
  number_of_applicants: number;
  experience_required: number;
  is_accepting: boolean;
  applicants: unknown[];
  created_at: string;
  updated_at: string;
  title?: string;
}

export interface JobApplicant {
  id: number;
  user: { id: number; email: string; full_name: string | null; image: string | null };
  applied_at: string;
  status: string;
}

// GET /api/project/v2/jobs/?project_id=
export const getProjectJobs = async (projectId: string): Promise<ProjectJob[]> => {
  const res = await api.get(`/api/project/v2/jobs/?project_id=${projectId}`);
  const data = res.data?.data ?? res.data;
  return Array.isArray(data) ? data : [];
};

// POST /api/project/v2/jobs/create/
export const createJob = async (payload: {
  title?: string;
  description: string;
  project: string;
  roles: string;
  rates: string;
  date: string;
  location: string;
  job_type?: JobType;
  job_mode?: JobMode;
  experience_required?: number;
}): Promise<ProjectJob> => {
  const res = await api.post('/api/project/v2/jobs/create/', payload);
  return res.data?.job ?? res.data?.data ?? res.data;
};

// DELETE /api/project/v2/jobs/{id}/delete/
export const deleteJob = async (jobId: string): Promise<void> => {
  await api.delete(`/api/project/v2/jobs/${jobId}/delete/`);
};

// GET /api/project/v2/jobs/{id}/applicants/
export const getJobApplicants = async (jobId: string): Promise<JobApplicant[]> => {
  const res = await api.get(`/api/project/v2/jobs/${jobId}/applicants/`);
  return res.data?.applicants ?? res.data?.data ?? [];
};
