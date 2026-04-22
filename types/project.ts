export interface ProjectOwnerDetails {
  id: string | number;
  email: string;
  full_name?: string | null;
  job_title?: string | null;
  image?: string | null;
}

export interface Project {
  project_id: string;
  name: string;
  content_type?: string;
  brief?: string;
  additional_details?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  owner_details?: ProjectOwnerDetails;
  members?: ProjectMember[];
  is_favorite?: boolean;
  [key: string]: any;
}

export interface ProjectMember {
  id: number;
  user: { id: string; email: string; first_name?: string; last_name?: string };
  role?: Role;
  is_active: boolean;
}

export interface Role {
  role_id: number;
  role_name: string;
  description?: string;
  is_global?: boolean;
  permissions: Record<string, string[]>;
  member_count?: number;
  order?: number;
}

export interface Permission {
  id: number;
  name: string;
  description?: string;
  resource: string;
  action: string;
}

export interface ProjectInvite {
  id: string;
  email: string;
  role?: string;
  status: string;
  created_at: string;
}

export interface CallSheet {
  id: number;
  project: string;
  title: string;
  date?: string | null;
  calltime?: string | null;
  location?: string;
  nearest_hospital_address?: string;
  nearest_police_station?: string;
  nearest_fire_station?: string;
  additional_notes?: string | null;
  production_notes?: string | null;
  ai_generated?: boolean;
}

export interface Folder {
  id: number;
  name: string;
  description?: string | null;
  icon?: string;
  project: string;
  default?: boolean;
  files?: ProjectFile[];
}

export interface ProjectFile {
  id: number;
  name: string;
  file?: string | null;
  folder?: number | null;
}

export interface ChatSession {
  session_id: string;
  title?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: string;
}

export interface ProjectReport {
  id: number;
  project: string;
  report_type: string;
  report_id: number;
  data: any;
  status: string;
  created_at: string;
  updated_at: string;
  name?: string;
  display_name?: string;
}

export interface AvailableReport {
  id: number;
  name: string;
}
