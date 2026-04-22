import api from './api';

export interface Notification {
  uuid: string;
  category: string;
  notification_type: string;
  priority: string;
  title: string;
  message: string;
  extra_data: Record<string, unknown> | null;
  is_read: boolean;
  read_at: string | null;
  sender_name: string;
  sender_username: string | null;
  time_since: string;
  is_system_generated: boolean;
  system_sender_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface NotificationPreference {
  websocket_enabled: boolean;
  webhook_enabled: boolean;
  webhook_url: string | null;
  task_notifications: boolean;
  project_notifications: boolean;
  calendar_notifications: boolean;
  comment_notifications: boolean;
  network_notifications: boolean;
}

export interface NotificationsPage {
  results: Notification[];
  next: string | null;
  count: number;
}

export const getNotifications = async (opts: { page?: number } = {}): Promise<NotificationsPage> => {
  const params: Record<string, number> = {};
  if (opts.page) params.page = opts.page;
  const res = await api.get('/api/notification/v2/notifications/', { params });
  const data = res.data ?? {};
  return {
    results: data.results ?? [],
    next: data.next ?? null,
    count: data.count ?? (data.results?.length ?? 0),
  };
};

export const getUnreadCount = async (): Promise<number> => {
  const res = await api.get('/api/notification/notifications/unread-count/');
  const data = res.data?.data ?? res.data;
  return data?.unread_count ?? data?.count ?? 0;
};

export const markRead = async (uuid: string): Promise<void> => {
  await api.post(`/api/notification/v2/notifications/${uuid}/mark_read/`);
};

export const markAllRead = async (): Promise<void> => {
  // Mark all by fetching unread and patching each, or use bulk endpoint if available
  await api.post('/api/notification/v2/notifications/mark_all_read/').catch(() => {});
};

export const getPreference = async (): Promise<NotificationPreference> => {
  const res = await api.get('/api/notification/preference/');
  return res.data?.data ?? res.data;
};

export const updatePreference = async (payload: Partial<NotificationPreference>): Promise<NotificationPreference> => {
  const res = await api.patch('/api/notification/preference/', payload);
  return res.data?.data ?? res.data;
};
