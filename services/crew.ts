import api from './api';

export interface CrewProfile {
  id?: number;
  name?: string;
  full_name?: string;
  job_title?: string;
  image?: string | null;
  skills?: string[];
  location?: string;
  user?: { id: number; email: string };
  [key: string]: unknown;
}

export const searchCrew = async (params: { location?: string; skills?: string[]; name?: string }): Promise<CrewProfile[]> => {
  const res = await api.post('/api/crew/crew-profile/search/', {
    location: params.location ?? '',
    skills: params.skills ?? [],
    name: params.name ?? '',
  });
  return res.data?.data ?? res.data ?? [];
};
