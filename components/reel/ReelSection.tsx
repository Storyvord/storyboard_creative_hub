"use client";

/**
 * Act II: the roll. And Act III, the wrap, which is where the roll comes to rest.
 *
 * Same grammar as the floor: the page scrolls normally and the camera reads
 * where it got to. Scroll progress comes from Motion's useScroll, which hands
 * back a MotionValue - a number that changes every frame WITHOUT re-rendering
 * anything. The canvas reads it directly. A scroll listener writing to React
 * state would re-render the tree at 60fps to move a camera that only needs a
 * number.
 *
 * The steps are the content, not an overlay painted from JS. Each frame's copy
 * is a real <article> in the flow: what a screen reader reads, what renders under
 * reduced motion, what survives WebGL failing to start.
 */

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useReducedMotion, useScroll } from "framer-motion";

import { CAN_LABEL, REEL_FRAMES, REEL_LAYOUT } from "./frames";

const Reel = dynamic(() => import("./Reel"), { ssr: false, loading: () => null });

export default function ReelSection() {
  const section = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [armed, setArmed] = useState(false);
  const reduceMotion = useReducedMotion();
  const flat = reduceMotion === true;

  // 0 when the section's top meets the viewport's top, 1 when its bottom meets
  // the viewport's bottom. REEL_LAYOUT places the frames on the curve using
  // exactly this definition, which is what keeps them under the camera.
  const { scrollYProgress } = useScroll({
    target: section,
    offset: ["start start", "end end"],
  });

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

  /* Which frame is open. */
  useEffect(() => {
    if (flat) return;
    const steps = Array.from(section.current?.querySelectorAll<HTMLElement>("[data-step]") ?? []);
    if (!steps.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(Number(entry.target.getAttribute("data-step")));
        }
      },
      // A band across the middle: a frame opens as its copy reaches reading
      // position, not as it clips the bottom edge.
      { rootMargin: "-45% 0px -45% 0px" }
    );
    steps.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [flat]);

  const layoutVars = {
    "--reel-head": `${REEL_LAYOUT.head}svh`,
    "--reel-step": `${REEL_LAYOUT.step}svh`,
    "--reel-rest": `${REEL_LAYOUT.rest}svh`,
    "--reel-tail": `${REEL_LAYOUT.tail}svh`,
  } as React.CSSProperties;

  /* Reduced motion: the same content, stacked, no canvas at all. */
  if (flat) {
    return (
      <section className="reel reel--flat" id="roll" aria-labelledby="reel-title">
        <header className="reel-head">
          <h2 id="reel-title" className="display-2">What the camera saw.</h2>
          <p className="lede">Seven reels of the product, script to screen.</p>
        </header>
        <ol className="reel-flat-list">
          {REEL_FRAMES.map((f) => (
            <li key={f.id}>
              <article className="reel-card">
                <h3 className="reel-card-title">{f.title}</h3>
                <p className="reel-card-body">{f.body}</p>
                <Image
                  src={f.image}
                  alt={`${f.title} Storyvord interface`}
                  width={960}
                  height={600}
                  className="reel-flat-shot"
                />
              </article>
            </li>
          ))}
        </ol>
        <Wrap />
      </section>
    );
  }

  return (
    <section className="reel" id="roll" aria-labelledby="reel-title" ref={section} style={layoutVars}>
      <div className="reel-canvas" aria-hidden>
        {armed && <Reel active={active} progress={scrollYProgress} />}
      </div>

      <div className="reel-steps">
        <header className="reel-head">
          <h2 id="reel-title" className="display-2">What the camera saw.</h2>
          <p className="lede">Seven reels of the product, script to screen.</p>
        </header>

        <ol className="reel-step-list">
          {REEL_FRAMES.map((f, i) => (
            <li className="reel-step" data-step={i} key={f.id}>
              <article className={`reel-card ${active === i ? "is-open" : ""}`}>
                <h3 className="reel-card-title">{f.title}</h3>
                <p className="reel-card-body">{f.body}</p>
              </article>
            </li>
          ))}
        </ol>

        <div className="reel-rest" id="wrap">
          <Wrap />
        </div>
      </div>

      <p className="sr-live mono" aria-live="polite">
        {`Frame ${active + 1} of ${REEL_FRAMES.length}. ${REEL_FRAMES[active]?.title ?? ""}`}
      </p>
    </section>
  );
}

/** Act III. The roll is wound, canned and labelled. The label is the close. */
function Wrap() {
  return (
    <div className="wrap-can">
      <p className="eyebrow mono">Wrap</p>
      <dl className="wrap-label">
        {CAN_LABEL.map(([term, value]) => (
          <div key={term}>
            <dt className="mono">{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      <Link href="/register" className="cta">Start for free</Link>
    </div>
  );
}
