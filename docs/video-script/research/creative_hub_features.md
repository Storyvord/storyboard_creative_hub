# Creative Hub — Feature Catalog (Research for Demo Script)

Source paths referenced are relative to the `creative_hub_frontend` repo. This catalog walks each chapter in the order a filmmaker would naturally use the product. Inputs/outputs and AI-vs-manual behavior are taken straight from page components and `services/creative-hub.ts`.

---

## 1. Introduction / Overview

**One-line summary.** The Creative Hub is the pre-production workspace inside a Storyvord project — a place where a filmmaker drops in a screenplay and walks out with structured scenes, a cast bible, a wardrobe rack, a location list, and an AI-generated shot-by-shot storyboard, all kept visually consistent.

**Filmmaker problem it solves.** "I have a script. I need a shot list, mood images for every scene, and a way to show the DP, the costume designer, and the location scout what I see in my head — without spending three weekends in Photoshop." The Hub compresses that prep into a single guided pipeline.

**How the user enters it.** From any project at `/projects/<projectId>`, the left sidebar in `app/projects/[projectId]/layout.tsx` exposes a vertical menu: **Script → Scenes → Characters → Locations → Wardrobe → Storyboarding → Scene Reports → Risk Analyzer**. The bare URL `/projects/<id>/creative-hub/` redirects to `script` (see `creative-hub/page.tsx`) because the script is the entry contract for everything downstream.

**Navigation layout.** A persistent vertical sidebar (from the project layout) holds the chapter links. Each chapter page renders its own toolbar in a `header` band, a main content panel, and (where relevant) a right-side scene navigator. A floating "Platform Tour" button in the bottom-right corner (`PlatformTour.tsx`, mounted in `creative-hub/layout.tsx`) walks a first-time user through the chapters — the tour is sticky per-page in `localStorage`.

**Visually distinctive.** Dark theme (`var(--background)` near-black, emerald-500 accents). Every AI action surfaces a 3-step progress micro-state — "Saving → Queued → Rendering" — with a rotating wand icon, animated dots, and shimmer. A live "Generating…" overlay is the visual signature of the product.

---

## 2. Script

**One-line summary.** A Final-Draft-style screenplay editor with AI parsing — upload any common script file, get back a typed, formatted screenplay that's been auto-broken into scenes, characters, and dialogue.

**Filmmaker problem it solves.** "Studios send me PDFs and Word docs. I need them in a structured form so the production team can plan around them." This page turns prose into data without forcing the filmmaker to retype anything.

**Key UI elements** (see `creative-hub/script/page.tsx`):
- **Top bar** with the active screenplay element pill ("scene heading", "action", "character"…), Shortcuts button, Analytics button, Upload, Save, and a red Delete button.
- **Empty-state upload zone** — a dashed-border card centered on the page, with file-type label "Supports .fdx, .pdf, .docx, .doc, .rtf, .txt" and a green "Select File" CTA.
- **TipTap-based ScriptEditor** rendered as a real US-letter page (720px wide, white-on-near-black) with industry-standard screenplay formatting: scene headings left-aligned bold uppercase, action full-width, character names centered uppercase, dialogue centered ~65% width, parentheticals centered narrow, transitions right-aligned.
- **Scene Navigator sidebar** on the right — auto-listing every `INT./EXT.` heading detected, click to scroll the editor to that scene with a brief emerald ring highlight.
- **Bottom status bar** — live "X lines · Y scenes" counter, plus shortcut hints (`⌘S Save`, `Tab Cycle Element`, `⌘1-7 Elements`).
- **Confirm banner** (amber, pulsing dot) shown during the conversion-review state.

**Actions / flows.**
1. **Upload.** Allowed extensions: `.fdx, .pdf, .docx, .doc, .rtf, .txt`. FDX is parsed inline; everything else triggers a Celery conversion task — the UI flips to a "Converting your screenplay… 30–90 seconds" loader with a poll loop (`getTaskStatus`).
2. **Review & Confirm.** After conversion, the user sees the parsed draft inside the same editor with an amber banner. They can edit anything, then click **Confirm Script**. If they edited the text, the backend re-runs the LLM converter on the edits (`confirmScriptConversion` with `screenplay_text`); otherwise it accepts the existing scene parse.
3. **Edit & Save.** Tab cycles screenplay elements; `⌘1–7` jumps directly to a type (scene_heading, action, character, dialogue, parenthetical, transition, shot). `⌘S` saves — the editor's text is round-tripped to FDX XML (`textToFdx`) and persisted via `PATCH /scripts/<id>/`.
4. **Analytics modal** (`⌘⇧A`). Five stat cards (Scenes / Characters / Interior / Exterior / Lines), then four charts powered by Recharts: Scene-by-Scene line chart (characters and dialogue counts per scene), Top Characters bar, Top Locations bar, Dialogue Distribution pie, Action-vs-Dialogue pie. Data comes partly from `script.analysis` (backend-computed) and partly from the local scene list.
5. **Re-upload** — replaces the current script.
6. **Delete** — requires typing CONFIRM in a destructive modal; wipes scenes, characters, shots.

**AI-powered vs manual.** Conversion (any non-FDX file → screenplay), the scene/character/dialogue extraction, dialogue-distribution analysis, action-vs-dialogue ratio — all AI/backend. The editor itself, scene-heading navigation, save, and analytics rendering are manual/deterministic.

**Inputs → outputs.** PDF/DOCX/FDX/TXT → FDX-stored screenplay + Script row with `analysis.scene_breakdown`, `analysis.character_appearances`, `analysis.setting_distribution`, `analysis.action_vs_dialogue`, `analysis.dialogue_distribution`.

**Cross-links.** Confirming the script unlocks Scenes, Characters, Locations, Wardrobe, Storyboard. Without a saved Script, those chapters show "No Script Found" empty states.

**Visually distinctive.** The "real page of a screenplay" framing (drop-shadowed 720px card on a dark background) — the only chapter that looks like a document. The amber pulsing confirm banner. The conversion loader's emerald ring with a small pulsing dot in the corner.

---

## 3. Scenes

**One-line summary.** A vertical list of every scene parsed from the script, with sync-status badges (new/edited/removed), a one-click "Re-sync from script" button, and a click-through into a full scene detail page.

**Filmmaker problem it solves.** "Show me my film as a scene strip — what's INT vs EXT, where it shoots, who's in it, and where the risk spots are." It's the production-board view: the bridge between literary script and physical production.

**Key UI elements** (`scenes/page.tsx`):
- Header: title, `Sync Scenes` / `Re-sync` button (turns orange when changes are detected vs the script).
- Change-summary pills at the top right: `+N new`, `~N edited`, `−N removed`.
- One card per scene: a square 14×14 "SC 03" slug on the left, scene name, INT./EXT. · environment chip on the right, description (2-line clamp), location pin, plus a **risk pill** (e.g. "HIGH · 3") if the Risk Analyzer has scored this scene.
- Sync states paint the card differently: new (dashed gray, semi-transparent, phantom card), edited (orange left accent bar, orange chips showing which fields changed — Action / Name / Location / Time / Dialogue), deleted (red border, strikethrough name, "Will be deleted" tag, shot-removal count).
- `SceneSyncPreviewModal` opens when the user clicks Sync — preview the diff before applying.

**Actions / flows.**
- Click a scene card → push to `/scenes/<sceneId>` detail page.
- Click the risk pill → jump to Risk Analyzer scoped to that scene.
- Re-sync → pulls latest changes from the script; the preview modal shows what will be added/updated/removed and the user confirms.

**Scene Detail Page** (`scenes/[sceneId]/page.tsx`):
- Top bar: Back to Scenes, Edit / Save / Cancel.
- Scene header: emerald "Scene N" pill + optional "Set N" tag, big title (inline-editable), and a row of MapPin / Clock / scene-hash chips. INT/EXT/INT-EXT becomes a dropdown when editing; location/environment become inputs.
- **Location image** (if attached): full-width hero with gradient overlay showing the location's name and description.
- **Description** block: multiline textarea when editing.
- **Risk Findings callout** (read-only summary; full edit is on Risk Analyzer).
- **Characters** grid: thumbnails (from scene-character image, falling back to character portrait, then initials) with role chips.
- **Dialogs** list: speaker name + text, all dialogues from the scene in order.
- **Shots** section: a 3-column grid of shot cards (image, "Shot N" + shot type chip, description, camera angle, movement). A green **Generate Shots** button on the right triggers AI shot breakdown (`generateShots`); generating state shows a centered "Generating shots…" loader.

**Cross-links.** Scenes ↔ Characters (via `scene_characters`), Scenes ↔ Location (`location_detail`), Scenes ↔ Risk findings, Scenes ↔ Shots/Storyboard, Scenes ↔ Dialogs.

**Visually distinctive.** The colored left accent bars for sync state (orange/red) and the phantom new-scene cards are the at-a-glance scannability cue.

---

## 4. Shots

Shots do **not** have their own top-level page. They live in two places:

- **Inside Scene Detail** (`scenes/[sceneId]/page.tsx`) as a 3-column grid with metadata + a "Generate Shots" button. Each card shows the active previz image, shot order, type, description, camera angle, and movement.
- **Inside Storyboard** (`storyboard/page.tsx`), where they are the unit of work — see chapter 5.

**Shot fields** (from `types/creative-hub.ts` and `bulkGenerateShots`): `id`, `scene`, `order`, `description`, `type` (Close-Up, Wide Shot, Tracking Shot, Over-The-Shoulder, Medium Shot, Medium Close-Up, Medium Two-Shot, Other), `camera_angle` (Eye Level, High Angle, Low Angle, Dutch Angle, Bird's Eye, Worm's Eye, Overhead, Other), `movement` ("Pan left, Dolly in…" free text), `lighting`, `rationale`, `image_url` (active previz), `previz` (active previsualization with aspect_ratio, model, etc.), `active_previz` (id).

**Actions on a shot:**
- Generate / regenerate previz image (per-shot or bulk).
- Inline-edit description, type, camera angle, movement.
- Drag-and-drop reorder (within scene and across scenes).
- Tag characters with `@` mentions in the description (those scene_character/character ids are passed to the next generation so the AI uses the right faces).
- Insert a shot between two existing shots (hover gap → `+` button).
- Manually add a shot via the "Add Shot" modal: description (required), shot type, camera angle, movement (optional).
- Open the **ShotDetailModal** (full screen) — see the rendered image, scroll through Prev/Next, regenerate with a different model.

**Where shots are AI-powered.** The initial shot breakdown of a scene is AI (`bulkGenerateShots([sceneId])` runs a Celery task that decomposes the scene into a sequence of shots with descriptions, types, angles). The previz image for each shot is AI (`bulkGeneratePreviz` / `generateShotImage`). Editing copy, dragging order, and shot-type dropdowns are manual.

**Visually distinctive.** The horizontal-scroll filmstrip per scene (chapter 5) is the canonical shot view. The inline `@character` chips inside the shot description are how the user binds a shot to specific cast.

---

## 5. Storyboarding

**One-line summary.** The visual storyboard — every scene is a horizontal filmstrip of shot cards with AI-generated previz images. Bulk generate, drag to reorder, swap styles, run a slideshow.

**Filmmaker problem it solves.** "I want to see my movie before I shoot it — every shot, in sequence, with the right framing and angle, in the visual style I'm going for, so I can hand a deck to my DP and producers."

**Key UI elements** (`storyboard/page.tsx`):
- **Top toolbar (h-14):** Title "Storyboard" · **Aspect Ratio** dropdown (16:9, 9:16, 1:1, 4:3, 3:4, 2.35:1, 21:9, 3:2) · **Style** dropdown (Sketch, Storyboard, HD, Anime) — both write back to the Script model. · Jump menu (hover to see all scenes for fast navigation) · Select All. Right side: Tour trigger, **Creative Space** button (links to the freeform image generator), **Slideshow** button, plus context-sensitive **Bulk Shots** / **Bulk Previz** buttons that appear when selection is non-empty.
- **Per-scene block** (`SceneItem`): scene header with select checkbox, "SC 01" mono slug, scene name, INT./EXT./location/time chips, shot count, and a **per-scene style override** dropdown (with an X button to "reset to project default"). Then a horizontally-scrolling shot row.
- **ShotCard:** aspect-video image at top, generation overlay when active (centered spinner + "Generating..." / "Retrying..."), red error banner with Retry button if the previz failed, drag handle (top-left, fades in on hover), selection circle (top-right). Below the image: order number `#01`, shot-type abbreviation chip (CU, WS, OTS, etc.), aspect-ratio badge, camera angle, shot-type select, and a description textarea that supports `@character` mentions (auto-complete dropdown from scene characters + global characters).
- **InsertZone:** invisible 4px-wide column between cards — on hover, a thin emerald line appears and a `+` button drops in so the user can insert a shot at exact position.
- **AddShotCard / AddShotModal:** dashed empty card at the end of the row → opens a small modal for manual shot creation.
- **Infinite scroll sentinel** at the bottom — loads more scenes progressively (`getStoryboardDataPaginated`) until "X of Y scenes loaded".

**Modals.**
- **ShotDetailModal** — full-screen single-shot view with prev/next navigation, regenerate, edit details, view previz history.
- **StoryboardSlideshowModal** — sequence-play every selected (or all) shot images at full screen, scene order then shot order.
- **ModelSelector** — pick a model + provider (and optional quality/size for variants) before kicking off a generation; shows credits-per-image cost and total credit count for the batch.

**Actions / flows.**
- **Generate Shots** (per scene or bulk-select scenes → "Bulk Shots"): AI breaks the scene's prose into ordered shots. Progress shows per-scene loader; backend uses `bulkGenerateShots(sceneIds)` and the page polls via `getBulkTaskStatus` with exponential backoff.
- **Generate Previz** (per shot or bulk): pick a model in the **ModelSelector**, then `bulkGeneratePreviz` fires a Celery task per shot. Each shot card flips to a spinner; when the task completes, the page swaps in the active previz `image_url`. Failures show a red banner with a Retry button. Credits in the user wallet are debited up-front and refreshed on completion.
- **Drag-and-drop reorder** across scenes — `reorderShots` persists the new order. Visual feedback: dragged card goes translucent, target gets an emerald drop-indicator line, source scene shows a "ghost" placeholder.
- **Per-scene style override** — Sketch / Storyboard / HD / Anime, falling back to the script-level default. The chosen style is passed through to image generation.
- **Inline edits** — change shot type / description; persisted with `updateShotDetails`.
- **Insert / Add shot** (manual) — described above.
- **Tag characters** with `@name` inside a shot description — those character ids flow into `bulkGeneratePreviz` as `scene_character_ids` / `character_ids` so the AI uses the right reference portraits.

**AI-powered vs manual.** Shot breakdown, previz image generation, regeneration on retry — AI. Reorder, manual add, description edits, style/aspect dropdowns, slideshow — manual.

**Inputs → outputs.** A scene's description (plus optional tagged characters/locations) → an ordered set of `Shot` rows with descriptions, angles, types. Then each shot → one or more `Previsualization` rows (image_url), with one marked active.

**Visually distinctive.** The horizontal filmstrip per scene with that mid-card description textarea and the floating drag handle. The "InsertZone" gap that grows a `+` button on hover. The slideshow takes the entire screen — great hero shot for the demo video.

---

## 6. Characters

Characters live across **three** related surfaces: the global Characters page, the Character Detail page, the Scene-Character detail page.

**One-line summary.** A cast directory — every speaking role parsed from the script, with an AI-generated portrait that stays consistent across every scene, plus per-scene "looks" that show the same character with different wardrobe, makeup, or injuries.

**Filmmaker problem it solves.** "I want one canonical face per character so my storyboard doesn't morph between shots, and I want to lock in what they're wearing in scene 12 vs scene 24 without losing the actor's identity."

### 6a. Characters list (`characters/page.tsx`)

**Key UI.**
- Header with "Add Character" green button (opens `CharacterModal`).
- A two-column **explainer panel**: left side "Characters (this page) — global reference portrait, canonical face, base for all AI generation"; right side "Scene Characters — scene-specific look, different costume/injury/aging, same actor different state".
- An active task banner (when a global generation is in-flight): "Generating Characters" with a percentage and progress message.
- 4-column responsive grid of character cards: square portrait, name, description (2 lines), "View Details" CTA. Hover reveals a red trash button. Characters are sorted by appearance count from `script.analysis.character_appearances`.

### 6b. Character Detail (`characters/[characterId]/page.tsx`)

**Key UI.**
- **Left column (260px):** 2:3 portrait card with upload-hover state; below it a row of two buttons: **Upload** (manual) and **AI Generate** (opens `ModelSelector`). Below: an **Add Reference** chip-row — drag in extra inspiration images that get tagged `$1`, `$2`, … and used by the next AI run. Below that: character name, scene count, wardrobe count chips, then a Bio / AI Prompt card. Stats cards (Scenes appeared, Wardrobe items, etc.).
- **Right column:** "Scene Appearances" grid — one card per scene the character appears in, each showing the scene-look thumbnail (or a placeholder), scene order/name, location, time, and wardrobe chips.
- Clicking a scene-appearance opens a bottom-anchored modal **SceneLookEditor** at 90vh — see below.

**Scene Look Editor (modal/page).** A three-pane drawer:
- **Left pane** — Character Ref portrait (the canonical face), and Scene Look canvas (the AI-generated scene-specific image, with upload-hover override and a big indigo **Generate Scene Look** button).
- **Center pane — Wardrobe picker:** "Assigned Costume" rack at the top (selected items as 14×14 thumbnails with X to remove), then a category-tabbed grid of all available wardrobe items (Head, Face, Torso, Legs, Feet, Hands, Full Body, Accessories). Each tab badge shows the count selected.
- **Right pane (220px):** Style Direction textarea ("Lighting, mood, era, color palette, visual style…"), Continuity Notes textarea ("Injuries, aging, makeup FX, blood, costume damage, props…"), green **Save Look** button.
- Generation has the same 3-step state: Saving wardrobe → Queued → Rendering.

**Actions / flows.**
- Upload a real photo as the character's portrait (manual baseline).
- AI-generate a portrait: pick model/provider in `ModelSelector`, optionally attach `$N` reference images (face refs, mood refs), kick off — the task is tracked through `useGenerationTasks` and updates when ready.
- Per-scene: select wardrobe items + write continuity notes → save (no generation, just persist), or **Generate Scene Look** (AI image of the character wearing those clothes in that scene's environment).
- View previz history per character and per scene look — `PrevizHistorySection` strip below the portrait shows every prior generation; clicking one promotes it to the active image (`setActiveSubjectPreviz`). A **Compare** button opens `PrevizCompareView` for side-by-side review.

### 6c. Scene Characters (`scene-characters/[sceneCharacterId]/page.tsx`)

**One-line summary.** The dedicated route for a single character-in-scene — full-page version of the Scene Look Editor with cloth slots, scene context (location, INT/EXT, time), notes, image generation, history, compare, and a build-sheet view.

**Cross-links.** Character (global) ↔ Scene Character (per-scene) — they share `character_id` and `scene_id`. Scene Character → Wardrobe (`cloth_ids`). Scene Character → Scene (provides the location, time, mood context the AI uses when generating). Scene Character ↔ Shot tagging (storyboard `@mentions` resolve to scene_character ids).

**AI-powered vs manual.** Portrait generation, scene-look generation, optional reference-image-driven variation — AI. Wardrobe selection, notes, manual photo upload, picking active previz from history — manual.

**Visually distinctive.** The bottom-drawer Scene Look Editor that slides up to 90% screen height. The colour-coded shimmer when an image is being generated. The "Character Ref" + "Scene Look" side-by-side pair on the left makes the consistency story visually self-explanatory.

---

## 7. Locations

**One-line summary.** A photographic location catalog — every place the script calls for, with an AI-generated establishing image and a deep "binder" detail page that doubles as a scout's brief.

**Filmmaker problem it solves.** "I need a picture of every place we shoot, and I need it consistent so when the storyboard says 'Downtown Alley — Night' the image matches what I'm picturing for the location scout to find."

**Locations list** (`locations/page.tsx`):
- Header with "Add Location" green button — opens `LocationModal` (Name + Time of Day + Description + optional image upload). Creating routes the user straight into the location detail page.
- 4-column grid of location cards: aspect-video image (or pin placeholder), name, time-of-day chip in emerald, 2-line description. Locations are sorted by frequency from `script.analysis.setting_distribution`. In-flight AI generations show a centered "Generating..." overlay.

**Location Detail** (`locations/[locationId]/page.tsx`):
- A long single-page binder with section bands and `InfoCard` blocks.
- Header bar: Back link, Pencil (edit info), Trash (delete with confirm), MoreVertical.
- **Hero region:** big aspect-video / aspect-portrait image with upload-hover + AI-generate overlay (same 3-step Saving / Queued / Rendering state), name, time-of-day chip.
- **Add Reference** chip-row (same `$1, $2` pattern as Character) — uploads are previsualizations that the next AI generation can reference for visual consistency.
- **PrevizHistory** strip + Compare button — see every image ever generated for this location and promote one to active.
- **Section bands** (drawing on `lucide-react` icons: Sun, Cloud, Wind, Compass, Truck, ParkingCircle, ShieldCheck, DollarSign, Calendar, Phone, Mail, …): a scout's data view with cards for weather, access/parking, permits, costs, contacts, schedule, hazards. NB: some of these are marked with the amber "Demo data" pill (`DemoPill`) — these are placeholder UI regions pending backend support. Treat that as illustrative for the demo.
- Linked scenes section: every scene where this location is used.

**Actions / flows.**
- Manual upload of an establishing photo.
- AI-generate a location image (with optional reference uploads).
- Inline edit name / description / time-of-day.
- Set an older history image as the active one (consistency anchor).
- Delete location.

**Cross-links.** Location ↔ Scenes (`scene.location_detail` is the FK back to a Location). Location image is what the user sees as the location hero on the Scene Detail page. In Creative Space, typing `#LocationName` injects this image into the next generation.

**AI-powered vs manual.** Location image generation — AI. Everything else (data fields, scout binder, history selection) — manual.

**Visually distinctive.** The long-scroll "production binder" layout in the detail page — the only chapter that feels like a paper document, with a glossy hero image up top.

---

## 8. Creative Space — Image Models

**One-line summary.** A free-form AI image studio scoped to the script — a chat-style prompt box at the bottom, history grid above, with `@character`, `#location`, and `$reference` mentions to pull project assets into the generation.

**Filmmaker problem it solves.** "I want to brainstorm a shot that doesn't exist yet — a poster mood, a key art frame, a wardrobe test, a 'what if we shot it like this' — using the same characters and locations I've already set up, so it looks like the rest of the film." This is the unstructured sandbox between Characters/Locations and the formal Storyboard.

**Key UI elements** (`creative-space/page.tsx`):
- Top header: title "Creative Space" with a panel icon, subtitle prompting the user to tag `@characters` and `#locations`. View History toggle button (top right) flips between the in-session strip and the full project-wide history.
- **MentionInput** — a chat-style textarea with three trigger characters:
  - `@CharacterName` (dropdown of all script characters with thumbnails)
  - `#LocationName` (dropdown of all script locations with thumbnails)
  - `$N` (auto-complete of attached reference images — uploaded inline, indexed 1, 2, 3…)
- **Attached reference chips** above the prompt — drag/drop or paperclip-upload images that get sent as `reference_previz_ids`.
- **Parameter bar:** Aspect Ratio dropdown (the same 8 ratios as the Storyboard), Camera Angle selector (modal), Shot Type selector (modal), Model selector dropdown showing display name + credits-per-image cost, plus optional Quality and Resolution dropdowns (only for models with variants).
- **History view (`showHistory`):** a chronological grid grouped by "Today / Yesterday / Mar 14, 2026" — each tile shows the generated image, prompt, tagged characters/locations, aspect ratio, model used. In-flight tiles show a centered spinner; failed tiles show a red error state with retry copy. Infinite scroll loads older history when the user scrolls near the top.
- **Session view:** the in-progress strip, auto-scrolling to bottom as new generations finish.

**Image Models available.** Loaded dynamically via `getImageModels()` — the backend exposes any ImageModel row marked `supports_generate=true`. Each model carries `model_name`, `provider`, `display_name`, `credits_per_image`, `cost_per_image`, `resolution`, `aspect_ratio`, optional `supported_qualities` and `supported_resolutions` for variant axes, plus `credits_per_input_image` (for models like `gpt-image-2` that charge per attached reference). The same `ModelSelector` component is reused by every other chapter when a generation needs to be kicked off, which is what makes the cost story consistent across the product.

**Actions / flows.**
1. Type a prompt, optionally `@`-tag characters and `#`-tag locations, optionally attach `$` images.
2. Pick model / aspect / camera angle / shot type / quality / resolution.
3. Hit Send. The page creates a `Previsualization` row (`createScriptPrevisualization`) with `generate_ai_image: true`, the prompt, the resolved character_ids and location_ids, and reference_previz_ids. An optimistic tile appears in the strip with a spinner.
4. The page polls the Celery task until it completes (`pollTaskUntilComplete`), then refetches the previz row and swaps in the rendered `image_url`. Credits are debited up-front and refunded on failure.
5. On reload mid-generation, the page re-checks task status (`getLatestTaskStatus`) and resumes the spinner so the user isn't stranded.

**AI-powered vs manual.** Everything except the prompt typing, parameter selection, and history navigation is AI. The reference-image upload itself is manual but feeds into AI consistency.

**Inputs → outputs.** Prompt text + parameters + character_ids + location_ids + reference_previz_ids → a `Previsualization` row with an `image_url` rendered by the chosen model. The row lives in the script's PrevizHistory feed and can later be promoted to be the active image of a shot, character, scene character, or location.

**Visually distinctive.** The chat-like prompt with live colored highlights for `@` (emerald), `#` (sky), `$` (amber); the auto-completing dropdown that floats above the textarea; the date-grouped infinite-scroll history grid that feels like Midjourney.

---

## 9. Consistency in Images

This isn't a UI page but a cross-cutting feature spine. The product fights "AI character drift" with four concrete mechanisms wired through the same `Previsualization` model.

**1. Canonical reference images per subject.**
- A **Character** has one active portrait (`active_previz`). When you generate a scene look, a shot previz, or a Creative-Space image that mentions `@That Character`, that portrait is passed to the model as a reference.
- A **Location** has one active establishing image; `#That Location` pulls it into the next prompt.
- A **Scene Character** has its own active image (the scene-specific look) — so wardrobe + makeup changes are themselves locked in once approved.
- Every subject also has a **PrevizHistory** strip with a Compare modal. Any prior generation can be promoted back to `active_previz` (`setActiveSubjectPreviz` PATCHes the FK), which retroactively makes that look the canonical one for every downstream generation that references the subject.

**2. Per-shot character binding via @mentions.**
- In Storyboard, a shot description that contains `@Alex` resolves to either a `scene_character_id` (preferred, scene-specific look) or a global `character_id`. Both are sent through `bulkGeneratePreviz` so the image-generation worker can attach the right reference image when calling the model.
- In Creative Space, the same machinery wires `@` and `#` mentions into `character_ids` and `location_ids` on `createScriptPrevisualization`.

**3. User-attached reference images (`$N`).**
- On Character Detail, Location Detail, and Creative Space, an **Add Reference** / paperclip control uploads supplementary images that are stored as Previsualizations tagged "User reference" (`uploadCreativeSpaceReference`). They show up as numbered amber chips ($1, $2, …) and are passed to the next generation as `reference_previz_ids`. Models that support multi-image conditioning (e.g. `gpt-image-2`) honor every one; cost is `credits_per_image + (refs × credits_per_input_image)`.

**4. Style + aspect-ratio locking.**
- The Script row carries a project-wide `storyboarding_type` (Sketch, Storyboard, HD, Anime) and `aspect_ratio`. Every Storyboard generation defaults to these.
- A scene can override `storyboarding_type` for a specific look (e.g. a flashback in Sketch style while the rest of the script is HD) and the per-scene override is passed through the generation pipeline. An X button next to the scene-level style resets it to inherit the script default.

**Visually distinctive.** The "Character Ref / Scene Look" twin-column inside the Scene Look Editor is the most explicit consistency UI — the user is literally looking at the canonical face next to the scene-specific variant. The `$1 / $2` amber chips above the prompt and the @/# colored mentions inside the textarea are the secondary visual cues that "the AI is being told what to look like."

**Cross-links recap.** Script → Scenes / Characters / Locations / Wardrobe / Shots → Previsualizations → PrevizHistory → active_previz. The `Previsualization` row is the consistency atom; everything else is a way of selecting which previz becomes canonical for which subject.

---

## Quick reference — what each chapter unlocks

| Chapter | Depends on | Unlocks |
|---|---|---|
| Script | (entry) | Scenes, Characters, Locations, Wardrobe, Storyboard |
| Scenes | Script | Scene Detail, Risk Analyzer per-scene scoring |
| Characters | Script | Scene Characters, character-tagged generation |
| Locations | Script | Location-tagged generation, scene location hero image |
| Wardrobe | Script | Scene-character looks (Fitting Room) |
| Storyboard | Script + Scenes | Shots, previz, slideshow |
| Creative Space | Script (+ characters/locations for tagging) | Free-form previz, references for any subject |

[VERIFY] The Location Detail page contains several "Demo data" pills (`DemoPill`) on scout-binder sections (weather, parking, costs, contacts). For the demo video, the **hero image, history strip, reference attachments, generate-with-AI flow, scene-linkage** are real; the binder data fields are layout-only placeholders pending backend.
