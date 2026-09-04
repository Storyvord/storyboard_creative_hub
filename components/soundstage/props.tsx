"use client";

/**
 * The set, built entirely from primitives.
 *
 * No GLTF, no Draco, no texture fetches, no drei <Environment> preset — every
 * one of those pulls a file over the network at first paint, and a hero that
 * waits on a CDN is a hero that renders empty. Boxes, cylinders and cones cost
 * nothing to ship and read perfectly well at the scale this scene is viewed.
 *
 * Each prop takes `active` and lifts + takes a brand-green rim when its station
 * is selected. The lift is done here rather than in CSS because it has to
 * happen in the same coordinate space as the geometry.
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { AdditiveBlending, DoubleSide } from "three";
import type { Group } from "three";

export const INK = "#0a0a0a";
export const PAPER = "#f5f5f5";
export const BRAND = "#22cb67";
export const CHROMA = "#00b140"; // real chroma-key green, not the brand green
const METAL = "#3a3d42";
const DARK_METAL = "#242629";

/** Lifts a prop when selected. Shared by every station so the tell is consistent. */
function useLift(active: boolean, amount = 0.09) {
  const ref = useRef<Group>(null);
  useFrame((_, delta) => {
    if (!ref.current) return;
    const to = active ? amount : 0;
    // Frame-rate independent damp; 8 is a fast but not instant settle.
    ref.current.position.y += (to - ref.current.position.y) * Math.min(1, delta * 8);
  });
  return ref;
}

/** The accent that says "this one". Emissive so it reads against the dark set. */
function Rim({ active }: { active: boolean }) {
  return (
    <meshStandardMaterial
      color={active ? BRAND : METAL}
      emissive={BRAND}
      emissiveIntensity={active ? 0.55 : 0}
      roughness={0.45}
      metalness={0.6}
    />
  );
}

/* ── A-camera on sticks ─────────────────────────────────────────── */

export function CameraRig({ active }: { active: boolean }) {
  const lift = useLift(active);
  return (
    <group ref={lift} position={[0, 0, 0]}>
      {/* Tripod: three legs splayed on the Y axis at 120° each. */}
      {[0, 1, 2].map((i) => {
        const a = (i / 3) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <mesh position={[0, 0.42, 0.28]} rotation={[0.42, 0, 0]} castShadow>
              <cylinderGeometry args={[0.028, 0.022, 0.95, 8]} />
              <meshStandardMaterial color={DARK_METAL} roughness={0.6} metalness={0.5} />
            </mesh>
            {/* Spreader arm — the detail that makes sticks read as sticks. */}
            <mesh position={[0, 0.03, 0.22]} castShadow>
              <boxGeometry args={[0.03, 0.02, 0.42]} />
              <meshStandardMaterial color={DARK_METAL} roughness={0.7} />
            </mesh>
          </group>
        );
      })}

      {/* Bowl + fluid head */}
      <mesh position={[0, 0.9, 0]} castShadow>
        <cylinderGeometry args={[0.11, 0.14, 0.1, 12]} />
        <meshStandardMaterial color={METAL} roughness={0.4} metalness={0.7} />
      </mesh>
      <mesh position={[0, 1.0, 0]} castShadow>
        <boxGeometry args={[0.22, 0.1, 0.28]} />
        <meshStandardMaterial color={DARK_METAL} roughness={0.5} metalness={0.6} />
      </mesh>
      {/* Pan bar */}
      <mesh position={[0.02, 0.95, 0.3]} rotation={[0.5, 0, 0]} castShadow>
        <cylinderGeometry args={[0.012, 0.012, 0.42, 8]} />
        <meshStandardMaterial color={INK} roughness={0.8} />
      </mesh>

      {/* Body */}
      <mesh position={[0, 1.19, 0]} castShadow>
        <boxGeometry args={[0.34, 0.28, 0.52]} />
        <Rim active={active} />
      </mesh>
      {/* Film magazine — the silhouette that says "cinema camera" and not "DSLR". */}
      <mesh position={[0, 1.42, 0.06]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.16, 0.16, 0.17, 20]} />
        <meshStandardMaterial color={DARK_METAL} roughness={0.45} metalness={0.6} />
      </mesh>
      {/* Lens barrel */}
      <mesh position={[0, 1.19, -0.42]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[0.115, 0.13, 0.34, 20]} />
        <meshStandardMaterial color={DARK_METAL} roughness={0.35} metalness={0.75} />
      </mesh>
      {/* Front element — catches the key and gives the rig a highlight. */}
      <mesh position={[0, 1.19, -0.6]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.02, 20]} />
        <meshStandardMaterial color="#0b1a12" roughness={0.08} metalness={0.9} />
      </mesh>
      {/* Matte box */}
      <mesh position={[0, 1.19, -0.74]} castShadow>
        <boxGeometry args={[0.34, 0.3, 0.16]} />
        <meshStandardMaterial color={INK} roughness={0.85} />
      </mesh>
      {/* French flag on top of the matte box */}
      <mesh position={[0, 1.38, -0.78]} rotation={[-0.35, 0, 0]} castShadow>
        <boxGeometry args={[0.36, 0.01, 0.16]} />
        <meshStandardMaterial color={INK} roughness={0.9} />
      </mesh>
      {/* Follow focus */}
      <mesh position={[-0.19, 1.13, -0.42]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <torusGeometry args={[0.055, 0.018, 8, 20]} />
        <meshStandardMaterial color={BRAND} roughness={0.5} />
      </mesh>
      {/* Operator-side monitor */}
      <mesh position={[0.26, 1.34, 0.1]} rotation={[0, -0.35, 0]} castShadow>
        <boxGeometry args={[0.02, 0.14, 0.2]} />
        <meshStandardMaterial color={INK} emissive={BRAND} emissiveIntensity={0.22} />
      </mesh>
    </group>
  );
}

/* ── Key light: fresnel, barn doors, and the beam ───────────────── */

interface KeyLightProps {
  active: boolean;
  position?: [number, number, number];
}

export function KeyLight({ active, position = [-2.7, 0, -0.6] }: KeyLightProps) {
  const lift = useLift(active, 0.06);
  return (
    <group position={position}>
      <group ref={lift}>
        {/* Stand */}
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            rotation={[0.34, (i / 3) * Math.PI * 2, 0]}
            position={[0, 0.3, 0]}
            castShadow
          >
            <cylinderGeometry args={[0.018, 0.014, 0.72, 6]} />
            <meshStandardMaterial color={DARK_METAL} roughness={0.7} />
          </mesh>
        ))}
        <mesh position={[0, 1.0, 0]} castShadow>
          <cylinderGeometry args={[0.032, 0.038, 1.4, 10]} />
          <meshStandardMaterial color={METAL} roughness={0.5} metalness={0.6} />
        </mesh>

        {/* Housing, tilted down at the mark */}
        <group position={[0, 1.75, 0]} rotation={[0, 0, -0.34]}>
          <mesh castShadow>
            <cylinderGeometry args={[0.24, 0.24, 0.34, 16]} />
            <Rim active={active} />
          </mesh>
          {/* Lens face — emissive so the fixture reads as switched on. */}
          <mesh position={[0.19, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.21, 0.21, 0.02, 16]} />
            <meshStandardMaterial
              color="#fff6e2"
              emissive="#ffd9a0"
              emissiveIntensity={active ? 3.2 : 1.9}
              toneMapped={false}
            />
          </mesh>
          {/* Barn doors */}
          {[
            [0, 0.28, 0, 0, 0, -0.6],
            [0, -0.28, 0, 0, 0, 0.6],
            [0, 0, 0.28, -0.6, 0, 0],
            [0, 0, -0.28, 0.6, 0, 0],
          ].map((d, i) => (
            <mesh
              key={i}
              position={[0.22 + d[0], d[1], d[2]]}
              rotation={[d[3], d[4], d[5]]}
              castShadow
            >
              <boxGeometry args={[0.02, 0.34, 0.34]} />
              <meshStandardMaterial color={INK} roughness={0.9} side={DoubleSide} />
            </mesh>
          ))}
        </group>
      </group>

      {/* The beam. An open-ended cone with additive blending — the cheapest
          honest fake for atmosphere, and it costs one draw call. */}
      <mesh position={[1.5, 1.15, 0.35]} rotation={[0, 0, Math.PI / 2 + 0.34]}>
        <coneGeometry args={[1.05, 3.3, 24, 1, true]} />
        <meshBasicMaterial
          color="#ffe9c4"
          transparent
          opacity={active ? 0.14 : 0.07}
          depthWrite={false}
          blending={AdditiveBlending}
          side={DoubleSide}
        />
      </mesh>
    </group>
  );
}

/* ── Clapperboard ───────────────────────────────────────────────── */

export function Slate({ active }: { active: boolean }) {
  const lift = useLift(active, 0.12);
  return (
    <group position={[1.35, 0.02, 2.0]} rotation={[0, -0.5, 0]}>
      <group ref={lift}>
        {/* Board, laid back on the floor the way it actually sits between takes */}
        <group rotation={[-Math.PI / 2 + 0.22, 0, 0]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[0.62, 0.5, 0.022]} />
            <meshStandardMaterial color={INK} roughness={0.7} />
          </mesh>
          {/* Info rows scratched in white */}
          {[0.12, 0.0, -0.12].map((y, i) => (
            <mesh key={i} position={[0, y, 0.013]}>
              <boxGeometry args={[0.52 - i * 0.08, 0.012, 0.002]} />
              <meshStandardMaterial color={PAPER} roughness={0.9} />
            </mesh>
          ))}
          {/* Scene/take block in brand green */}
          <mesh position={[0.19, -0.19, 0.013]}>
            <boxGeometry args={[0.14, 0.07, 0.002]} />
            <meshStandardMaterial
              color={BRAND}
              emissive={BRAND}
              emissiveIntensity={active ? 0.6 : 0.12}
            />
          </mesh>

          {/* Clapper stick, hinged open */}
          <group position={[0, 0.25, 0.02]} rotation={[0, 0, active ? -0.34 : -0.16]}>
            <mesh position={[0, 0.035, 0]} castShadow>
              <boxGeometry args={[0.62, 0.07, 0.022]} />
              <meshStandardMaterial color={INK} roughness={0.7} />
            </mesh>
            {/* Diagonal stripes — the one detail that makes a slate a slate. */}
            {Array.from({ length: 7 }).map((_, i) => (
              <mesh key={i} position={[-0.26 + i * 0.088, 0.035, 0.013]} rotation={[0, 0, 0.42]}>
                <boxGeometry args={[0.042, 0.075, 0.002]} />
                <meshStandardMaterial color={i % 2 ? PAPER : INK} roughness={0.9} />
              </mesh>
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}

/* ── Chroma screen with tracking markers ────────────────────────── */

export function ChromaScreen({ active }: { active: boolean }) {
  return (
    <group position={[0, 0, -4]}>
      {/* The cloth. Emissive a touch so it glows the way a lit screen does. */}
      <mesh position={[0, 1.9, 0]} receiveShadow>
        <planeGeometry args={[7.4, 3.8]} />
        <meshStandardMaterial
          color={CHROMA}
          emissive={CHROMA}
          emissiveIntensity={active ? 0.42 : 0.22}
          roughness={0.95}
        />
      </mesh>
      {/* Tracking markers, on a grid the way a plate is actually marked up. */}
      {[-2.4, -0.8, 0.8, 2.4].map((x) =>
        [0.9, 2.0, 3.1].map((y) => (
          <group key={`${x}-${y}`} position={[x, y, 0.01]}>
            <mesh>
              <boxGeometry args={[0.2, 0.028, 0.001]} />
              <meshStandardMaterial color={INK} />
            </mesh>
            <mesh>
              <boxGeometry args={[0.028, 0.2, 0.001]} />
              <meshStandardMaterial color={INK} />
            </mesh>
          </group>
        ))
      )}
      {/* Frame + floor blend, so the cloth does not float. */}
      <mesh position={[0, 1.9, -0.06]}>
        <boxGeometry args={[7.7, 4.1, 0.08]} />
        <meshStandardMaterial color={DARK_METAL} roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.001, 0.85]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[7.4, 1.7]} />
        <meshStandardMaterial color={CHROMA} roughness={0.95} />
      </mesh>
    </group>
  );
}

/* ── Video village ──────────────────────────────────────────────── */

export function VideoVillage({ active }: { active: boolean }) {
  const lift = useLift(active, 0.07);
  return (
    <group position={[-2.5, 0, 2.3]} rotation={[0, 0.62, 0]}>
      <group ref={lift}>
        {/* Cart */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.0, 0.06, 0.6]} />
          <meshStandardMaterial color={DARK_METAL} roughness={0.7} />
        </mesh>
        {[[-0.42, 0.28], [0.42, 0.28], [-0.42, -0.24], [0.42, -0.24]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.2, z]} castShadow>
            <cylinderGeometry args={[0.022, 0.022, 0.42, 6]} />
            <meshStandardMaterial color={DARK_METAL} roughness={0.7} />
          </mesh>
        ))}
        {/* Two monitors, angled in the way they always are */}
        {[-0.26, 0.26].map((x, i) => (
          <group key={i} position={[x, 0.74, 0]} rotation={[0, i ? -0.22 : 0.22, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.46, 0.3, 0.03]} />
              <meshStandardMaterial color={INK} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0, 0.017]}>
              <planeGeometry args={[0.42, 0.26]} />
              <meshStandardMaterial
                color={i ? "#12281c" : "#0e1f2a"}
                emissive={i ? BRAND : "#3d9be9"}
                emissiveIntensity={active ? 0.85 : 0.45}
                toneMapped={false}
              />
            </mesh>
            <mesh position={[0, -0.19, 0]}>
              <boxGeometry args={[0.1, 0.08, 0.06]} />
              <meshStandardMaterial color={DARK_METAL} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/* ── Dolly track, for depth in the foreground ───────────────────── */

export function DollyTrack() {
  return (
    <group position={[0, 0.04, 1.5]} rotation={[0, 0.08, 0]}>
      {[-0.32, 0.32].map((x) => (
        <mesh key={x} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
          <cylinderGeometry args={[0.038, 0.038, 6.4, 10]} />
          <meshStandardMaterial color={METAL} roughness={0.35} metalness={0.8} />
        </mesh>
      ))}
      {Array.from({ length: 7 }).map((_, i) => (
        <mesh key={i} position={[-2.7 + i * 0.9, -0.02, 0]} castShadow>
          <boxGeometry args={[0.1, 0.04, 0.78]} />
          <meshStandardMaterial color={DARK_METAL} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Flightcases, to fill the negative space ────────────────────── */

interface Case {
  pos: [number, number, number];
  size: [number, number, number];
  turn: number;
}

const CASES: Case[] = [
  { pos: [3.5, 0.22, 1.4], size: [0.9, 0.44, 0.6], turn: 0.0 },
  { pos: [3.6, 0.66, 1.35], size: [0.7, 0.44, 0.5], turn: 0.3 },
  { pos: [-3.9, 0.26, -0.4], size: [0.8, 0.52, 0.66], turn: 0.6 },
];

export function Flightcases() {
  return (
    <group>
      {CASES.map((c, i) => (
        <mesh key={i} position={c.pos} rotation={[0, c.turn, 0]} castShadow receiveShadow>
          <boxGeometry args={c.size} />
          <meshStandardMaterial color="#1b1d20" roughness={0.85} />
        </mesh>
      ))}
    </group>
  );
}
