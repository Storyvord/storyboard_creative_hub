"use client";

/**
 * /alt-landing — a 3D alternative to the editorial landing page, kept beside it
 * rather than replacing it so the two can be shown side by side.
 *
 * The premise: a soundstage you can walk around, where every piece of kit is a
 * department, and every department maps to the Storyvord surface that does its
 * job. The 3D is the argument, not decoration — "one workspace for the whole
 * unit" is easier to see as a set than to read as a list.
 */

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { STATIONS, type StationId } from "@/components/soundstage/stations";
import "./alt-landing.css";

// three.js reaches for `window` on import and a WebGL context cannot exist on
// the server, so there is nothing to server-render here.
const Soundstage = dynamic(() => import("@/components/soundstage/Soundstage"), {
  ssr: false,
  loading: () => null,
});

/**
 * Cheap probe: does this device have a WebGL context to give us at all?
 *
 * useSyncExternalStore rather than an effect that calls setState — the answer
 * is a fact about the browser, not a subscription, and setting it from an
 * effect costs a second render pass on every visit. The result is cached at
 * module scope because getSnapshot must be referentially stable: returning a
 * freshly-probed value each call would spin React forever.
 */
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

/** No store to subscribe to: support does not change mid-session. */
const noSubscribe = () => () => {};
/** Unknown on the server, which is what renders the neutral empty frame. */
const serverSnapshot = (): boolean | null => null;

function useWebGL() {
  return useSyncExternalStore(noSubscribe, probeWebGL, serverSnapshot);
}

export default function AltLandingPage() {
  const [station, setStation] = useState<StationId | null>(null);
  const webgl = useWebGL();
  const selected = useMemo(
    () => STATIONS.find((s) => s.id === station) ?? null,
    [station]
  );

  // Escape returns to the wide shot — the same gesture as stepping back.
  useEffect(() => {
    if (!station) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setStation(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [station]);

  const toggle = useCallback(
    (id: StationId) => setStation((cur) => (cur === id ? null : id)),
    []
  );

  return (
    <div className="alt">
      <a className="alt-skip" href="#stations">Skip to the departments</a>

      <header className="alt-bar">
        <Link href="/" className="alt-home">
          <Image
            src="/storyvord/logo.svg"
            alt="Storyvord"
            width={120}
            height={40}
            priority
            style={{ height: 28, width: "auto" }}
          />
        </Link>
        <span className="alt-tag mono">
          Soundstage build · v2 ·{" "}
          <Link href="/" className="alt-inline-link">see v1</Link>
        </span>
      </header>

      <main>
        <section className="alt-stage" aria-labelledby="alt-title">
          <div className="alt-canvas">
            {webgl === true && <Soundstage station={station} />}
            {webgl === false && (
              // Not an error state. The page's content is the station list
              // below; this just explains the empty frame.
              <p className="alt-nogl mono">
                3D preview unavailable on this device — the departments below
                work exactly the same.
              </p>
            )}
          </div>

          <div className="alt-stage-copy">
            <p className="alt-eyebrow mono">Interior · Soundstage · Day</p>
            <h1 id="alt-title" className="alt-title">
              One set.<br />
              <em>Every department.</em>
            </h1>
            <p className="alt-lede">
              Walk the floor. Every piece of kit on this stage is a department,
              and every department is already a place inside Storyvord.
            </p>
            <div className="alt-actions">
              <Link href="/register" className="alt-cta">Start for free</Link>
              <a href="#stations" className="alt-cta alt-cta-ghost">Walk the floor</a>
            </div>
          </div>

          <p className="alt-hint mono" aria-hidden>
            {selected ? "Esc to pull back" : "Pick a department to push in"}
          </p>
        </section>

        {/*
          The real interface. Buttons, not clickable meshes: geometry has no
          accessible name, takes no focus and answers no keyboard. Selecting
          here drives the camera in the canvas, so pointer, keyboard and screen
          reader all reach the same state.
        */}
        <section id="stations" className="alt-stations" aria-labelledby="stations-title">
          <div className="alt-stations-head">
            <h2 id="stations-title" className="alt-h2">The unit list.</h2>
            <p className="alt-stations-sub mono">
              Five departments · one workspace
            </p>
          </div>

          <ul className="alt-grid">
            {STATIONS.map((s) => {
              const on = station === s.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className={`alt-station ${on ? "is-on" : ""}`}
                    aria-pressed={on}
                    onClick={() => toggle(s.id)}
                  >
                    <span className="alt-station-role">{s.role}</span>
                    <span className="alt-station-kit mono">{s.kit}</span>
                    <span className="alt-station-job">{s.job}</span>
                    <span className="alt-station-module mono">
                      <span className="alt-dot" aria-hidden />
                      {s.module}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Announced when the selection changes, so a screen-reader user is
              told what the camera just did rather than being left out of it. */}
          <p className="alt-live mono" aria-live="polite">
            {selected
              ? `Camera on ${selected.role.toLowerCase()} — ${selected.kit}.`
              : "Wide shot. No department selected."}
          </p>
        </section>

        <section className="alt-close">
          <h2 className="alt-h2 alt-close-title">
            Your unit, <em>one workspace.</em>
          </h2>
          <Link href="/register" className="alt-cta">Start for free</Link>
        </section>
      </main>

      <footer className="alt-foot mono">
        <span>© Storyvord MMXXVI</span>
        <span>Alt landing · 3D soundstage build</span>
      </footer>
    </div>
  );
}
