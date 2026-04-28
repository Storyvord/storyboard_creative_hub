import { useEffect, useState } from 'react';
import {
  getMyProfile,
  getUserCreditInfo,
  UserCreditInfo,
  UserProfile,
} from '@/services/user';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Module-level cache shared across all hook instances
let cachedProfile: UserProfile | null = null;
let cachedCreditInfo: UserCreditInfo | null = null;
let lastFetchTime: number | null = null;
let inflightPromise: Promise<void> | null = null;

export interface UseUserInfoResult {
  profile: UserProfile | null;
  creditInfo: UserCreditInfo | null;
  loading: boolean;
  error: string | null;
  /** Force a refetch on next effect run (and bypass the cache). */
  refetch: () => void;
  /** Refetch only the wallet (cheap; no profile re-fetch). Useful after AI usage. */
  refreshCredits: () => Promise<void>;
}

export function useUserInfo(): UseUserInfoResult {
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);
  const [creditInfo, setCreditInfo] = useState<UserCreditInfo | null>(cachedCreditInfo);
  const [loading, setLoading] = useState<boolean>(!cachedProfile);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refetch = () => {
    lastFetchTime = null;
    setRefreshTick((t) => t + 1);
  };

  const refreshCredits = async () => {
    try {
      const fresh = await getUserCreditInfo();
      cachedCreditInfo = fresh;
      setCreditInfo(fresh);
    } catch {
      // Silent failure — leave the previous balance in place.
    }
  };

  useEffect(() => {
    const now = Date.now();
    const isCacheValid = lastFetchTime !== null && now - lastFetchTime < CACHE_TTL;

    if (isCacheValid && cachedProfile && cachedCreditInfo) {
      setProfile(cachedProfile);
      setCreditInfo(cachedCreditInfo);
      setLoading(false);
      return;
    }

    if (inflightPromise) {
      setLoading(true);
      inflightPromise.then(() => {
        setProfile(cachedProfile);
        setCreditInfo(cachedCreditInfo);
        setLoading(false);
      }).catch((err) => {
        setError(err?.message ?? 'Failed to load user info');
        setLoading(false);
      });
      return;
    }

    setLoading(true);
    setError(null);

    inflightPromise = Promise.all([getMyProfile(), getUserCreditInfo()])
      .then(([p, c]) => {
        cachedProfile = p;
        cachedCreditInfo = c;
        lastFetchTime = Date.now();
        setProfile(p);
        setCreditInfo(c);
      })
      .catch((err) => {
        setError(err?.message ?? 'Failed to load user info');
      })
      .finally(() => {
        inflightPromise = null;
        setLoading(false);
      });
  }, [refreshTick]);

  return { profile, creditInfo, loading, error, refetch, refreshCredits };
}
