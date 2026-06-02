"use client";

// STO-1854 — Self-healing <img>.
//
// A just-generated image can briefly 404: the task reports complete and the URL
// is returned, but the storage blob isn't readable for a moment (which is why a
// manual page refresh "fixes" it). This component retries the load with backoff
// on error so the tile heals itself without a refresh. It remounts the <img>
// (key change) to re-request the SAME url — it never mutates a signed SAS URL.
import { useEffect, useRef, useState } from "react";

interface RetryingImageProps {
  src: string;
  alt: string;
  className?: string;
  /** Max reload attempts after an error (backoff: 0.7s, 1.4s, …). */
  maxRetries?: number;
}

export default function RetryingImage({ src, alt, className, maxRetries = 4 }: RetryingImageProps) {
  const [attempt, setAttempt] = useState(0);
  const [lastSrc, setLastSrc] = useState(src);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset the retry budget when the source changes (React-sanctioned
  // adjust-state-during-render, not an effect).
  if (src !== lastSrc) {
    setLastSrc(src);
    setAttempt(0);
  }

  // Clear any pending retry timer on unmount.
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      key={attempt}
      src={src}
      alt={alt}
      className={className}
      onError={() => {
        if (attempt >= maxRetries) return;
        const next = attempt + 1;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => setAttempt(next), 700 * next);
      }}
    />
  );
}
