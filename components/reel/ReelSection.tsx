"use client";

/**
 * The scroll section that drives the falling roll.
 *
 * Two rules shape this component:
 *
 * 1. **The page scrolls normally.** No scroll-jacking, no transform-based fake
 *    scroller. The scrollbar, keyboard paging, find-in-page and "scroll to
 *    here" all keep working, and the 3D reads the position rather than owning
 *    it.
 * 2. **The steps are the content.** Each frame's copy is a real <article> in
 *    the flow, not an overlay painted from JS. That is what a screen reader
 *    reads, what renders under reduced motion, and what survives the canvas
 *    failing to start.
 *
 * Scroll progress is written to a ref, never to state: it changes every frame,
 * and putting it in state would re-render the whole tree at 60fps to move a
 * camera that reads the value directly.
 */

import dynamic from "next/dynamic";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

import { CAN_LABEL, REEL_FRAMES, REEL_LAYOUT } from "./frames";

const Reel = dynamic(() => import("./Reel"), { ssr: false, loading: () => null });

export default function ReelSection() {
  const section = useRef<HTMLDivElement>(null);
  const progress = useRef(0);
  const [active, setActive] = useState(0);
  // Only spin up WebGL when the roll is nearly on screen — there is no reason
  // to run it while the reader is still up on the soundstage.
  const [armed, setArmed] = useState(false);
  const reduceMotion = useReducedMotion();
  const flat = reduceMotion === true;

  /* Scroll → progress, rAF-throttled, written to a ref. */
  useEffect(() => {
    if (flat) return;
    const el = section.current;
    if (!el) return;

    let frame = 0;
    const measure = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      // 0 when the section's top reaches the viewport top, 1 when its bottom
      // does. Guarded against a zero-height span.
      const span = Math.max(1, rect.height - window.innerHeight);
      progress.current = Math.min(1, Math.max(0, -rect.top / span));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(measure);
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [flat]);

  /* Arm the canvas one viewport early. */
  useEffect(() => {
    if (flat) return;
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setArmed(entry.isIntersecting),
      { rootMargin: "100% 0px 100% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [flat]);

  /* Which frame is open. State, because it changes rarely. */
  useEffect(() => {
    if (flat) return;
    const steps = Array.from(
      section.current?.querySelectorAll<HTMLElement>("[data-step]") ?? []
    );
    if (!steps.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(Number(entry.target.getAttribute("data-step")));
          }
        }
      },
      // A band across the middle of the viewport: a frame opens as its copy
      // reaches reading position, not as it clips the bottom edge.
      { rootMargin: "-45% 0px -45% 0px" }
    );
    steps.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [flat]);

  /* Reduced motion: the same content, stacked, no canvas at all. */
  if (flat) {
    return (
      <section className="reel reel--flat" aria-labelledby="reel-title">
        <header className="reel-head">
          <p className="alt-eyebrow mono">The roll</p>
          <h2 id="reel-title" className="alt-h2">Seven reels, script to screen.</h2>
        </header>
        <ol className="reel-flat-list">
          {REEL_FRAMES.map((f) => (
            <li key={f.id}>
              <article className="reel-card">
                <p className="reel-slate mono">{f.slate}</p>
                <h3 className="reel-card-title">{f.title}</h3>
                <p className="reel-card-body">{f.body}</p>
                <Image
                  src={f.image}
                  alt={`${f.title} — Storyvord interface`}
                  width={960}
                  height={600}
                  className="reel-flat-shot"
                />
              </article>
            </li>
          ))}
        </ol>
        <CanLabel />
      </section>
    );
  }

  return (
    <section
      className="reel"
      aria-labelledby="reel-title"
      ref={section}
      // The stylesheet reads its lengths from these. REEL_LAYOUT also decides
      // where each frame sits on the curve, so publishing it here is what keeps
      // the scroll distance and the geometry describing the same fall.
      style={
        {
          "--reel-head": `${REEL_LAYOUT.head}svh`,
          "--reel-step": `${REEL_LAYOUT.step}svh`,
          "--reel-rest": `${REEL_LAYOUT.rest}svh`,
          "--reel-tail": `${REEL_LAYOUT.tail}svh`,
        } as React.CSSProperties
      }
    >
      <div className="reel-canvas" aria-hidden>
        {armed && <Reel active={active} progress={progress} />}
      </div>

      <div className="reel-steps">
        <header className="reel-head">
          <p className="alt-eyebrow mono">The roll</p>
          <h2 id="reel-title" className="alt-h2">Seven reels, script to screen.</h2>
          <p className="reel-head-sub">
            It falls as you scroll. Each frame opens as it passes.
          </p>
        </header>

        <ol className="reel-step-list">
          {REEL_FRAMES.map((f, i) => (
            <li className="reel-step" data-step={i} key={f.id}>
              <article className={`reel-card ${active === i ? "is-open" : ""}`}>
                <p className="reel-slate mono">{f.slate}</p>
                <h3 className="reel-card-title">{f.title}</h3>
                <p className="reel-card-body">{f.body}</p>
              </article>
            </li>
          ))}
        </ol>

        <div className="reel-rest">
          <CanLabel />
        </div>
      </div>

      <p className="reel-live mono" aria-live="polite">
        {`Frame ${active + 1} of ${REEL_FRAMES.length}: ${REEL_FRAMES[active]?.title ?? ""}`}
      </p>
    </section>
  );
}

/** Where the roll comes to rest. Struck on the can lid, as a can is. */
function CanLabel() {
  return (
    <div className="reel-can">
      <p className="reel-can-mark mono">Wrap</p>
      <dl className="reel-can-label">
        {CAN_LABEL.map(([term, value]) => (
          <div key={term}>
            <dt className="mono">{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <a href="/register" className="alt-cta">Start for free</a>
    </div>
  );
}
