import api from './api';

export interface NetworkUser {
  id: number;
  email: string;
  personal_info: {
    full_name: string | null;
    job_title: string | null;
    image: string | null;
  };
}

export interface Connection {
  id: number;
  requester: NetworkUser;
  receiver: NetworkUser;
  status: string;
  created_at: string;
  updated_at: string;
}

export const getConnections = async (): Promise<Connection[]> => {
  const res = await api.get('/api/network/connections/');
  return res.data?.results ?? res.data ?? [];
};

export const getConnectionRequests = async (): Promise<Connection[]> => {
  const res = await api.get('/api/network/connections/requests/');
  return Array.isArray(res.data) ? res.data : (res.data?.results ?? []);
};

export const sendConnectionRequest = async (receiver_email: string) => {
  const res = await api.post('/api/network/connections/send/', { receiver_email });
  return res.data;
};

export const manageConnection = async (requester_id: number, status: 'accepted' | 'rejected') => {
  const res = await api.post('/api/network/connections/manage/', { requester_id, status });
  return res.data;
};

export const cancelConnection = async (body: Record<string, unknown>) => {
  const res = await api.post('/api/network/connections/cancel/', body);
  return res.data;
};

export const profileSearch = async (q: string): Promise<NetworkUser[]> => {
  const res = await api.post('/api/network/profile-search/', { q });
  return res.data?.data ?? res.data ?? [];
};

export const getSuggestedProfiles = async (): Promise<NetworkUser[]> => {
  try {
    const res = await api.get('/api/network/suggested-profiles/');
    return res.data?.results ?? res.data ?? [];
  } catch {
    return [];
  }
};
