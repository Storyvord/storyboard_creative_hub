import api from './api';

export interface CalendarEvent {
  id: number | string;
  title: string;
  description: string | null;
  start: string;
  end: string;
  location: string | null;
  calendar: number;
}

export interface UnifiedCalendar {
  id: number;
  name: string;
  user: number;
  user_calendar_events: CalendarEvent[];
}

// GET /api/calendar/unified/
export const getUnifiedCalendar = async (): Promise<UnifiedCalendar[]> => {
  const res = await api.get('/api/calendar/unified/');
  const d = res.data?.data ?? res.data;
  return Array.isArray(d) ? d : [d];
};

// POST /api/calendar/user/calendar/events/
export const createCalendarEvent = async (payload: {
  title: string;
  start: string; // ISO datetime
  end: string;
  description?: string;
  location?: string;
}): Promise<CalendarEvent> => {
  const res = await api.post('/api/calendar/user/calendar/events/', payload);
  return res.data?.data ?? res.data;
};

// PATCH /api/calendar/user/calendar/events/{id}/
export const updateCalendarEvent = async (id: number, payload: Partial<{
  title: string; start: string; end: string; description: string; location: string;
}>): Promise<CalendarEvent> => {
  const res = await api.patch(`/api/calendar/user/calendar/events/${id}/`, payload);
  return res.data?.data ?? res.data;
};

// DELETE /api/calendar/user/calendar/events/{id}/
export const deleteCalendarEvent = async (id: number): Promise<void> => {
  await api.delete(`/api/calendar/user/calendar/events/${id}/`);
};

// ── Project-scoped calendar endpoints ──────────────────────────────────────────

export interface ProjectCalendar {
  id: number;
  name: string;
  project: string;
  events: CalendarEvent[];
}

// GET /api/calendar/calendars/{project_id}/
export const getProjectCalendar = async (projectId: string): Promise<ProjectCalendar> => {
  const res = await api.get(`/api/calendar/calendars/${projectId}/`);
  return res.data?.data ?? res.data;
};

// POST /api/calendar/calendars/{project_id}/events/
export const createProjectCalendarEvent = async (
  projectId: string,
  payload: {
    title: string;
    start: string; // ISO datetime
    end: string;
    description?: string;
    location?: string;
  }
): Promise<CalendarEvent> => {
  const res = await api.post(`/api/calendar/calendars/${projectId}/events/`, payload);
  return res.data?.data ?? res.data;
};

// PATCH /api/calendar/calendars/{project_id}/events/{id}/
export const updateProjectCalendarEvent = async (
  projectId: string,
  id: number,
  payload: Partial<{ title: string; start: string; end: string; description: string; location: string }>
): Promise<CalendarEvent> => {
  const res = await api.patch(`/api/calendar/calendars/${projectId}/events/${id}/`, payload);
  return res.data?.data ?? res.data;
};

// DELETE /api/calendar/calendars/{project_id}/events/{id}/
export const deleteProjectCalendarEvent = async (projectId: string, id: number): Promise<void> => {
  await api.delete(`/api/calendar/calendars/${projectId}/events/${id}/`);
};
