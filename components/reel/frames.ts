/**
 * What is printed on the roll.
 *
 * Same contract as the soundstage's STATIONS: this array is the single source
 * of truth for the 3D frames AND for the scroll steps that carry the copy in
 * the DOM. The steps are what a screen reader reads and what renders when the
 * canvas is absent, so the strip can never show something the page does not say.
 *
 * Positions along the curve are DERIVED from the scroll layout below, never
 * hand-set. Hand-set values drifted against the camera — which reads the same
 * scroll progress — by up to 0.089 of the curve at the last frame, roughly two
 * world units, so the camera arrived at bare ribbon and the frame it was meant
 * to be showing sat off-screen. Deriving both from one set of numbers makes
 * that class of bug impossible.
 */

/**
 * The scroll layout, in svh. TypeScript owns these and the stylesheet reads
 * them back as custom properties, so the geometry and the CSS cannot drift.
 */
export const REEL_LAYOUT = {
  /** Intro block before the first frame. */
  head: 62,
  /** Scroll distance per frame — this is what sets the pace of the fall. */
  step: 100,
  /** The wrap card at the bottom. */
  rest: 100,
  /** Bought back for the sticky canvas; see the padding note in the CSS. */
  tail: 100,
} as const;

/**
 * Where the camera is when frame `index` is the active one.
 *
 * The camera reads progress across the section, so a frame belongs at exactly
 * the progress value its own step is centred on.
 */
export function frameCurvePosition(index: number, count: number): number {
  const { head, step, rest, tail } = REEL_LAYOUT;
  const total = head + count * step + rest + tail;
  const span = total - 100; // progress hits 1 when the section bottom meets the viewport bottom
  return (head + index * step + step / 2) / span;
}

export interface ReelFrame {
  id: string;
  /** Scene number, printed on the frame edge the way a slate numbers a setup. */
  slate: string;
  title: string;
  body: string;
  /** Downscaled to 960px — the full screenshots are 2160px and cost ~11 MB of
   *  VRAM each as textures. */
  image: string;
}

export const REEL_FRAMES: ReelFrame[] = [
  {
    id: "script",
    slate: "SC. 01",
    title: "The script goes in.",
    body: "Drop a screenplay and every scene, character, prop and location is tagged for you — the week of an AD's life that used to happen on index cards.",
    image: "/screenshots/reel/script.jpg",
  },
  {
    id: "hub",
    slate: "SC. 02",
    title: "The art department, in one place.",
    body: "Script, Scenes, Characters, Locations, Wardrobe and Storyboard — six modules, every one of them linked back to the same script.",
    image: "/screenshots/reel/dashboard.jpg",
  },
  {
    id: "storyboard",
    slate: "SC. 03",
    title: "Boards before the build.",
    body: "Shot-by-shot panels in eight styles, from sketch to photoreal. Run the sequence as a slideshow before anyone books a stage.",
    image: "/screenshots/reel/storyboard.jpg",
  },
  {
    id: "tasks",
    slate: "SC. 04",
    title: "The board runs the day.",
    body: "Department lanes, assignees, priorities and due dates. The status meeting writes itself, which is the only kind worth having.",
    image: "/screenshots/reel/tasks.jpg",
  },
  {
    id: "callsheets",
    slate: "SC. 05",
    title: "Call sheets that acknowledge themselves.",
    body: "Generate, distribute, collect acknowledgements. Cast and crew get notified where they already are. No PDF email chain.",
    image: "/screenshots/reel/callsheets.jpg",
  },
  {
    id: "reports",
    slate: "SC. 06",
    title: "Numbers that survive the audit.",
    body: "Budget breakdown, logistics, sustainability and global film-compliance reports, generated at a click and traceable to the scene that caused them.",
    image: "/screenshots/reel/reports.jpg",
  },
  {
    id: "crew",
    slate: "SC. 07",
    title: "Continuity that survives the schedule.",
    body: "Reference portraits, per-scene looks, and crew matched to the shape of your project. The thing that breaks at 2am, held together.",
    image: "/screenshots/reel/anna-detail.jpg",
  },
];

/** Curve positions, resolved once from the layout. */
export const FRAME_POSITIONS: number[] = REEL_FRAMES.map((_, i) =>
  frameCurvePosition(i, REEL_FRAMES.length)
);

/**
 * The can label at the bottom of the fall — the wrap.
 *
 * Written the way a real can is marked up, and deliberately echoing the END
 * CREDITS block on the v1 landing so the two builds read as the same product.
 */
export const CAN_LABEL: Array<[string, string]> = [
  ["Production", "Storyvord · AI Co-Producer"],
  ["Reels", "07 · script → screen"],
  ["Format", "2.39 : 1 · 24 fps"],
  ["Status", "Delivered"],
];
