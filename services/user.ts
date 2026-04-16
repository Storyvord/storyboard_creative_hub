import api from './api';

export interface UserProfile {
  id: number;
  email: string;
  full_name?: string | null;
  image?: string | null;
  job_title?: string | null;
  user_type?: number | null;
}

export interface UserCredits {
  llm: {
    current_balance: number;
    monthly_allocated: number;
    total_used: number;
  } | null;
  image: {
    current_balance: number;
    monthly_allocated: number;
    total_used: number;
  } | null;
}

export interface UserTierInfo {
  current_tier: {
    id: number;
    name: string;
    description?: string;
  } | null;
  credit_balances: Record<string, {
    current_balance: number;
    monthly_allocated: number;
    total_used: number;
    last_reset: string | null;
  }>;
}

// GET /api/accounts/v2/getprofile/
export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await api.get('/api/accounts/v2/getprofile/');
  const data = response.data?.data ?? response.data;
  const personal = data?.personal_info ?? {};
  const user = data?.user ?? {};
  return {
    id: user.id ?? 0,
    email: user.email ?? '',
    full_name: personal.full_name ?? null,
    image: personal.image ?? null,
    job_title: personal.job_title ?? null,
    user_type: user.user_type ?? null,
  };
};

// GET /api/accounts/tiers/info/
export const getUserTierInfo = async (): Promise<UserTierInfo> => {
  const response = await api.get('/api/accounts/tiers/info/');
  return response.data;
};
