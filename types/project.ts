export interface Project {
  project_id: string;
  name: string;
  brief?: string;
  additional_details?: string;
  budget_currency?: string;
  budget_amount?: number | null;
  content_type?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
  user?: string; // owner user id
  // legacy field kept for backward compat
  description?: string;
  [key: string]: any;
}

export interface ProjectMember {
  id: number;
  user: { id: string; email: string; first_name?: string; last_name?: string };
  role?: { id: number; name: string };
  is_active: boolean;
}

export interface Role {
  role_id: number;
  role_name: string;
  description?: string;
  is_global: boolean;
  permissions: Record<string, string[]>;
  member_count?: number;
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
