"use client";

import { useState, useEffect, useCallback } from "react";
import { getUserPermissions } from "@/services/project";

interface UseProjectPermissionsResult {
  permissions: string[];
  canDo: (perm: string) => boolean;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useProjectPermissions(projectId: string): UseProjectPermissionsResult {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getUserPermissions(projectId);
      setPermissions(data);
    } catch (e: any) {
      setError(e?.message ?? "Failed to load permissions");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { fetch(); }, [fetch]);

  const canDo = (perm: string) => permissions.includes(perm);

  return { permissions, canDo, loading, error, refetch: fetch };
}
