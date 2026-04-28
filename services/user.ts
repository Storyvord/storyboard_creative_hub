import api from './api';

export interface UserProfile {
  id: number;
  email: string;
  full_name?: string | null;
  image?: string | null;
  job_title?: string | null;
  user_type?: number | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Credit / tier — V3 (single AI wallet + transaction log)
//
// AI-feature usage (chat, scene chat, report chat, image gen) is debited from
// the V3 wallet. The legacy v2 `credit_balances` map (split LLM/image) no
// longer reflects AI usage and should not be displayed.
// ─────────────────────────────────────────────────────────────────────────────

export type CreditTransactionType =
  | 'tier_allocation'
  | 'tier_change'
  | 'admin_grant'
  | 'admin_deduct'
  | 'usage_deduction'
  | 'purchase'
  | 'refund'
  | 'expiration'
  | string;

export interface CreditTransaction {
  id: number;
  amount: number;          // signed: positive = credit, negative = deduct
  balance_before: number;
  balance_after: number;
  transaction_type: CreditTransactionType;
  transaction_type_display: string;
  description: string;
  created_at: string;      // ISO timestamp
}

export interface UserWallet {
  current_balance: number;
  total_used: number;
  total_purchased: number;
  last_reset: string | null;
  tier_id: number | null;
  tier_name: string | null;
  tier_user_type: string | null;
}

export interface UserCreditInfo {
  wallet: UserWallet;
  recent_transactions: CreditTransaction[];
}

// GET /api/accounts/v2/getprofile/
export const getMyProfile = async (): Promise<UserProfile> => {
  const response = await api.get('/api/accounts/v2/getprofile/');
  const data = response.data?.data ?? response.data;
  const personal = data?.personal_info ?? {};
  const user = data?.user ?? {};
  // Derive a display name: full_name → email prefix (part before @)
  const emailPrefix = (user.email ?? '').split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || null;
  return {
    id: user.id ?? 0,
    email: user.email ?? '',
    full_name: personal.full_name || emailPrefix || null,
    image: personal.image ?? null,
    job_title: personal.job_title ?? null,
    user_type: user.user_type ?? null,
  };
};

// GET /api/accounts/v3/tier/credit-info/
//
// Returns the V3 wallet + last 20 transactions. AI deductions show up here
// immediately; the v2 endpoint does not reflect AI usage.
export const getUserCreditInfo = async (): Promise<UserCreditInfo> => {
  const response = await api.get('/api/accounts/v3/tier/credit-info/');
  const body = response.data ?? {};
  const wallet: UserWallet = body.wallet ?? {
    current_balance: 0,
    total_used: 0,
    total_purchased: 0,
    last_reset: null,
    tier_id: null,
    tier_name: null,
    tier_user_type: null,
  };
  const recent_transactions: CreditTransaction[] = Array.isArray(body.recent_transactions)
    ? body.recent_transactions
    : [];
  return { wallet, recent_transactions };
};
