// STO-1854 — Video catalog hook (cached fetch + group-by-family).
//
// Fetches the active catalog once (module-level cache shared across mounts) and
// groups rows by `family` so the model selector can show one model with its
// several operations. Mirrors the caching shape of useUserInfo.

import { useEffect, useState } from "react";
import { getVideoModels } from "@/services/video";
import { VideoModel } from "@/types/video";

export interface VideoFamily {
  family: string;
  /** Display name of the family (taken from the lowest-sort_order row). */
  label: string;
  operations: VideoModel[];
}

let cachedModels: VideoModel[] | null = null;
let inflight: Promise<VideoModel[]> | null = null;

/** Group rows by family, preserving sort_order then slug for stable ordering. */
export function groupByFamily(models: VideoModel[]): VideoFamily[] {
  const map = new Map<string, VideoModel[]>();
  for (const m of models) {
    const key = m.family || m.slug;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(m);
  }
  const families: VideoFamily[] = [];
  for (const [family, ops] of map.entries()) {
    const sorted = [...ops].sort(
      (a, b) => a.sort_order - b.sort_order || a.slug.localeCompare(b.slug),
    );
    // Family label: strip the operation off the first row's display name when
    // possible, otherwise use the family slug prettified.
    const label = prettifyFamily(family, sorted[0]);
    families.push({ family, label, operations: sorted });
  }
  return families.sort(
    (a, b) =>
      (a.operations[0]?.sort_order ?? 0) - (b.operations[0]?.sort_order ?? 0) ||
      a.label.localeCompare(b.label),
  );
}

function prettifyFamily(family: string, first?: VideoModel): string {
  if (first?.display_name) {
    // "Kling v3 Pro — Image to Video" → "Kling v3 Pro"
    const dash = first.display_name.split(/[—\-–·]/)[0]?.trim();
    if (dash) return dash;
  }
  return family
    .split(/[-_]/)
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}

export interface UseVideoCatalogResult {
  models: VideoModel[];
  families: VideoFamily[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useVideoCatalog(enabled: boolean = true): UseVideoCatalogResult {
  // Seed state from the module cache so a cache hit needs no in-effect setState
  // (which would trip react-hooks/set-state-in-effect and cascade renders).
  const [models, setModels] = useState<VideoModel[]>(cachedModels ?? []);
  const [loading, setLoading] = useState<boolean>(enabled && !cachedModels);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refetch = () => {
    cachedModels = null;
    inflight = null;
    // Reset the fetch lifecycle from the event handler (outside the effect) so
    // the effect body never calls setState synchronously.
    setLoading(true);
    setError(null);
    setTick((t) => t + 1);
  };

  useEffect(() => {
    // Cache hit (incl. after a re-enable): state was already seeded from the
    // cache, so there's nothing to fetch and nothing to set synchronously.
    if (!enabled || cachedModels) return;

    let cancelled = false;
    if (!inflight) inflight = getVideoModels();
    inflight
      .then((data) => {
        cachedModels = data;
        if (!cancelled) {
          setModels(data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load video models");
      })
      .finally(() => {
        inflight = null;
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled, tick]);

  return { models, families: groupByFamily(models), loading, error, refetch };
}
