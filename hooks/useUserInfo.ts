import { useEffect, useState } from 'react';
import { getMyProfile, getUserTierInfo, UserProfile, UserTierInfo } from '@/services/user';

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Module-level cache shared across all hook instances
let cachedProfile: UserProfile | null = null;
let cachedTierInfo: UserTierInfo | null = null;
let lastFetchTime: number | null = null;
let inflightPromise: Promise<void> | null = null;

export interface UseUserInfoResult {
  profile: UserProfile | null;
  tierInfo: UserTierInfo | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useUserInfo(): UseUserInfoResult {
  const [profile, setProfile] = useState<UserProfile | null>(cachedProfile);
  const [tierInfo, setTierInfo] = useState<UserTierInfo | null>(cachedTierInfo);
  const [loading, setLoading] = useState<boolean>(!cachedProfile);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refetch = () => {
    lastFetchTime = null;
    setRefreshTick((t) => t + 1);
  };

  useEffect(() => {
    const now = Date.now();
    const isCacheValid = lastFetchTime !== null && now - lastFetchTime < CACHE_TTL;

    if (isCacheValid && cachedProfile && cachedTierInfo) {
      setProfile(cachedProfile);
      setTierInfo(cachedTierInfo);
      setLoading(false);
      return;
    }

    if (inflightPromise) {
      setLoading(true);
      inflightPromise.then(() => {
        setProfile(cachedProfile);
        setTierInfo(cachedTierInfo);
        setLoading(false);
      }).catch((err) => {
        setError(err?.message ?? 'Failed to load user info');
        setLoading(false);
      });
      return;
    }

    setLoading(true);
    setError(null);

    inflightPromise = Promise.all([getMyProfile(), getUserTierInfo()])
      .then(([p, t]) => {
        cachedProfile = p;
        cachedTierInfo = t;
        lastFetchTime = Date.now();
        setProfile(p);
        setTierInfo(t);
      })
      .catch((err) => {
        setError(err?.message ?? 'Failed to load user info');
      })
      .finally(() => {
        inflightPromise = null;
        setLoading(false);
      });
  }, [refreshTick]);

  return { profile, tierInfo, loading, error, refetch };
}
