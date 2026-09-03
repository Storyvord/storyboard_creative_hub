"use client";

/**
 * The soundstage canvas.
 *
 * Mounted through next/dynamic with ssr:false — three.js touches `window` and
 * `document` at import time, and a WebGL context cannot be produced on the
 * server anyway, so there is nothing to gain from server-rendering it and a
 * hydration mismatch to lose.
 *
 * The canvas is aria-hidden and not focusable. The station buttons in the page
 * beside it are the accessible interface; this reflects their state. That split
 * is deliberate: it means the page is fully usable with the canvas absent, and
 * the canvas can be dropped on a device that cannot run it.
 */

import { Suspense, useEffect, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Grid } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { Vector3 } from "three";

import {
  CameraRig,
  ChromaScreen,
  DollyTrack,
  Flightcases,
  KeyLight,
  Slate,
  VideoVillage,
} from "./props";
import { STATIONS, WIDE_SHOT, type StationId } from "./stations";

/* ── Camera move ────────────────────────────────────────────────── */

/**
 * Pushes in on the selected station and pulls back out to the wide when
 * nothing is selected. A damped lerp rather than OrbitControls: the point is a
 * directed move between known marks, and letting the viewer spin freely while
 * a station is selected would fight the framing the selection just set up.
 */
function CameraMove({ station, idle }: { station: StationId | null; idle: boolean }) {
  const { camera } = useThree();
  const goal = useRef(new Vector3(...WIDE_SHOT.focus));
  const look = useRef(new Vector3(...WIDE_SHOT.target));
  const current = useRef(new Vector3(...WIDE_SHOT.target));
  const t = useRef(0);

  useEffect(() => {
    const mark = station ? STATIONS.find((s) => s.id === station) : null;
    goal.current.set(...(mark ? mark.focus : WIDE_SHOT.focus));
    look.current.set(...(mark ? mark.target : WIDE_SHOT.target));
  }, [station]);

  useFrame((_, delta) => {
    const damp = Math.min(1, delta * 2.2);

    if (!station && idle) {
      // A slow drift around the wide, so the establishing shot is never dead
      // still. Stops the moment a station is chosen.
      t.current += delta * 0.12;
      const r = Math.hypot(WIDE_SHOT.focus[0], WIDE_SHOT.focus[2]);
      goal.current.set(
        Math.sin(t.current) * r,
        WIDE_SHOT.focus[1] + Math.sin(t.current * 0.7) * 0.35,
        Math.cos(t.current) * r
      );
    }

    camera.position.lerp(goal.current, damp);
    current.current.lerp(look.current, damp);
    camera.lookAt(current.current);
  });

  return null;
}

/* ── Lighting ───────────────────────────────────────────────────── */

function Rig() {
  return (
    <>
      {/* Deliberately dim: a soundstage is a dark room with instruments in it,
          and the fixtures below are supposed to be the thing you notice. */}
      <ambientLight intensity={0.28} />
      {/* Key, matching the fresnel's position so the beam and the shadows agree. */}
      <directionalLight
        position={[-2.7, 3.4, 0.4]}
        intensity={2.4}
        color="#ffe9c4"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
      />
      {/* Cool fill from camera left, so the shadow side is not pure black. */}
      <directionalLight position={[4.5, 2.6, 3.2]} intensity={0.5} color="#8fb6d8" />
      {/* Bounce off the chroma screen — green spill is what actually happens. */}
      <pointLight position={[0, 1.8, -3.2]} intensity={2.2} color="#22cb67" distance={7} />
    </>
  );
}

/* ── Scene ──────────────────────────────────────────────────────── */

function Scene({ station }: { station: StationId | null }) {
  const is = (id: StationId) => station === id;
  return (
    <>
      <Rig />
      <fog attach="fog" args={["#0a0a0a", 9, 26]} />

      <CameraRig active={is("camera")} />
      <KeyLight active={is("key")} />
      {/* Second fixture, camera right. Never a station — it is there so the
          lighting reads as a setup rather than a single lamp. */}
      <KeyLight active={false} position={[3.3, 0, -1.2]} />
      <Slate active={is("slate")} />
      <ChromaScreen active={is("screen")} />
      <VideoVillage active={is("village")} />
      <DollyTrack />
      <Flightcases />

      {/* Stage floor */}
      <Grid
        position={[0, 0, 0]}
        args={[40, 40]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#1a1c1f"
        sectionSize={2.5}
        sectionThickness={0.9}
        sectionColor="#25282c"
        fadeDistance={26}
        fadeStrength={1.4}
        infiniteGrid
      />
      <ContactShadows
        position={[0, 0.008, 0]}
        opacity={0.72}
        scale={22}
        blur={2.4}
        far={5}
        resolution={512}
        color="#000000"
      />
    </>
  );
}

/* ── Canvas ─────────────────────────────────────────────────────── */

export default function Soundstage({ station }: { station: StationId | null }) {
  // The idle drift is motion nobody asked for, so it goes under the same switch
  // as the rest of the site. framer-motion is already a dependency here and its
  // hook subscribes to the media query properly, so there is no reason to
  // hand-roll one.
  const reduceMotion = useReducedMotion();
  const idle = !reduceMotion;

  return (
    <Canvas
      aria-hidden
      tabIndex={-1}
      // "percentage" is PCFShadowMap. R3F's bare `shadows` asks for
      // PCFSoftShadowMap, which three 0.184 has deprecated — it falls back to
      // exactly this and warns to the console on every render while doing so.
      shadows="percentage"
      // Clamped: an uncapped DPR on a 3x phone renders nine times the pixels
      // for a background element.
      dpr={[1, 1.8]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: WIDE_SHOT.focus, fov: 38, near: 0.1, far: 60 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={["#0a0a0a"]} />
      <Suspense fallback={null}>
        <Scene station={station} />
      </Suspense>
      <CameraMove station={station} idle={idle} />
    </Canvas>
  );
}
