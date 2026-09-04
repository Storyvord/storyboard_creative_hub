/**
 * The falling film strip: path, twist, ribbon geometry, and the perforated
 * film-base texture.
 *
 * All of it is procedural. The one thing that could not be faked — the product
 * screenshots — are downscaled JPEGs in /screenshots/reel; everything else here
 * is arithmetic, so there is nothing to download before the strip can draw.
 */

import {
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  LinearFilter,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from "three";

/** Half the strip's width, in world units. The frames are cut to match. */
export const STRIP_HALF_WIDTH = 1.15;
/** Where the strip leaves the feeder and where it meets the take-up reel. */
export const STRIP_TOP_Y = 15.4;
export const STRIP_BOTTOM_Y = 0.75;

/**
 * The fall.
 *
 * Not a straight drop and not a tidy helix — a strip let go of at the top
 * wanders. The X values swing across the frame so the ribbon crosses the camera
 * repeatedly, and Z pushes it in and out of depth so it passes in front of and
 * behind the eye line rather than staying on one plane.
 */
export const STRIP_CURVE = new CatmullRomCurve3(
  [
    new Vector3(2.45, STRIP_TOP_Y, -0.6),
    new Vector3(1.15, 13.9, 0.85),
    new Vector3(-1.65, 12.3, -0.75),
    new Vector3(-0.35, 10.7, 1.05),
    new Vector3(1.95, 9.1, -0.35),
    new Vector3(0.15, 7.5, -1.15),
    new Vector3(-1.85, 6.0, 0.55),
    new Vector3(-0.25, 4.6, 1.1),
    new Vector3(1.55, 3.3, -0.2),
    new Vector3(0.35, 2.1, -0.85),
    new Vector3(-0.55, 1.35, -0.15),
    new Vector3(0.0, STRIP_BOTTOM_Y, 0.35),
  ],
  false,
  "catmullrom",
  0.5
);

// getPointAt/getTangentAt walk an arc-length table built at this resolution.
// The default of 200 is coarse for a curve this long — samples bunch through
// the tight turns, which stretches the sprocket pitch and makes the ribbon look
// like it is tearing where it bends hardest.
STRIP_CURVE.arcLengthDivisions = 800;

/**
 * Roll about the strip's own tangent.
 *
 * Two terms on purpose: a fast oscillation that banks the ribbon back and forth
 * so it flashes between face and edge, and a slow accumulating term so the
 * whole fall is unwinding rather than merely wobbling around one attitude.
 */
export function twistAt(t: number): number {
  return Math.sin(t * Math.PI * 3.2) * 0.85 + t * 1.15;
}

export interface StripFrame {
  point: Vector3;
  tangent: Vector3;
  /** Across the strip's width. */
  side: Vector3;
  /** Out of the strip's face. */
  normal: Vector3;
}

const _up = new Vector3(0, 1, 0);
const _alt = new Vector3(0, 0, 1);

/**
 * The basis at `t`, twist included.
 *
 * Deliberately not Frenet frames: the curve's own normal flips through
 * inflection points, which snaps the ribbon inside out mid-fall. Building the
 * basis from a fixed world up and then rolling it by `twistAt` keeps the strip
 * continuous and puts the twist under explicit control.
 */
export function frameAt(t: number, out?: StripFrame): StripFrame {
  const clamped = Math.min(1, Math.max(0, t));
  const point = STRIP_CURVE.getPointAt(clamped, out?.point);
  const tangent = STRIP_CURVE.getTangentAt(clamped, out?.tangent).normalize();

  // Near-vertical tangents make the cross product with world up degenerate.
  const reference = Math.abs(tangent.dot(_up)) > 0.985 ? _alt : _up;

  const side = (out?.side ?? new Vector3()).crossVectors(tangent, reference).normalize();
  const normal = (out?.normal ?? new Vector3()).crossVectors(side, tangent).normalize();

  const angle = twistAt(clamped);
  side.applyAxisAngle(tangent, angle);
  normal.applyAxisAngle(tangent, angle);

  return { point, tangent, side, normal };
}

/**
 * The ribbon itself: two vertices per sample, stitched into a triangle strip.
 *
 * `vRepeat` is how many times the perforation texture tiles along the length —
 * it sets the sprocket pitch, so it wants to stay proportional to the curve's
 * arc length or the holes stretch.
 */
export function buildRibbonGeometry(segments = 420, vRepeat = 46): BufferGeometry {
  const positions = new Float32Array((segments + 1) * 2 * 3);
  const normals = new Float32Array((segments + 1) * 2 * 3);
  const uvs = new Float32Array((segments + 1) * 2 * 2);
  const indices: number[] = [];

  const scratch: StripFrame = {
    point: new Vector3(),
    tangent: new Vector3(),
    side: new Vector3(),
    normal: new Vector3(),
  };

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const { point, side, normal } = frameAt(t, scratch);

    const base = i * 6;
    positions[base + 0] = point.x - side.x * STRIP_HALF_WIDTH;
    positions[base + 1] = point.y - side.y * STRIP_HALF_WIDTH;
    positions[base + 2] = point.z - side.z * STRIP_HALF_WIDTH;
    positions[base + 3] = point.x + side.x * STRIP_HALF_WIDTH;
    positions[base + 4] = point.y + side.y * STRIP_HALF_WIDTH;
    positions[base + 5] = point.z + side.z * STRIP_HALF_WIDTH;

    normals[base + 0] = normal.x;
    normals[base + 1] = normal.y;
    normals[base + 2] = normal.z;
    normals[base + 3] = normal.x;
    normals[base + 4] = normal.y;
    normals[base + 5] = normal.z;

    const uvBase = i * 4;
    uvs[uvBase + 0] = 0;
    uvs[uvBase + 1] = t * vRepeat;
    uvs[uvBase + 2] = 1;
    uvs[uvBase + 3] = t * vRepeat;

    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new BufferAttribute(normals, 3));
  geometry.setAttribute("uv", new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

/**
 * One sprocket pitch of 35mm film base, drawn to a canvas and tiled.
 *
 * The canvas's WIDTH runs across the strip and its HEIGHT along the length, so
 * everything is laid out in lanes: perforations at both edges, a print lane
 * inboard of each, and the frame area down the middle. The lanes matter — the
 * first version drew the key code at x = W-40, which is inside the right
 * perforation lane, so the holes punched the text straight back out again and
 * the roll carried no edge printing at all.
 *
 * The perforations are punched with `destination-out` so they are genuinely
 * transparent: you see the set through them, which is what sells the ribbon as
 * film rather than as a dark stripe.
 */

/** Lane geometry, in canvas px across a 256-wide strip. */
const PERF_W = 30;
const LANE = {
  perfLeft: 10,
  printLeft: 44,
  frame: 66,
  frameEnd: 190,
  printRight: 194,
  perfRight: 216,
} as const;

export function makeFilmBaseTexture(): CanvasTexture {
  const W = 256;
  const H = 128;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // Base stock, slightly warm so it is not the same flat black as the page.
  ctx.fillStyle = "#141416";
  ctx.fillRect(0, 0, W, H);

  // Rails bounding the frame area.
  ctx.fillStyle = "#1d1e21";
  ctx.fillRect(LANE.frame - 4, 0, 3, H);
  ctx.fillRect(LANE.frameEnd + 1, 0, 3, H);

  // Key code down the right print lane, clear of the perforations.
  ctx.save();
  ctx.translate(LANE.printRight + 9, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "rgba(226, 200, 140, 0.62)";
  ctx.font = "600 13px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("STORYVORD 5219", 0, 0);
  ctx.restore();

  // Frame counter down the left print lane — the second edge marking real
  // stock carries, and it reads as movement when the strip is falling.
  ctx.save();
  ctx.translate(LANE.printLeft + 9, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = "rgba(226, 200, 140, 0.34)";
  ctx.font = "600 11px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("· 24A ·", 0, 0);
  ctx.restore();

  // Frame line, so consecutive frames read as separated.
  ctx.fillStyle = "#0a0a0b";
  ctx.fillRect(LANE.frame, H - 5, LANE.frameEnd - LANE.frame, 5);

  // Perforations: punched out, two per pitch per edge.
  ctx.globalCompositeOperation = "destination-out";
  for (const x of [LANE.perfLeft, LANE.perfRight]) {
    for (const y of [16, 82]) {
      ctx.beginPath();
      ctx.roundRect(x, y, PERF_W, 26, 5);
      ctx.fill();
    }
  }
  ctx.globalCompositeOperation = "source-over";

  const texture = new CanvasTexture(canvas);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  // No mipmaps. The material cuts the perforations with alphaTest, and a mip
  // chain averages a punched hole and its solid surround into a half-alpha
  // grey — which alphaTest then discards wholesale, tearing visible gaps in the
  // ribbon wherever it turns away from the camera. Anisotropy covers the
  // glancing angles that mipmaps would otherwise have handled.
  texture.generateMipmaps = false;
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  return texture;
}

/**
 * The per-frame marking printed on the roll itself.
 *
 * Asked for as "details on the roll" as well as outside it. Drawn to a canvas
 * rather than rendered with troika/drei <Text>, which fetches a font from a CDN
 * on first use — the whole strip is otherwise network-free, and a roll that
 * waits on a font to show its markings is a roll that shows none.
 */
export function makeFrameLabelTexture(slate: string, title: string): CanvasTexture {
  const W = 1024;
  const H = 128;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = "#0d0d0f";
  ctx.fillRect(0, 0, W, H);

  ctx.textBaseline = "middle";
  ctx.font = "700 46px ui-monospace, monospace";
  ctx.fillStyle = "#22cb67";
  ctx.fillText(slate.toUpperCase(), 34, H / 2);

  const slateWidth = ctx.measureText(slate.toUpperCase()).width;

  ctx.fillStyle = "rgba(245, 245, 245, 0.32)";
  ctx.fillRect(34 + slateWidth + 26, H / 2 - 16, 2, 32);

  ctx.font = "500 44px ui-monospace, monospace";
  ctx.fillStyle = "rgba(245, 245, 245, 0.86)";
  ctx.fillText(title.toUpperCase(), 34 + slateWidth + 52, H / 2);

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}
