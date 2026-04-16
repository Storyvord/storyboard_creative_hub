import api from './api';

export interface PersonalInfo {
  full_name: string | null;
  job_title: string | null;
  image: string | null;
}

export interface DialogUser {
  id: number;
  email: string;
  personal_info: PersonalInfo;
}

export interface Dialog {
  id: number;
  user1: DialogUser;
  user2: DialogUser;
}

export interface Message {
  id: number;
  sender: DialogUser;
  recipient: DialogUser;
  text: string;
  read: boolean;
  created: string;
}

export const getDialogs = async (): Promise<Dialog[]> => {
  const res = await api.get('/api/inbox/dialogs/');
  return res.data?.results ?? res.data ?? [];
};

export const getMessages = async (userId: number): Promise<Message[]> => {
  const res = await api.get(`/api/inbox/dialogs/${userId}/messages/`);
  return res.data?.results ?? res.data ?? [];
};

export const sendMessage = async (userId: number, text: string): Promise<Message> => {
  const res = await api.post(`/api/inbox/dialogs/${userId}/messages/send/`, { text });
  return res.data;
};

export const markMessageRead = async (messageId: number): Promise<void> => {
  await api.patch(`/api/inbox/messages/${messageId}/read/`);
};
