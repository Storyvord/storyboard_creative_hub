# Explainer Script Review

## Verdict
SHIP WITH PATCHES

The script has cleanly exited brand-film mode and now reads like a calm, competent product walkthrough. Cold-opens orient a fresh viewer in almost every chapter, the filmmaker register is intact, and the catalog claims are largely faithful. The blockers are surgical: Chapter 0's sidebar tour silently omits three real sidebar items (Wardrobe, Scene Reports, Risk Analyzer), Chapter 8 ends on an opinion line ("the most important action in Creative Hub") that doesn't belong in a tutorial register, and a handful of small accuracy slips need tightening. Patch those and it's a ship.

## Standalone-ness audit (one line per chapter)
- Ch 0: Y — names what Creative Hub is and where it lives inside a Storyvord project; a fresh viewer can follow.
- Ch 1: Y — opens by naming the page and its job; no dependency on Ch 0.
- Ch 2: Y — re-establishes "production-board view of your screenplay"; cold-open works.
- Ch 3: Y, but soft — viewer is told shots live "inside Scene Detail and inside the Storyboard" without yet knowing what either is. A one-clause gloss ("Scene Detail is the per-scene page; Storyboard is the visual board for the whole film") would close the gap.
- Ch 4: Y — "the visual board for the whole film" plants the flag fast.
- Ch 5: Y — global-vs-scene distinction lands in the cold-open.
- Ch 6: Y — and the "what's wired up vs placeholder" promise is a strong standalone hook.
- Ch 7: Y — "free-form image studio inside Creative Hub" is enough to orient.
- Ch 8: Partial — cold-open names the problem ("AI image generators drift") well, but then leans on subjects the viewer may not have met (active reference, scene character). A one-line "every character and every location has one canonical image" up front would help.

## Faithfulness audit

- **Ch 0 sidebar omission (must-fix).** The catalog's sidebar order is Script → Scenes → Characters → Locations → **Wardrobe** → Storyboarding → **Scene Reports** → **Risk Analyzer**. The Ch 0 tour walks Script, Scenes, Characters, Locations, Storyboarding, Creative Space. Wardrobe, Scene Reports, and Risk Analyzer are real sidebar entries — silently dropping them from the overview is misleading for a viewer who lands on Ch 0 and then can't map the named pages to what they actually see. Either add a one-line acknowledgement ("Wardrobe, Scene Reports, and Risk Analyzer also live in the sidebar — we'll point at them in context when they come up") or list all eight.
- **Ch 0 "Creative Space" sidebar claim.** The catalog lists Creative Space access via a button on the Storyboarding toolbar and (per Ch 7) the sidebar. Confirm Creative Space is actually a sidebar item; the catalog's sidebar list does not include it explicitly. If it's only reachable from Storyboarding + a direct route, soften "lists every page in the order you'll touch them" to match reality.
- **Ch 2 Risk Analyzer mention.** "which scenes the Risk Analyzer has flagged" is correct per the catalog, but the script never explains what the Risk Analyzer is in Ch 0 or anywhere — so a viewer hearing "Risk Analyzer" twice in Ch 2 has no anchor. Either drop the proper-noun reference and say "scored for risk," or add a half-sentence in Ch 0.
- **Ch 3 "drag across scenes" claim.** Catalog confirms "Drag-and-drop reorder (within scene and across scenes)" — fine.
- **Ch 3 `@` autocomplete.** Script says the dropdown lists "every character in this scene plus every global character." Catalog confirms "scene characters + global characters" — accurate.
- **Ch 4 style override per scene.** Script says "useful for, say, putting a flashback in Sketch while the rest of the script is HD" — catalog uses the same example almost verbatim. Accurate.
- **Ch 5 "sorted by appearance count."** Catalog confirms "sorted by appearance count from `script.analysis.character_appearances`."
- **Ch 5 reference upload syntax.** Script says references appear as `$1`, `$2` on the Character page — catalog confirms this is the pattern. Accurate.
- **Ch 6 establishing image promotion.** Script says "Compare modal lets you set an older image back to active" — catalog confirms `setActiveSubjectPreviz` via Compare. Accurate.
- **Ch 7 model selector cost detail.** Script says "credits-per-image cost shown next to the name." Catalog confirms `credits_per_image`, plus `credits_per_input_image` for reference-cost models. Script's later line "Models that charge for input images will show the per-reference cost in the model selector" (Ch 8) is a nice catch — accurate.
- **Ch 7 reload-resume claim.** Catalog confirms `getLatestTaskStatus` resumes spinner on reload. Accurate.
- **Ch 8 "anchor concept" line (must-fix as faithfulness AND register issue).** "Promoting an image to active reference is the most important action in Creative Hub" — this is the author's editorial claim, not a feature-catalog fact. The catalog frames `setActiveSubjectPreviz` as the consistency atom but does not rank it against other actions. In a tutorial register, drop the superlative.

## Tutorial register check

- **Ch 8 closing: "the most important action in Creative Hub."** Brand-film drift — a thesis line dressed as a tutorial beat. Replace with something descriptive: "Promoting an image to active reference is the single switch every other consistency mechanism reads from. When you change it, the next generation everywhere downstream picks up the new look."
- **Ch 8 "The anchor concept."** The phrase itself is fine in a tutorial, but pairing it with "Slow down on the anchor concept beat. Hold two seconds after the line lands" in the director notes is a held-visual brand-film holdover. Tutorial videos run continuous narration; remove the hold.
- **Ch 5 "that visual sells the chapter."** Director-note phrasing only — not narrated — but the same instinct ("the signature beat") shows up in Ch 2, Ch 4, Ch 7. Fine as production notes, no change needed.
- **Ch 4 "have everyone looking at the same movie."** Slightly thesis-y but reads as filmmaker idiom, not brand-film drift. Keep.
- **No SaaS-isms found** ("optimize," "leverage," "streamline," "stakeholders," "solutions") — clean.
- **No "click X" / UI readback found.** The script narrates intent throughout (e.g. "Hit Confirm Script" not "Click the green Confirm Script button"). Strong.
- **"Three people. One film." / silent climax beats** — none found. The kill was clean.

## Coverage gaps

- **Wardrobe as a sidebar destination.** The script handles wardrobe via the Scene Look Editor inside Ch 5, which is correct, but never tells the viewer that there is also a top-level Wardrobe page in the sidebar. A one-line acknowledgement somewhere (Ch 0 or Ch 5) would prevent a viewer from feeling lost when they see the sidebar item.
- **Risk Analyzer.** Referenced twice in Ch 2 with no explainer anywhere. Either name it in passing in Ch 0, or change Ch 2's references to a generic "risk score."
- **Scene Reports.** Not mentioned at all. If deprioritized intentionally (it is), at least name it in Ch 0 as "there's also a Scene Reports page in the sidebar — that's its own video."
- **Platform Tour.** The catalog mentions a floating Platform Tour button mounted in `creative-hub/layout.tsx`. The script never points at it. For a Ch 0 viewer specifically, this is exactly the discoverability cue they'd want — "if you ever get lost, the Platform Tour button in the bottom-right re-runs this orientation."
- **ShotDetailModal.** Not mentioned. Catalog flags it explicitly as a per-shot full-screen view with prev/next, regenerate, edit, and history. Reasonable to defer to a future video, but worth one breath in Ch 3 ("Click a shot card to open the detail view — full-screen image, prev/next, regenerate with a different model").
- **Risk Findings callout on Scene Detail.** Ch 2 names "a Risk Findings callout if any" — that's fine — but with no context for what Risk Analyzer is, the viewer can't act on it.

## Per-chapter notes (concise — only flag what's wrong or weak)

### Ch 0 — Overview
- Sidebar list omits Wardrobe, Scene Reports, Risk Analyzer (see Faithfulness audit). Either acknowledge them or list all.
- Add one line for the Platform Tour button — that's the natural Ch 0 cue.
- "Creative Space is the freeform image studio for everything that doesn't fit a shot row" is a clean one-liner. Keep.

### Ch 1 — Script
- Walkthrough is concrete and accurate. No notes.
- Tip on FDX round-trip is gold for a filmmaker audience. Keep.

### Ch 2 — Scenes
- Drop "Risk Analyzer" proper noun in favor of "risk score" unless you add a Ch 0 explainer.
- The sync-state color description (orange edited, red deleted, dashed phantom) is excellent — that's the chapter's hero detail.

### Ch 3 — Shots
- Standalone-ness: add a half-sentence reminder of what Scene Detail and Storyboard are, since this chapter sits inside both.
- See author concern #2 below — commit to one entry path (Scene Detail) as the primary, Storyboard as the cross-reference.
- Consider naming ShotDetailModal in one line.

### Ch 4 — Storyboarding
- Strongest chapter. No notes.

### Ch 5 — Characters
- Pacing is tight for 183s. The Scene Look Editor three-pane description is dense — consider trimming one of the pane descriptions or splitting the wardrobe-category list across visual + narration.
- Otherwise accurate and complete.

### Ch 6 — Locations
- The candor section is well-judged (see author concern #3). Keep.
- "Each location is the hero image on every Scene Detail page that uses it" is accurate per the catalog. Good cross-link.

### Ch 7 — Creative Space
- Long at 183s. The parameter-bar enumeration could be tightened — viewer doesn't need to hear all eight aspect ratios named again if they've already heard them in Ch 4. Standalone caveat: if Ch 7 must stand alone, keep the ratios. Compromise: "the same eight aspect ratios as the storyboard" is what the script already does — good.
- "Reload-resume" beat is a strong killer-detail moment. Keep.

### Ch 8 — Consistency
- See author concern #1 below.
- Kill the "most important action in Creative Hub" line.
- Kill the "hold two seconds after the line lands" director note — that's brand-film grammar.

## Author's three concerns — adjudicated

1. **Ch 8 framing — four levers with `setActiveSubjectPreviz` as anchor.** *Mostly works, with one change.* The four-levers framing is genuinely useful — it gives the viewer a mental model that a worked example alone wouldn't. Keep the structure. But replace the closing "anchor concept" beat with one concrete 15-20s worked example: "Open a character. The portrait you see is the active reference. Open Previz History, click an older render, hit Promote. Now generate a shot that mentions @ThatCharacter. The new face is the one you just promoted." That gives the viewer a single trace through all four levers and grounds the abstraction. Also drop the "most important action" superlative — describe what it does, don't rank it.

2. **Ch 3 shots standalone — Scene Detail vs Storyboard.** *Commit harder to Scene Detail as primary.* Right now the chapter splits attention across both surfaces in 160 seconds and the viewer ends up with two half-tours. Make Scene Detail the canonical entry ("Open a scene from the Scenes page, scroll to the bottom — that's where shots live"). Mention Storyboard as the bulk/cross-scene view in one sentence and defer the rest to Ch 4. The chapter then has room to actually demonstrate `@` mention, inline edit, and the drag-reorder properly.

3. **Locations candor — naming placeholders explicitly.** *Right level. Keep as written.* For a public YouTube tutorial aimed at working filmmakers, this is the single best trust move in the whole script. A filmmaker who watches Ch 6, hits the binder section, sees "Demo data" pills, and the video predicted it — that's a filmmaker who trusts the rest of the series. The current phrasing ("layout-only placeholders pending backend support... use the page today for visuals and references; treat the binder fields as a preview") is calibrated correctly. Not too candid, not too vague.

## Deprioritized features — promote any?

- **Risk Analyzer: promote to a one-line acknowledgement in Ch 0, no dedicated video.** It's referenced twice in Ch 2 with no anchor — that's the actual problem. A 10-second beat in Ch 0 ("Risk Analyzer flags physical and logistical risks per scene — that's its own video") fixes it without bloating the series.
- **Wardrobe (as standalone): keep out, but name it in Ch 0.** The Scene Look Editor coverage in Ch 5 is enough to use the product. But the sidebar item exists, so Ch 0 owes the viewer a sentence.
- **Scene Reports: keep out, but name it in Ch 0.** Same logic — sidebar entry, no walkthrough needed in v1.
- **Platform Tour: promote to a 10-second beat in Ch 0.** This is the lowest-cost, highest-value addition. It's literally a button that re-runs the orientation the viewer is already watching.
- **ShotDetailModal: promote to one sentence in Ch 3.** Real per-shot interaction surface; current omission means a Ch 3 viewer doesn't know how to open a single shot in detail.

## Must-fix list for next pass

1. Ch 0: name Wardrobe, Scene Reports, Risk Analyzer in the sidebar tour (or list all eight pages and group the ones we're not covering).
2. Ch 0: add a one-line Platform Tour mention as a Ch 0-native cue.
3. Ch 2: drop or contextualize the proper-noun "Risk Analyzer" references.
4. Ch 3: commit to Scene Detail as the primary entry; demote Storyboard to a single cross-reference sentence.
5. Ch 3: add a one-sentence ShotDetailModal acknowledgement.
6. Ch 8: replace the "most important action in Creative Hub" closing with a concrete worked example.
7. Ch 8: remove the "hold two seconds after the line lands" director note (brand-film grammar).
8. Ch 8: cold-open could use one extra line establishing "every character / every location has one canonical image" before naming the four levers.

## What this script does well

- **Cold-open discipline.** Every chapter starts by naming the page and the job in one sentence — exactly the orientation a search-arrival viewer needs.
- **Filmmaker register held throughout.** "Hand a deck to your DP and your producers," "the unit of coverage," "round-trips back to FDX so Final Draft users can keep working in their tool of choice" — these are written by someone who has read a call sheet.
- **Concrete keyboard shortcuts and exact UI states.** ⌘1-7, the amber confirm banner, the emerald drop indicator, the `$1`/`$2` reference chips — viewers can verify what they're seeing.
- **Honesty on Locations.** The "Demo data" callout is the single best trust move in the script. Don't soften it.
- **Outputs sections.** Closing each walkthrough with "outputs" — a saved screenplay, an ordered list of shot rows, a previz image per shot — gives the viewer a clean mental contract for what the page produces. That's a Linear-style move, used well.

## Final direction

Make the eight must-fix patches above — they're all surgical, none touch the structure. The biggest single change is Ch 8: trade the "most important action" superlative for a concrete 15-second worked example, and the chapter goes from "almost a tutorial" to "actually a tutorial." Ch 0 needs the sidebar honesty patch so the rest of the series doesn't quietly contradict it. Everything else is already on the right side of the line.
