"use client";

/**
 * /alt-landing. The 3D build, kept beside the editorial landing so the two can
 * be compared.
 *
 * Three acts, one rule: scroll moves the camera.
 *
 *   I.   The floor.  A soundstage. The wide shot is the hero; scrolling on walks
 *        the set, and each department's row pushes the camera in on its station.
 *        The walk ends on the camera, whose copy hands off to what it shot.
 *   II.  The roll.   A film strip unspools from that camera's reel and falls,
 *        twisting, past the viewer. Each frame is a part of the product; each
 *        opens as its copy reaches reading position.
 *   III. The wrap.   The strip winds into a can. The can is labelled the way a
 *        real one is, and the label is the close.
 *
 * Every section is what the previous one produced: the set makes the footage,
 * the footage fills the can. That is the whole argument for "one workspace for
 * the whole unit", made as a thing you scroll through rather than a list.
 *
 * Dark only, on purpose. This is a soundstage and the v1 landing is the same
 * black; a light mode here would be a different product.
 */

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";

import FloorSection from "@/components/soundstage/FloorSection";
import ReelSection from "@/components/reel/ReelSection";
import "./alt-landing.css";

const ACTS = [
  { id: "floor", label: "The floor" },
  { id: "roll", label: "The roll" },
  { id: "wrap", label: "The wrap" },
] as const;

/** Which act is on screen, for the bar. The sections own their own ids. */
function useActiveAct() {
  const [active, setActive] = useState<string>("floor");
  useEffect(() => {
    const targets = ACTS.map((a) => document.getElementById(a.id)).filter(Boolean) as HTMLElement[];
    if (!targets.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    targets.forEach((t) => io.observe(t));
    return () => io.disconnect();
  }, []);
  return active;
}

export default function AltLandingPage() {
  const act = useActiveAct();

  return (
    <div className="alt">
      <a className="skip" href="#floor-title">Skip to content</a>

      <header className="bar">
        <Link href="/" className="bar-home" aria-label="Storyvord home">
          <Image
            src="/storyvord/logo.svg"
            alt="Storyvord"
            width={120}
            height={40}
            priority
            style={{ height: 28, width: "auto" }}
          />
        </Link>

        <nav className="bar-nav mono" aria-label="Acts">
          {ACTS.map((a) => (
            <a
              key={a.id}
              href={`#${a.id}`}
              className="bar-link"
              aria-current={act === a.id ? "true" : undefined}
            >
              {a.label}
            </a>
          ))}
        </nav>

        <Link href="/register" className="cta cta-small">Start for free</Link>
      </header>

      <main>
        <FloorSection />
        <ReelSection />
      </main>

      <footer className="credits mono">
        <span>Storyvord</span>
        <nav aria-label="Footer">
          <Link href="/" className="credits-link">Editorial version</Link>
          <Link href="/login" className="credits-link">Log in</Link>
        </nav>
      </footer>
    </div>
  );
}
