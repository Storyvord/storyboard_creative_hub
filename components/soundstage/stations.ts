/**
 * The soundstage's five stations.
 *
 * This list is the single source of truth for BOTH the 3D scene and the HTML
 * control list beside it. The canvas is `aria-hidden` — WebGL geometry has no
 * accessible name and no keyboard model — so the buttons rendered from this
 * array are the real interface: they carry the copy, take focus, and drive the
 * scene. A viewer with no WebGL, no pointer, or a screen reader gets the whole
 * page; the 3D is the presentation layer on top of it.
 */

export type StationId = "camera" | "key" | "slate" | "screen" | "village";

export interface Station {
  id: StationId;
  /** Department, as it reads on a call sheet. */
  role: string;
  /** The kit itself. */
  kit: string;
  /** What that person is actually doing at this station. */
  job: string;
  /** The Storyvord surface that does this job. */
  module: string;
  /** Where the orbit camera parks when this station is selected. */
  focus: [number, number, number];
  /** What it looks at — roughly the middle of the prop. */
  target: [number, number, number];
}

export const STATIONS: Station[] = [
  {
    id: "camera",
    role: "Cinematography",
    kit: "A-camera on sticks",
    job: "Frames every shot, sets the lens, keeps continuity across setups.",
    module: "AI Storyboard",
    focus: [2.6, 1.9, 3.4],
    target: [0, 1.15, 0],
  },
  {
    id: "key",
    role: "Lighting",
    kit: "Key fresnel + barn doors",
    job: "Shapes the light, holds the mood consistent from first take to last.",
    module: "Scene Breakdown",
    focus: [-3.6, 2.4, 2.6],
    target: [-2.7, 1.75, -0.6],
  },
  {
    id: "slate",
    role: "1st Assistant Director",
    kit: "Clapperboard",
    job: "Runs the floor, calls the roll, keeps scene and take numbers honest.",
    module: "AI Script Breakdown",
    focus: [2.2, 1.2, 3.6],
    target: [1.35, 0.28, 2.0],
  },
  {
    id: "screen",
    role: "Visual Effects",
    kit: "Chroma screen + tracking markers",
    job: "Plans the plate, marks the track, decides what is built and what is shot.",
    module: "Creative Hub",
    focus: [0.4, 2.4, 2.2],
    target: [0, 1.9, -4],
  },
  {
    id: "village",
    role: "Production",
    kit: "Video village",
    job: "Watches the take, tracks the day against the money and the schedule.",
    module: "Budget & Compliance",
    focus: [-3.2, 1.8, 3.8],
    target: [-2.5, 1.15, 2.3],
  },
];

/** Where the camera sits when nothing is selected — the wide establishing shot. */
export const WIDE_SHOT: { focus: [number, number, number]; target: [number, number, number] } = {
  focus: [5.6, 3.4, 6.8],
  target: [0, 1.1, 0],
};
