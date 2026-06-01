// STO-1854 — Debounced, cancellable cost preflight.
//
// Calls the backend preflight (POST {preflight:true}) ~400ms after the request
// shape settles, aborting any in-flight request when inputs change again. The
// backend re-validates authoritatively at submit time; this is UX-only pricing.

import { useEffect, useRef, useState } from "react";
import axios from "axios";
import { preflightVideoCost } from "@/services/video";
import { extractApiError } from "@/lib/extract-api-error";
import { VideoCostEstimate, UploadedMedia, ElementInput } from "@/types/video";

const DEBOUNCE_MS = 400;

export interface PreflightInput {
  slug: string | null;
  params: Record<string, unknown>;
  media: Record<string, (string | UploadedMedia)[]>;
  elements: ElementInput[];
  character_ids: (string | number)[];
  /** When false, no request fires (e.g. client-side constraint failure). */
  enabled: boolean;
}

export interface UseVideoCostPreflightResult {
  estimate: VideoCostEstimate | null;
  loading: boolean;
  /** Validation/constraint error returned by the backend preflight (HTTP 400). */
  error: string | null;
}

export function useVideoCostPreflight(input: PreflightInput): UseVideoCostPreflightResult {
  const { slug, params, media, elements, character_ids, enabled } = input;
  const [estimate, setEstimate] = useState<VideoCostEstimate | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Serialize the request shape so the effect only re-fires on a real change.
  const key = JSON.stringify({ slug, params, media, elements, character_ids, enabled });
  const controllerRef = useRef<AbortController | null>(null);

  // Mirror the latest inputs into a ref so a fired timer reads current values
  // rather than the values captured when the effect that scheduled it ran.
  // `key` already gates re-scheduling, so behavior is unchanged for valid runs;
  // the ref just removes the stale-closure footgun if that ever drifts.
  const latest = useRef({ slug, params, media, elements, character_ids });
  latest.current = { slug, params, media, elements, character_ids };

  useEffect(() => {
    if (!slug || !enabled) {
      setEstimate(null);
      setError(null);
      setLoading(false);
      return;
    }

    const timer = setTimeout(() => {
      controllerRef.current?.abort();
      const controller = new AbortController();
      controllerRef.current = controller;
      setLoading(true);
      setError(null);
      const cur = latest.current;
      preflightVideoCost(cur.slug ?? slug, cur.params, cur.media, cur.elements, cur.character_ids, controller.signal)
        .then((est) => {
          if (controller.signal.aborted) return;
          setEstimate(est);
          setError(null);
        })
        .catch((err: unknown) => {
          if (axios.isCancel(err) || controller.signal.aborted) return;
          setEstimate(null);
          setError(extractApiError(err, "Could not estimate cost."));
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controllerRef.current?.abort();
    };
    // `key` captures all dependencies that should re-trigger the preflight.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { estimate, loading, error };
}
