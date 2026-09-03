"use client";

/**
 * The falling roll.
 *
 * Scroll drives one number — `progress`, 0 at the feeder and 1 at the take-up
 * reel — which is computed in the DOM from real scroll position and passed in.
 * Nothing here hijacks the scroll: the page scrolls normally, the camera reads
 * where it got to. That keeps keyboard scrolling, find-in-page and the
 * scrollbar all working, which scroll-jacking libraries take away.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import {
  Matrix4,
  Object3D,
  Quaternion,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  DoubleSide,
  type Group,
  type MeshStandardMaterial,
  type Texture,
} from "three";

import {
  buildRibbonGeometry,
  frameAt,
  makeFilmBaseTexture,
  makeFrameLabelTexture,
  STRIP_BOTTOM_Y,
  STRIP_CURVE,
  STRIP_HALF_WIDTH,
  STRIP_TOP_Y,
  type StripFrame,
} from "./filmstrip";
import { FRAME_POSITIONS, REEL_FRAMES } from "./frames";

const BRAND = "#22cb67";
const INK = "#0a0a0a";

/**
 * One loader, shared, with the decoded textures kept by URL.
 *
 * Loading them here rather than through useLoader is deliberate: a texture
 * needs its colour space and anisotropy set before use, and mutating an object
 * a hook handed back is exactly the aliasing bug the compiler's immutability
 * rule exists to catch. Owning the object means the configuration and the
 * disposal both live in one place. It also means the frames appear as each
 * image lands instead of the whole roll suspending on the slowest one.
 */
const textureLoader = new TextureLoader();
const textureCache = new Map<string, Texture>();

function useFrameTexture(url: string): Texture | null {
  const [entry, setEntry] = useState(() => ({ url, tex: textureCache.get(url) ?? null }));

  // React's sanctioned adjust-state-during-render for a changed prop. A cache
  // hit needs no effect round-trip, and doing it here rather than in an effect
  // avoids a render pass that would show an untextured frame for one tick.
  if (entry.url !== url) {
    setEntry({ url, tex: textureCache.get(url) ?? null });
  }

  useEffect(() => {
    if (textureCache.has(url)) return;
    let cancelled = false;
    textureLoader.load(url, (loaded) => {
      loaded.colorSpace = SRGBColorSpace;
      loaded.anisotropy = 4;
      textureCache.set(url, loaded);
      // Deliberately not disposed on unmount: the cache outlives the component
      // so scrolling back up the roll does not refetch it.
      if (!cancelled) setEntry({ url, tex: loaded });
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return entry.tex;
}

/* ── One frame on the strip ─────────────────────────────────────── */

/**
 * A frame lies flush with the ribbon — dark, following its twist, edge-on
 * whenever the strip happens to be edge-on. As it becomes the active frame it
 * lifts off the base and rotates to face the camera.
 *
 * That is the whole trick of this page. A twisting ribbon shows you its edge,
 * and an edge shows no product; so rather than fight the twist, the reveal is
 * the frame leaving it.
 */
function Frame({
  at,
  image,
  slate,
  title,
  active,
}: {
  at: number;
  image: string;
  slate: string;
  title: string;
  active: boolean;
}) {
  const group = useRef<Group>(null);
  const mat = useRef<MeshStandardMaterial>(null);
  const open = useRef(0);

  const texture = useFrameTexture(image);

  // The resting basis never changes — compute it once.
  const rest = useMemo(() => {
    const f: StripFrame = frameAt(at);
    const quat = new Quaternion().setFromRotationMatrix(
      // Plane geometry faces +Z: width across the strip, height along it, face
      // out of the ribbon.
      new Matrix4().makeBasis(f.side, f.tangent, f.normal)
    );
    return { point: f.point.clone(), normal: f.normal.clone(), quat };
  }, [at]);

  const scratch = useMemo(
    () => ({ dummy: new Object3D(), quat: new Quaternion(), dir: new Vector3() }),
    []
  );

  // The marking printed on the roll beside the image. Built once per frame.
  const label = useMemo(() => makeFrameLabelTexture(slate, title), [slate, title]);
  useEffect(() => () => label.dispose(), [label]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;

    open.current += ((active ? 1 : 0) - open.current) * Math.min(1, delta * 3.4);
    const o = open.current;

    // Face the camera when open, lie on the strip when closed.
    scratch.dummy.position.copy(rest.point);
    scratch.dummy.lookAt(state.camera.position);
    scratch.quat.copy(scratch.dummy.quaternion);
    g.quaternion.slerpQuaternions(rest.quat, scratch.quat, o);

    // Lift toward the viewer, along the ribbon's own normal at rest and toward
    // the camera once open — so it peels off rather than sliding sideways.
    scratch.dir.copy(state.camera.position).sub(rest.point).normalize();
    g.position
      .copy(rest.point)
      .addScaledVector(rest.normal, 0.02 + o * 0.12)
      .addScaledVector(scratch.dir, o * 0.62);

    const scale = 0.94 + o * 0.16;
    g.scale.setScalar(scale);

    if (mat.current) {
      // Closed frames are unexposed stock. Opening develops them, which is the
      // same grayscale→colour move the v1 landing uses for its stills.
      mat.current.emissiveIntensity = 0.06 + o * 0.72;
      mat.current.color.setScalar(0.32 + o * 0.68);
    }
  });

  return (
    <group ref={group}>
      <mesh>
        <planeGeometry args={[STRIP_HALF_WIDTH * 1.62, STRIP_HALF_WIDTH * 1.01]} />
        <meshStandardMaterial
          ref={mat}
          map={texture ?? undefined}
          emissiveMap={texture ?? undefined}
          emissive="#ffffff"
          emissiveIntensity={0.06}
          roughness={0.72}
          toneMapped={false}
        />
      </mesh>
      {/* Frame line, so an open frame still reads as cut from the strip. */}
      <mesh position={[0, -STRIP_HALF_WIDTH * 0.12, -0.006]}>
        <planeGeometry args={[STRIP_HALF_WIDTH * 1.74, STRIP_HALF_WIDTH * 1.4]} />
        <meshBasicMaterial color={INK} />
      </mesh>
      {/* The frame's own marking, printed on the strip below the image — the
          detail that was missing, so the roll carried no information of its
          own and everything had to be read off the cards beside it. */}
      <mesh position={[0, -STRIP_HALF_WIDTH * 0.62, 0.004]}>
        <planeGeometry args={[STRIP_HALF_WIDTH * 1.62, STRIP_HALF_WIDTH * 0.2]} />
        <meshBasicMaterial map={label} toneMapped={false} />
      </mesh>
      {/* Scene tab on the edge, lit only while this frame is the one. */}
      <mesh position={[STRIP_HALF_WIDTH * 0.78, STRIP_HALF_WIDTH * 0.62, 0.004]}>
        <planeGeometry args={[0.2, 0.05]} />
        <meshBasicMaterial color={BRAND} transparent opacity={active ? 0.95 : 0.18} />
      </mesh>
    </group>
  );
}

/* ── The ribbon ─────────────────────────────────────────────────── */

function Ribbon() {
  const geometry = useMemo(() => buildRibbonGeometry(), []);
  const texture = useMemo(() => makeFilmBaseTexture(), []);
  useEffect(() => () => {
    geometry.dispose();
    texture.dispose();
  }, [geometry, texture]);

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        map={texture}
        // alphaTest WITHOUT transparent. Setting both moves the ribbon into the
        // transparent pass, where it is depth-sorted per object and does not
        // write depth — so a strip that folds back over itself renders its far
        // side over its near side and appears to break apart. As a pure cutout
        // it stays in the opaque pass and sorts per fragment, correctly.
        alphaTest={0.5}
        side={DoubleSide}
        roughness={0.85}
        metalness={0.05}
      />
    </mesh>
  );
}

/* ── The reels at either end ────────────────────────────────────── */

function Spool({ position, radius = 1.5 }: { position: [number, number, number]; radius?: number }) {
  return (
    <group position={position} rotation={[0, 0, Math.PI / 2]}>
      {/* Flanges */}
      {[-0.2, 0.2].map((z) => (
        <mesh key={z} position={[0, z, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius, 0.05, 8, 40]} />
          <meshStandardMaterial color="#3a3d42" metalness={0.7} roughness={0.35} />
        </mesh>
      ))}
      {/* Hub */}
      <mesh>
        <cylinderGeometry args={[0.34, 0.34, 0.44, 20]} />
        <meshStandardMaterial color="#26282c" metalness={0.6} roughness={0.5} />
      </mesh>
      {/* Spokes */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} rotation={[0, (i / 5) * Math.PI * 2, 0]}>
          <boxGeometry args={[radius * 1.55, 0.34, 0.07]} />
          <meshStandardMaterial color="#2f3237" metalness={0.6} roughness={0.5} />
        </mesh>
      ))}
      {/* Wound stock, as concentric rings */}
      {[0.52, 0.68, 0.84, 1.0].map((r) => (
        <mesh key={r} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.055, 6, 36]} />
          <meshStandardMaterial color="#141416" roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

/** The wrap: the roll comes to rest wound into an open can. */
function FilmCan() {
  return (
    <group position={[0, 0, 0.35]}>
      <Spool position={[0, STRIP_BOTTOM_Y - 0.1, 0]} radius={1.42} />
      {/* Can base */}
      <mesh position={[0, -0.24, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[1.95, 1.95, 0.3, 40, 1, true]} />
        <meshStandardMaterial color="#2a2d31" metalness={0.65} roughness={0.4} side={2} />
      </mesh>
      <mesh position={[0, -0.39, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[1.95, 40]} />
        <meshStandardMaterial color="#1b1d20" metalness={0.5} roughness={0.6} />
      </mesh>
      {/* Lid, propped against the can — the surface the label is struck on. */}
      <group position={[2.85, 0.55, -0.4]} rotation={[0, -0.5, 0.22]}>
        <mesh rotation={[0, 0, 0]}>
          <cylinderGeometry args={[1.62, 1.62, 0.12, 40]} />
          <meshStandardMaterial color="#2a2d31" metalness={0.65} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.07, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <circleGeometry args={[1.16, 40]} />
          <meshStandardMaterial
            color={INK}
            emissive={BRAND}
            emissiveIntensity={0.16}
            roughness={0.8}
          />
        </mesh>
      </group>
    </group>
  );
}

/* ── Camera ─────────────────────────────────────────────────────── */

/**
 * Rides down beside the strip. It tracks the ribbon's X with a lag, the way an
 * operator swings to keep a falling object in frame rather than snapping to it,
 * and holds a fixed standoff in Z so the strip's own depth wander is what
 * creates the sense of it passing you.
 */
function Rider({ progress }: { progress: React.RefObject<number> }) {
  const target = useMemo(() => new Vector3(), []);
  const goal = useMemo(() => new Vector3(), []);
  const look = useMemo(() => new Vector3(), []);

  useFrame((state, delta) => {
    const t = Math.min(1, Math.max(0, progress.current ?? 0));
    const point = STRIP_CURVE.getPointAt(t, target);

    goal.set(point.x * 0.42, point.y + 0.28, point.z + 5.35);
    look.lerp(point, Math.min(1, delta * 3.2));

    state.camera.position.lerp(goal, Math.min(1, delta * 2.6));
    state.camera.lookAt(look);
  });
  return null;
}

/* ── Scene ──────────────────────────────────────────────────────── */

function Scene({ active, progress }: { active: number; progress: React.RefObject<number> }) {
  return (
    <>
      <ambientLight intensity={0.55} />
      {/* Warm key from camera left, the projector side. */}
      <directionalLight position={[-4, 6, 6]} intensity={1.5} color="#ffe9c4" />
      <directionalLight position={[5, 2, 4]} intensity={0.55} color="#8fb6d8" />
      {/* Travels with the strip so whichever frame is open is the lit one. */}
      <pointLight position={[0, 0, 3]} intensity={22} color={BRAND} distance={9} />

      <fog attach="fog" args={[INK, 11, 30]} />

      <Spool position={[2.45, STRIP_TOP_Y + 0.45, -0.6]} />
      <Ribbon />
      {REEL_FRAMES.map((f, i) => (
        <Frame
          key={f.id}
          at={FRAME_POSITIONS[i]}
          image={f.image}
          slate={f.slate}
          title={f.title}
          active={active === i}
        />
      ))}
      <FilmCan />
      <Rider progress={progress} />
    </>
  );
}

/* ── Canvas ─────────────────────────────────────────────────────── */

export default function Reel({
  active,
  progress,
}: {
  active: number;
  progress: React.RefObject<number>;
}) {
  return (
    <Canvas
      aria-hidden
      tabIndex={-1}
      dpr={[1, 1.75]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      camera={{ position: [1.0, STRIP_TOP_Y, 5.4], fov: 42, near: 0.1, far: 40 }}
      style={{ position: "absolute", inset: 0 }}
    >
      <color attach="background" args={[INK]} />
      <Scene active={active} progress={progress} />
    </Canvas>
  );
}
