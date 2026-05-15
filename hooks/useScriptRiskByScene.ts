"use client";

// Fetches the latest FINALIZED / AWAITING_APPROVAL analysis envelope for a
// script and reduces it to a `Map<sceneId, { severity, count }>` keyed by
// scene id so the script-overview page can render per-scene risk badges
// without hitting `getSceneFindings` once per row.
//
// Cache scope: session (module-level Map). The script-overview list usually
// renders 10–100 scenes; one envelope fetch per script per session is the
// right trade-off versus N parallel scene calls.

import { useEffect, useState } from "react";
import { Severity } from "@/types/risk-analyzer";
import {
  getResults,
  listAnalyses,
} from "@/services/risk-analyzer";

const SEVERITY_RANK: Severity[] = ["Critical", "High", "Medium", "Low"];

export interface ScriptRiskCell {
  severity: Severity | null;
  count: number;
}

interface CacheEntry {
  /** When the entry was created — used to expire after `TTL_MS`. */
  fetchedAt: number;
  data: Map<number, ScriptRiskCell>;
}

const CACHE = new Map<number, CacheEntry>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes — enough for one session.

function maxSeverity(a: Severity | null, b: Severity): Severity {
  if (a === null) return b;
  return SEVERITY_RANK.indexOf(b) < SEVERITY_RANK.indexOf(a) ? b : a;
}

async function loadForScript(
  scriptId: number,
): Promise<Map<number, ScriptRiskCell>> {
  const cached = CACHE.get(scriptId);
  if (cached && Date.now() - cached.fetchedAt < TTL_MS) {
    return cached.data;
  }

  const items = await listAnalyses(scriptId);
  // Prefer the most recent FINALIZED, otherwise the most recent
  // AWAITING_APPROVAL. Earlier-stage analyses don't have stable scores so
  // surfacing them on the script overview would be misleading.
  const ranked = items
    .slice()
    .sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  const candidate =
    ranked.find((it) => String(it.status).toUpperCase() === "FINALIZED") ??
    ranked.find(
      (it) => String(it.status).toUpperCase() === "AWAITING_APPROVAL",
    );

  const map = new Map<number, ScriptRiskCell>();
  if (!candidate) {
    CACHE.set(scriptId, { fetchedAt: Date.now(), data: map });
    return map;
  }

  const envelope = await getResults(scriptId, candidate.id);
  for (const scene of envelope.scenes ?? []) {
    const active = scene.findings.filter((f) => !f.deleted_by_user);
    if (active.length === 0) {
      // Backend hint (when available) — surface "no risk" rather than max.
      if (scene.has_findings === false) {
        map.set(scene.scene_id, { severity: null, count: 0 });
      }
      continue;
    }
    let sev: Severity | null = null;
    for (const f of active) {
      sev = maxSeverity(sev, f.severity);
    }
    map.set(scene.scene_id, { severity: sev, count: active.length });
  }

  CACHE.set(scriptId, { fetchedAt: Date.now(), data: map });
  return map;
}

interface UseScriptRiskByScene {
  byScene: Map<number, ScriptRiskCell> | null;
  loading: boolean;
  error: string | null;
}

export function useScriptRiskByScene(
  scriptId: number | null | undefined,
): UseScriptRiskByScene {
  const [byScene, setByScene] = useState<Map<number, ScriptRiskCell> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!scriptId) {
      // Defer the reset to the next microtask so we don't trigger a
      // synchronous setState during the effect body (ESLint
      // react-hooks/set-state-in-effect).
      const handle = queueMicrotask(() => setByScene(null));
      return () => {
        if (handle !== undefined) {
          // queueMicrotask has no cancel — best we can do is no-op here.
        }
      };
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setLoading(true);
      setError(null);
    });
    loadForScript(scriptId)
      .then((data) => {
        if (cancelled) return;
        setByScene(data);
      })
      .catch((err) => {
        // Risk badges are non-essential — log and bail silently so the
        // script page still renders. A 404 from a project without any
        // analysis is the most common case.
        console.warn("[useScriptRiskByScene] load failed", err);
        if (!cancelled) setError("Couldn't load risk data.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [scriptId]);

  return { byScene, loading, error };
}

/**
 * Manually invalidate the session cache for a script — call this after
 * starting / finalizing an analysis so subsequent navigations refetch.
 */
export function invalidateScriptRiskCache(scriptId: number): void {
  CACHE.delete(scriptId);
}
