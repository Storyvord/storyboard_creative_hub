"use client";

/**
 * Act I: the floor.
 *
 * One sticky canvas behind a wide shot and a call sheet. The wide is the hero;
 * scrolling on walks the floor, and as each department's row reaches reading
 * position the camera pushes in on its station. Rows are also buttons, so a
 * reader can jump straight to one.
 *
 * This is the same grammar the roll uses in Act II - scroll moves the camera -
 * which is the point. A page with one rule reads as one piece; a page where you
 * click here and scroll there reads as two demos stitched together.
 *
 * The canvas is aria-hidden. The rows are the interface: they carry the copy,
 * take focus, and are what a screen reader reads. The section is complete with
 * the 3D absent, which is also what renders when there is no WebGL to be had.
 */

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";

import { STATIONS, type StationId } from "./stations";

const Soundstage = dynamic(() => import("./Soundstage"), { ssr: false, loading: () => null });

/* ── WebGL probe ─────────────────────────────────────────────────── */

let webglSupport: boolean | undefined;

function probeWebGL(): boolean | null {
  if (webglSupport === undefined) {
    try {
      const canvas = document.createElement("canvas");
      webglSupport = !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
    } catch {
      webglSupport = false;
    }
  }
  return webglSupport;
}
const noSubscribe = () => () => {};
const serverSnapshot = (): boolean | null => null;

function useWebGL() {
  return useSyncExternalStore(noSubscribe, probeWebGL, serverSnapshot);
}

/* ── Section ─────────────────────────────────────────────────────── */

export default function FloorSection() {
  const section = useRef<HTMLElement>(null);
  const [station, setStation] = useState<StationId | null>(null);
  // Mounted only while the floor is near the viewport. Once the reader is down
  // in the roll, this context is torn down so two WebGL scenes never run at once.
  const [armed, setArmed] = useState(true);
  const webgl = useWebGL();

  useEffect(() => {
    const el = section.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => setArmed(entry.isIntersecting),
      { rootMargin: "50% 0px 50% 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  /* Scroll walks the floor: whichever row is at reading position is the station. */
  useEffect(() => {
    const rows = Array.from(section.current?.querySelectorAll<HTMLElement>("[data-station]") ?? []);
    if (!rows.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const id = entry.target.getAttribute("data-station");
          // The hero row carries "wide": arriving back at it pulls the camera out.
          setStation(id === "wide" ? null : (id as StationId));
        }
      },
      { rootMargin: "-40% 0px -40% 0px" }
    );
    rows.forEach((r) => io.observe(r));
    return () => io.disconnect();
  }, []);

  const jump = useCallback((id: StationId) => {
    setStation(id);
    // Bring the row to reading position so the observer and the click agree.
    document.getElementById(`station-${id}`)?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, []);

  return (
    <section className="floor" id="floor" aria-labelledby="floor-title" ref={section}>
      <div className="floor-canvas" aria-hidden>
        {webgl === true && armed && <Soundstage station={station} />}
        {webgl === false && (
          <p className="floor-nogl mono">3D preview unavailable on this device. The floor below reads the same.</p>
        )}
      </div>

      <div className="floor-steps">
        {/* The wide shot. Also the first observed row, so scrolling back up here
            pulls the camera back out. */}
        <div className="floor-hero" data-station="wide">
          <p className="eyebrow mono">Int. Soundstage. Day.</p>
          <h1 id="floor-title" className="display-1">
            One set.<br />
            <em>Every department.</em>
          </h1>
          <p className="lede">
            Every piece of kit on this stage is a department. Every department
            already has a home in Storyvord.
          </p>
          <div className="actions">
            <Link href="/register" className="cta">Start for free</Link>
            <a href={`#station-${STATIONS[0].id}`} className="cta cta-ghost">Walk the floor</a>
          </div>
        </div>

        {/* The call sheet. */}
        <ol className="floor-sheet" aria-label="Departments on the floor">
          {STATIONS.map((s) => {
            const on = station === s.id;
            return (
              <li key={s.id} className="floor-row" data-station={s.id} id={`station-${s.id}`}>
                <button
                  type="button"
                  className={`floor-station ${on ? "is-on" : ""}`}
                  aria-pressed={on}
                  onClick={() => jump(s.id)}
                >
                  <span className="floor-role">{s.role}</span>
                  <span className="floor-kit mono">{s.kit}</span>
                  <span className="floor-job">{s.job}</span>
                  <span className="floor-module mono">{s.module}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <p className="sr-live mono" aria-live="polite">
        {station
          ? `Camera on ${STATIONS.find((s) => s.id === station)?.role.toLowerCase()}.`
          : "Wide shot of the soundstage."}
      </p>
    </section>
  );
}
