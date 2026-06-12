# Creative Hub — Tutorial Video Series Script (Final)

A nine-chapter explainer series covering Storyvord's Creative Hub, the pre-production workspace inside a Storyvord project. Each chapter is a standalone YouTube video aimed at working filmmakers — directors, producers, ADs, DPs — who want to learn one page of the product at a time. Watch them in order if you're new, or land on a single chapter from search and you'll still know what to do.

## Runtime table (140 WPM, voiceover only — excludes director notes and visual cues)

| Chapter | Title | VO Words | Runtime |
|---|---|---:|---:|
| 0 | Creative Hub Overview | 285 | ~122s |
| 1 | Script | 395 | ~169s |
| 2 | Scenes | 356 | ~153s |
| 3 | Shots | 406 | ~174s |
| 4 | Storyboarding | 413 | ~177s |
| 5 | Characters | 400 | ~171s |
| 6 | Locations | 331 | ~142s |
| 7 | Creative Space — Image Models | 411 | ~176s |
| 8 | Consistency in Images | 417 | ~179s |
| **Total** | | **3414** | **~24m 23s** |

---

## Chapter 0 — Creative Hub Overview
**Standalone video runtime:** ~122s  **VO word count:** 285  **Difficulty:** Beginner

### Cold-open orientation (5-10s)
> Creative Hub is the pre-production workspace inside a Storyvord project. This video is the tour — what each page is for, and the order most filmmakers use them in.

### What this feature does (10-20s)
> You drop in a screenplay. You get back structured scenes, a cast bible, a wardrobe rack, a location list, and an AI-generated storyboard, all kept visually consistent. It's the prep stack — one place — for the work that usually lives across a spreadsheet, a folder of PDFs, and someone's Slack DMs.

### How to use it — walkthrough

**Getting in.** Open any Storyvord project and look at the left sidebar. The Creative Hub menu lists eight pages in the order you'll touch them.

**The page-by-page tour.**
- **Script** is where you start — upload your screenplay, the editor parses it.
- **Scenes** is the strip view — every scene as a card, with sync badges when the script changes.
- **Characters** is the cast directory with AI portraits.
- **Locations** is the photographic scout binder.
- **Wardrobe** is the costume library scene looks pull from — covered in context inside the Characters video.
- **Storyboarding** is the visual filmstrip — every scene, every shot, AI previz.
- **Scene Reports** and **Risk Analyzer** also live in the sidebar. Scene Reports has its own video down the road; Risk Analyzer flags physical and logistical risks per scene and gets a passing mention in the Scenes chapter.
- **Creative Space** is the free-form image studio for everything that doesn't fit a shot row. Open it from the sidebar or from the button on the Storyboarding toolbar.

[VISUAL: cursor traces the sidebar top-to-bottom, each page name pulses as named]

**Platform Tour.** If you ever get lost, the Platform Tour button in the bottom-right corner re-runs this orientation in-app.

**Where to start.** Script first. Everything downstream is empty until a script is confirmed.

### Director notes
- Screen record the project sidebar with cursor traversal.
- Lower-third chyron: "Project → Creative Hub" as the URL crumb.
- Hold on the empty Scenes / Storyboard pages briefly to make the "Script first" point land visually.
- Capture the Platform Tour button in the bottom-right as it's named.

---

## Chapter 1 — Script
**Standalone video runtime:** ~169s  **VO word count:** 395  **Difficulty:** Beginner

### Cold-open orientation (5-10s)
> The Script page is the entry point of Creative Hub. This video covers uploading a screenplay, reviewing the AI parse, editing inside the screenplay editor, and reading the analytics that come out the other side.

### What this feature does (10-20s)
> A screenplay arrives as a PDF, a Word doc, an FDX from Final Draft, sometimes plain text. The Script page reads any of those, formats them as a real screenplay, and parses the scenes, characters, and dialogue so every other page in Creative Hub has something to work with.

### How to use it — walkthrough

**Getting in.** Open the Creative Hub on a fresh project and you land on Script. An empty state shows a dashed upload card in the middle of the page.

**The main flow.**
1. **Upload your screenplay.** Supported formats are FDX, PDF, DOCX, DOC, RTF, and TXT. FDX comes through as-is; everything else runs through an AI conversion that takes thirty to ninety seconds. A loader with a pulsing emerald ring tells you it's working.
2. **Review the parse.** When conversion finishes the screenplay opens in the editor with an amber confirm banner across the top. Scene headings are bold and uppercase, action runs full width, character names sit centered above their dialogue. Read it. Fix anything the AI got wrong.
3. **Confirm the script.** Hit Confirm Script. If you edited the text, the parser re-runs on your edits; if you didn't, it accepts the existing parse. Scenes, Characters, Locations, and Storyboarding all populate from that point on.

**Working in the editor.** Tab cycles screenplay elements. ⌘1 through ⌘7 jumps you to a specific element — scene heading, action, character, dialogue, parenthetical, transition, shot. ⌘S saves. The right rail is a scene navigator — every INT or EXT slug is listed; click one and the editor scrolls to it with a brief emerald highlight.

**Analytics.** ⌘⇧A opens the analytics modal. Stat cards count scenes, characters, interiors, exteriors, and lines. Charts break down scene-by-scene character and dialogue counts, top characters, top locations, dialogue distribution, and the action-to-dialogue ratio.

**Outputs.** A saved screenplay, plus a structured analysis the rest of Creative Hub uses to populate scene cards, character lists, and location chips.

### Common questions / tips
> **Tip:** Re-upload replaces the current script. Delete wipes scenes, characters, and shots and asks you to type CONFIRM first.
> **Tip:** The editor round-trips back to FDX, so Final Draft users can keep working in their tool of choice.

### Director notes
- Capture the upload → loader → amber banner → confirm sequence as one continuous take.
- Overlay the keyboard shortcut as a small key cap on screen each time it's used.
- Hold on the analytics modal for two beats — the charts are the visual flex of this chapter.

---

## Chapter 2 — Scenes
**Standalone video runtime:** ~153s  **VO word count:** 356  **Difficulty:** Beginner

### Cold-open orientation (5-10s)
> The Scenes page is the production-board view of your screenplay. This video covers reading the scene list, syncing it back to the script when the screenplay changes, and opening a Scene Detail page to work on a single scene.

### What this feature does (10-20s)
> Once the script is confirmed, every scene becomes a card on a vertical strip. You can see at a glance what's interior versus exterior, where it shoots, who's in it, and which scenes have been flagged by the Risk Analyzer. It's the bridge between the literary script and the physical production.

### How to use it — walkthrough

**Getting in.** From the Creative Hub sidebar, open Scenes. You'll see one card per scene, in order.

**Reading a scene card.** Each card has a square slug on the left — "SC 03" — then the scene name, the INT or EXT chip, the environment, a two-line description, and a location pin. If the scene has been scored for risk, you'll also see a risk pill — for example, "HIGH · 3" — on the right.

**Sync state.** When the script changes, the Scenes page shows you the diff before you accept it. New scenes appear as dashed, semi-transparent phantom cards. Edited scenes get an orange left bar and orange chips naming which fields changed — Action, Name, Location, Time, or Dialogue. Deleted scenes turn red with a strikethrough.

**Syncing.** The Sync Scenes button turns orange when changes are detected. Click it and a preview modal opens with the full diff — added, updated, removed. Confirm to apply.

**Opening a scene.** Click a card and you land on the Scene Detail page. You'll see the scene header, the location image as a hero, the description, a Risk Findings callout if any, a character grid, the dialogue list in order, and a shot grid at the bottom with a Generate Shots button.

**Editing.** Hit Edit on the detail page. The title, location, environment, and description become inline fields. INT/EXT becomes a dropdown. Save when you're done.

**Cross-links.** A character thumbnail jumps to that character's page. The risk pill jumps to the Risk Analyzer scoped to this scene. Generating shots here is the same engine that powers the Storyboard.

### Director notes
- The color-coded sync states are the signature beat — capture an edited card and a deleted card side by side.
- Hold on the Scene Detail page once it's populated; show the hero image, character grid, and shot section together.

---

## Chapter 3 — Shots
**Standalone video runtime:** ~174s  **VO word count:** 406  **Difficulty:** Intermediate

### Cold-open orientation (5-10s)
> Shots in Creative Hub don't have their own top-level page. They live at the bottom of the Scene Detail page — the per-scene page you opened from Scenes — and the Storyboard mirrors them in bulk. This video covers what a shot row contains and how to work it from Scene Detail.

### What this feature does (10-20s)
> A shot is the unit of coverage — one description, one camera angle, one movement, one previz image. Creative Hub generates them from the scene prose, lets you reorder them, edit the metadata, and bind them to specific cast.

### How to use it — walkthrough

**Getting in.** Open a scene from the Scenes page and scroll to the bottom. The shot grid sits below the dialogue, with a green Generate Shots button on the right.

**Reading a shot.** Each shot card carries an order number, a shot-type chip (Close-Up, Wide Shot, Over-The-Shoulder, Medium Shot, and so on), a camera angle (Eye Level, High Angle, Low Angle, Dutch, Bird's Eye, Worm's Eye), a movement note, a description, and the active previz image at the top.

**Generating shots.** Hit Generate Shots. The AI reads the scene description and returns an ordered sequence of shots with descriptions, types, and angles already filled in. A per-scene loader runs while the task is in flight.

**Editing.** Click into a description or pick a different shot type from the dropdown — both save inline. Drag a card by the handle in the top-left to reorder it, even across scenes.

**Tagging characters.** Type `@` in a shot description and an auto-complete dropdown lists every character in this scene plus every global character. Pick one and that character ID flows into the next previz generation so the AI uses the right reference face.

**Adding a shot manually.** Hover the gap between two cards — a thin emerald line and a plus button appear. Click it and a small modal opens for description, shot type, camera angle, and movement.

**Opening a single shot.** Click a shot card and the Shot Detail modal opens full-screen — the image at full size, prev/next arrows to flip through the scene, a regenerate button that lets you try a different model, and the previz history for that shot.

**Storyboard cross-reference.** The Storyboarding page renders the same shots as horizontal filmstrips across every scene, with bulk-select for cross-scene work. That's its own chapter.

**Outputs.** An ordered list of Shot rows per scene, ready for previz.

### Director notes
- Capture the `@` mention dropdown in action — that's the consistency hook this chapter sells.
- Show one drag-reorder across scenes with the emerald drop indicator.
- Open the Shot Detail modal once and show the prev/next arrows working.

---

## Chapter 4 — Storyboarding
**Standalone video runtime:** ~177s  **VO word count:** 413  **Difficulty:** Intermediate

### Cold-open orientation (5-10s)
> The Storyboard is the visual board for the whole film — every scene as a horizontal filmstrip of shot cards with AI-generated previz images. This video covers generating previz in bulk, swapping styles, reordering, and running a slideshow.

### What this feature does (10-20s)
> You want to see the film before you shoot it. The Storyboard renders every shot as an image in the visual style you're going for, in the aspect ratio you'll deliver, so you can hand a deck to your DP and your producers and have everyone looking at the same movie.

### How to use it — walkthrough

**Getting in.** Open Storyboarding from the Creative Hub sidebar. Scenes load as filmstrips down the page, with the first few scenes ready and more loading as you scroll.

**The toolbar.** Across the top: a project-wide aspect ratio (16:9, 9:16, 1:1, 4:3, 3:4, 2.35:1, 21:9, 3:2) and a project-wide style (Sketch, Storyboard, HD, or Anime). Both write back to the script so the whole board moves together. A jump menu lets you fast-scroll to a specific scene.

**Per-scene controls.** Each scene block has a select checkbox, a slug, the scene name with INT/EXT and location chips, the shot count, and a per-scene style override — useful for, say, putting a flashback in Sketch while the rest of the script is HD. The X next to it resets to the script default.

**Generating previz.** Select one or more scenes and use the Bulk Previz button. The model selector opens — pick a model and a provider, see the credits-per-image cost and the total for the batch, and confirm. Every shot card flips to a spinner with a Generating overlay; when the task completes the image swaps in. Failed shots show a red banner with Retry.

**Reordering.** Drag any shot card by its handle. You can drop it earlier or later within a scene, or across scenes entirely. A translucent ghost marks the source and an emerald line marks the drop target.

**Tagging characters.** Just like in Scene Detail, `@` inside a shot description opens an auto-complete of characters from this scene and from the global cast. Tagged characters flow into the next previz generation so the AI uses the right faces.

**Slideshow.** The Slideshow button plays every selected — or every — shot full screen, scene order then shot order. Good for screening the cut with producers.

**Outputs.** A previz image per shot, all in the same style and aspect ratio.

### Director notes
- The slideshow full-screen is the hero beat of this chapter — hold for two extra seconds when it launches.
- Show the credit cost in the model selector clearly; that's a key piece of information for filmmakers planning runs.

---

## Chapter 5 — Characters
**Standalone video runtime:** ~171s  **VO word count:** 400  **Difficulty:** Intermediate

### Cold-open orientation (5-10s)
> The Characters page is your cast directory. This video covers the difference between a global character and a scene character, generating a portrait, and using the Scene Look Editor to lock a character's wardrobe and continuity scene by scene.

### What this feature does (10-20s)
> One canonical face per character, so the storyboard doesn't morph between shots. Then a per-scene look on top of that — same actor, different costume, different makeup, different injury — so scene twelve and scene twenty-four don't fight each other.

### How to use it — walkthrough

**Getting in.** Open Characters from the Creative Hub sidebar. The cast grid shows every speaking role parsed from the script, sorted by appearance count.

**Global versus scene characters.** A global character is the canonical reference — one portrait, one face, the base every AI generation starts from. A scene character is that same actor in a specific scene with specific wardrobe, makeup, or condition. The Characters page lists global characters; scene characters live inside the Character Detail page.

**Creating a portrait.** Click into a character. On the left you'll see a portrait slot. You can upload a real photo if you have one, or use AI Generate — the model selector opens, pick a model, optionally attach reference images as `$1`, `$2`, and so on, and kick off the generation. The image arrives in a few seconds and becomes the canonical face for that character everywhere downstream.

**Scene appearances.** The right side of the Character Detail page lists every scene this character appears in, with the location, time, and current scene-look thumbnail. Click any of them and the Scene Look Editor slides up from the bottom.

**The Scene Look Editor.** Three panes. On the left, the canonical Character Ref portrait above and the Scene Look canvas below — face on top, scene-specific variant underneath. The center pane is the wardrobe picker: an Assigned Costume rack at the top, then tabbed categories below it pulling from your Wardrobe library — head, face, torso, legs, feet, hands, full body, and accessories. The right pane carries two text fields: Style Direction for lighting, mood, era, and palette; and Continuity Notes for injuries, aging, makeup FX, blood, costume damage, and props.

**Generating a scene look.** Hit Generate Scene Look. The same three-step state runs — Saving wardrobe, Queued, Rendering — and the new image lands in the Scene Look canvas.

**Outputs.** One canonical portrait per character, plus one scene-specific look per scene that character is in.

### Director notes
- Capture the bottom drawer opening to 90% screen height — that's a signature motion of this page.
- Show the Character Ref / Scene Look pair side by side; that visual sells the chapter.

---

## Chapter 6 — Locations
**Standalone video runtime:** ~142s  **VO word count:** 331  **Difficulty:** Beginner

### Cold-open orientation (5-10s)
> The Locations page is a photographic catalog of every place the script calls for. This video covers the list page, the long binder-style detail page, and a clear callout of which sections are wired up versus which are layout placeholders right now.

### What this feature does (10-20s)
> A picture of every place you shoot, kept visually consistent, so when the storyboard says "Downtown Alley — Night" the image you see and the image your location scout sees are the same one.

### How to use it — walkthrough

**Getting in.** Open Locations from the Creative Hub sidebar. You'll see a grid of location cards, sorted by how often each location appears in the script.

**Adding a location.** The Add Location button opens a small modal — name, time of day, description, and an optional image upload. Save and you land straight on the location's detail page.

**The detail page.** A long single-page binder.
- **Hero image** at the top. Upload a real photo or use AI Generate to render one. The same three-step state — Saving, Queued, Rendering — runs over the image.
- **Add Reference** lets you upload extra inspiration images that the next AI generation will reference. They show up as `$1`, `$2` chips, the same convention used elsewhere in Creative Hub.
- **Previz history** sits below the hero — every image you've generated for this location. Click any of them and a Compare modal lets you set an older image back to active.

**What's real, what's placeholder.** The hero image, the reference uploads, the history strip, the AI generation flow, and the linked-scenes section are fully wired. The scout-binder sections below — weather, access and parking, permits, costs, contacts, schedule, hazards — are tagged with a "Demo data" pill. Those are layout-only placeholders pending backend support. Use the page today for visuals and references; treat the binder fields as a preview of where it's going.

**Cross-links.** Each location is the hero image on every Scene Detail page that uses it. In Creative Space, typing `#LocationName` pulls this image into the next generation.

### Director notes
- Be explicit on screen when you hit the Demo Data sections — chyron text "Layout-only, backend pending" so viewers don't expect features that aren't shipped.
- The hero generation is the hero shot of this chapter; capture it from prompt to final image.

---

## Chapter 7 — Creative Space — Image Models
**Standalone video runtime:** ~176s  **VO word count:** 411  **Difficulty:** Intermediate

### Cold-open orientation (5-10s)
> Creative Space is the free-form image studio inside Creative Hub — a chat-style prompt box with your project's characters and locations pre-loaded. This video covers the prompt syntax, the model picker, the parameter bar, and the history view.

### What this feature does (10-20s)
> Sometimes you need an image that isn't a shot in the storyboard — a key art frame, a poster mood, a wardrobe test, a "what if we shot it like this." Creative Space is the sandbox for those, with `@character`, `#location`, and `$reference` tagging so the result looks like the rest of your film.

### How to use it — walkthrough

**Getting in.** Open Creative Space from the Creative Hub sidebar or from the button on the Storyboarding toolbar.

**The prompt syntax.** The prompt box at the bottom takes three trigger characters.
- `@` opens a dropdown of every character in the script. Pick one and that character's reference portrait flows into the generation.
- `#` opens a dropdown of every location, with the establishing image.
- `$` references a numbered upload — drag in an inspiration image and it becomes `$1`, the next one `$2`, and you can call them by number in the prompt.

The mentions are color-coded inside the textarea — emerald for `@`, sky for `#`, amber for `$` — so you can see at a glance what the AI is being told to use.

**The parameter bar.** Above the send button: aspect ratio (the same eight options as the storyboard), camera angle, and shot type — the same pickers you saw on a shot card. Then the model dropdown, which lists every image model available with its credits-per-image cost next to the name. Some models expose quality and resolution variants; those dropdowns appear next to the model when they apply.

**Sending.** Hit send. An optimistic tile appears in the strip with a spinner and the prompt visible. Credits debit from your wallet up front. When the render completes the image swaps in. If a generation fails the credits refund and a retry shows up on the tile.

**History.** Toggle the History view to see every generation in the project, grouped by date — Today, Yesterday, then dated blocks. Infinite scroll loads older runs as you scroll up.

**Reload-resume.** If you close the tab during a generation, reopen it and the in-flight tile picks up the same spinner exactly where it left off.

**Outputs.** A previz image you can later promote to be the active image of a shot, character, scene character, or location.

### Director notes
- Capture the `@`/`#`/`$` autocomplete dropdown floating above the textarea — that's the signature interaction.
- Show the credit-cost change as a model is swapped in the dropdown. Filmmakers care about spend.

---

## Chapter 8 — Consistency in Images
**Standalone video runtime:** ~179s  **VO word count:** 417  **Difficulty:** Advanced

### Cold-open orientation (5-10s)
> AI image generators drift. The same character will look different in every shot unless you tell the model what to lock. Every character and every location in Creative Hub has one canonical image; this video covers the four mechanisms the product uses to keep that canon stable — and how to use each one deliberately.

### What this feature does (10-20s)
> One face per character across the whole film. One look per location. Scene-specific wardrobe that doesn't bleed into other scenes. A locked visual style and aspect ratio across the whole storyboard. These aren't separate features — they're four levers on the same consistency spine.

### How to use it — walkthrough

**Lever one: active reference per subject.** Every character, every location, every scene character has one image marked as the active reference. Open the character or location detail page and you'll see a Previz History strip below the hero. Any image in that history can be promoted — click it, or open the Compare modal for a side-by-side view, and you're choosing which look becomes canonical. Every downstream generation that mentions that subject will use the newly active image.

**Lever two: `@` and `#` mentions in prompts.** Inside a shot description, or inside Creative Space, typing `@CharacterName` resolves to that character's active reference. Typing `#LocationName` pulls in the location's establishing image. You're telling the image model which faces and which places to use.

**Lever three: user reference uploads.** Anywhere you see an Add Reference control — character detail, location detail, Creative Space — drop in supplementary images. They become `$1`, `$2`, `$3`, and the next generation passes them through as reference inputs. Useful for face refs, mood boards, costume swatches. Models that charge for input images show the per-reference cost in the model selector.

**Lever four: style and aspect locking.** The Storyboarding toolbar carries a project-wide style — Sketch, Storyboard, HD, Anime — and a project-wide aspect ratio. Both write back to the script so every shot generation defaults to them. A single scene can override the style — say, a flashback in Sketch while the rest is HD — and the X next to the override resets it.

**Worked example.** Open a character. The portrait at the top is the active reference. Scroll to Previz History, click an older render you like better, and hit Promote in the Compare modal. That image is now the canonical face. Open the Storyboard, find a shot whose description mentions `@ThatCharacter`, and regenerate. The face that comes back is the one you just promoted — one trace through the spine, end to end.

### Director notes
- The Compare modal is the visual hero — show two images side by side and the promote-to-active click.
- For the worked example, screen-record one continuous take from character page → promote → storyboard → regenerate → new face landing.

---

## Series production notes

**Recording order recommendation.** Record Chapter 1 (Script) first — it's the foundation and the asset you create here will populate Chapters 2-8. Then Chapter 2 (Scenes), Chapter 5 (Characters), and Chapter 6 (Locations) in any order. Chapters 3 (Shots) and 4 (Storyboarding) should be recorded after a real previz generation has been run end-to-end on the demo project so the filmstrip is visually full. Chapter 7 (Creative Space) and Chapter 8 (Consistency) should be recorded last so the demo project has enough history to populate the relevant strips and Compare modals. Chapter 0 (Overview) is best recorded last, with the finished project as the visual backdrop.

**Thumbnail beats per chapter.**
- 0: the Creative Hub sidebar in focus, all chapters visible.
- 1: the screenplay editor mid-page with the amber confirm banner.
- 2: a scene card with the orange "edited" accent and the change chips.
- 3: a shot card with an `@character` mention chip glowing emerald.
- 4: the storyboard slideshow full-screen, one hero image mid-cut.
- 5: the Scene Look Editor drawer fully open, Character Ref next to Scene Look.
- 6: the location hero image at full bleed with the time-of-day chip.
- 7: the Creative Space prompt with `@`, `#`, and `$` mentions all colored.
- 8: the Compare modal showing two character looks side by side.

**Cross-reference / pinned comment language.**
- End-card of Chapter 1: "Once your script is confirmed, the Scenes page comes alive — that's the next video."
- End-card of Chapter 2: "Open any scene card and you're inside Scene Detail. The shot grid at the bottom is the topic of the Shots video."
- End-card of Chapter 3: "Shots in bulk live in the Storyboard — that's the next chapter."
- End-card of Chapter 4: "The faces inside every previz come from the Characters page — covered in the next video."
- End-card of Chapter 5: "Locations work the same way characters do — that's the next chapter."
- End-card of Chapter 6: "For anything that doesn't fit a shot row, open Creative Space — covered next."
- End-card of Chapter 7: "Every generation in Creative Space references the same consistency spine — final chapter."
- End-card of Chapter 8: "That's the full Creative Hub tour. Start at Chapter 1 if you haven't yet."

**Pinned comment template (per video):**
> Chapter N of the Creative Hub tutorial series. Each video stands alone, or you can watch the whole playlist in order. Previous: <link to N-1>. Next: <link to N+1>. Full playlist: <link>.

---

## Change log explainer_v1 → explainer_final
- Ch 0: Sidebar tour expanded to name all eight pages — added Wardrobe, Scene Reports, Risk Analyzer with one-line context for each (must-fix #1).
- Ch 0: Added a Risk Analyzer anchor sentence ("flags physical and logistical risks per scene") so the Ch 2 reference has a definition (must-fix #3 dependency).
- Ch 0: Added a one-line Platform Tour cue with screen position ("button in the bottom-right corner") (must-fix #2).
- Ch 0: Reframed Creative Space mention to acknowledge both entry routes (sidebar and Storyboarding toolbar) per faithfulness audit.
- Ch 2: Softened the "Risk Analyzer has flagged" phrasing to "have been flagged by the Risk Analyzer" + "scored for risk" descriptor on the card-reading beat, now that Ch 0 carries the anchor (must-fix #3).
- Ch 3: Cold-open now commits to Scene Detail as the primary entry path with a half-sentence gloss of what Scene Detail and Storyboard are; Storyboard demoted to a single closing cross-reference sentence (must-fix #4, standalone audit Ch 3).
- Ch 3: Removed the "Or go to Storyboarding, where every scene is a horizontal filmstrip of shots" alternative path from the getting-in beat to honor the "commit harder" adjudication.
- Ch 3: Added a one-paragraph Shot Detail modal beat naming prev/next, regenerate, and history (must-fix #5).
- Ch 3: Added a director note for opening the Shot Detail modal.
- Ch 5: Tightened the Scene Look Editor description from a three-bulleted pane breakdown to a single denser paragraph; reclaimed ~16 words to ease the 183s pacing (per-chapter note Ch 5).
- Ch 7: Tightened the parameter bar enumeration into one running paragraph instead of a four-bullet list; reclaimed ~16 words (per-chapter note Ch 7).
- Ch 8: Cold-open now adds "Every character and every location in Creative Hub has one canonical image" before naming the four levers (must-fix #8).
- Ch 8: Replaced the "anchor concept / most important action in Creative Hub" closing beat with a 15-20s worked example tracing one promote-to-active → @-mention → regenerate sequence (must-fix #6, author concern #1 adjudication).
- Ch 8: Removed the "Slow down on the anchor concept beat. Hold two seconds after the line lands" director note (must-fix #7); replaced with a continuous-take direction for the worked example.
- Runtime table recalculated from real word counts in this revision.

## Items from review NOT applied
- None. All eight must-fix items applied; all per-chapter notes applied; all three author-concern adjudications honored as written.
