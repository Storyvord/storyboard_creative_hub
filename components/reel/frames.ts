/**
 * What is printed on the roll.
 *
 * Same contract as the soundstage's STATIONS: this array is the single source
 * of truth for the 3D frames AND for the scroll steps that carry the copy in
 * the DOM. The steps are what a screen reader reads and what renders when the
 * canvas is absent, so the strip can never show something the page does not say.
 *
 * `at` is the position along the strip curve, 0 at the feeder and 1 at the
 * take-up reel. They are spaced by hand rather than evenly: the curve's twist
 * is not uniform, so even spacing would land some frames edge-on at the moment
 * they are supposed to open.
 */

export interface ReelFrame {
  id: string;
  /** Scene number, printed on the frame edge the way a slate numbers a setup. */
  slate: string;
  title: string;
  body: string;
  /** Downscaled to 960px — the full screenshots are 2160px and cost ~11 MB of
   *  VRAM each as textures. */
  image: string;
  at: number;
}

export const REEL_FRAMES: ReelFrame[] = [
  {
    id: "script",
    slate: "SC. 01",
    title: "The script goes in.",
    body: "Drop a screenplay and every scene, character, prop and location is tagged for you — the week of an AD's life that used to happen on index cards.",
    image: "/screenshots/reel/script.jpg",
    at: 0.075,
  },
  {
    id: "hub",
    slate: "SC. 02",
    title: "The art department, in one place.",
    body: "Script, Scenes, Characters, Locations, Wardrobe and Storyboard — six modules, every one of them linked back to the same script.",
    image: "/screenshots/reel/dashboard.jpg",
    at: 0.215,
  },
  {
    id: "storyboard",
    slate: "SC. 03",
    title: "Boards before the build.",
    body: "Shot-by-shot panels in eight styles, from sketch to photoreal. Run the sequence as a slideshow before anyone books a stage.",
    image: "/screenshots/reel/storyboard.jpg",
    at: 0.36,
  },
  {
    id: "tasks",
    slate: "SC. 04",
    title: "The board runs the day.",
    body: "Department lanes, assignees, priorities and due dates. The status meeting writes itself, which is the only kind worth having.",
    image: "/screenshots/reel/tasks.jpg",
    at: 0.505,
  },
  {
    id: "callsheets",
    slate: "SC. 05",
    title: "Call sheets that acknowledge themselves.",
    body: "Generate, distribute, collect acknowledgements. Cast and crew get notified where they already are. No PDF email chain.",
    image: "/screenshots/reel/callsheets.jpg",
    at: 0.645,
  },
  {
    id: "reports",
    slate: "SC. 06",
    title: "Numbers that survive the audit.",
    body: "Budget breakdown, logistics, sustainability and global film-compliance reports, generated at a click and traceable to the scene that caused them.",
    image: "/screenshots/reel/reports.jpg",
    at: 0.785,
  },
  {
    id: "crew",
    slate: "SC. 07",
    title: "Continuity that survives the schedule.",
    body: "Reference portraits, per-scene looks, and crew matched to the shape of your project. The thing that breaks at 2am, held together.",
    image: "/screenshots/reel/anna-detail.jpg",
    at: 0.915,
  },
];

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
