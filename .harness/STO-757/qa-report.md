# QA Report: STO-757 — Display Reference Images on Shot Details / Previz UI

**Date:** 2026-04-14  
**Reviewer:** QA (automated)  
**Branch:** feature/creative_hub  

---

## Acceptance Criteria Results

### AC-1 — Reference strip renders for populated previz
**PASS**

`PrevizReferenceStrip` is rendered in the Previz History grid (line 695 of `ShotDetailModal.tsx`) with `images={previz.reference_images ?? []}`. The component renders a labeled thumbnail strip with per-type color-coded badges (`character` → emerald, `scene_character` → purple, `location` → amber) via `TYPE_BADGE` in `PrevizReferenceStrip.tsx`.

---

### AC-2 — Empty state
**PASS**

`PrevizReferenceStrip` returns `null` immediately when `images.length === 0` (line 39 of `PrevizReferenceStrip.tsx`). The `?? []` fallback in `ShotDetailModal.tsx` ensures a missing `reference_images` key also renders nothing.

---

### AC-3 — Lightbox on thumbnail click
**PASS**

- Clicking a thumbnail calls `setLightboxIndex(idx)` (guarded by `!hasError`).
- `AnimatePresence` + `motion.div` renders a `fixed inset-0 z-[100] bg-black/90` overlay with the full-resolution `<img>` (`max-h-[80vh] max-w-[80vw]`) and the type badge label beneath.
- Clicking the overlay background calls `closeLightbox()`.
- An `X` button also closes the lightbox.
- A `keydown` listener for `Escape` is added/removed via `useEffect` (lines 32–37).

---

### AC-4 — Broken image graceful degradation
**PASS**

`onError` handler adds the image id to an `errored` Set (line 66). When `hasError` is true:
- The `<img>` is replaced by an `ImageIcon` placeholder with muted color.
- The type badge is still visible.
- `onClick` is suppressed (`if (!hasError) setLightboxIndex(idx)`), disabling the lightbox entry.

---

### AC-5 — TypeScript types updated
**PASS**

`ReferenceImage` interface is added to `/types/creative-hub.ts` (lines 95–99) with the exact shape from the PRD (`type`, `id`, `image_url`). `Previsualization.reference_images?: ReferenceImage[]` is present at line 116. No TypeScript errors are introduced by any of the three changed files (see TypeScript section below).

---

### AC-6 — Active previz header strip (left column)
**PASS**

Lines 367–372 of `ShotDetailModal.tsx` show the active previz reference strip below the main previz image area, conditionally guarded by `shot.previz?.reference_images && shot.previz.reference_images.length > 0`. Uses `size="md"` (56px thumbnails) as specified.

---

### AC-7 — Script Previz Bank tab
**PASS**

Line 743 of `ShotDetailModal.tsx` applies `<PrevizReferenceStrip images={previz.reference_images ?? []} size="sm" className="px-2 pb-2" />` inside the Script Previz Bank tab's card loop, mirroring the history grid pattern.

---

### AC-8 — No layout regression
**PASS**

All strip usages are guarded: either by the `images.length === 0` early return in the component, or by the conditional wrapper in the left-column active strip. When `reference_images` is absent or empty, no DOM nodes are added and existing layout is unaffected.

---

### AC-9 — Storyboard list/gallery mini-strip (optional stretch)
**NOT IMPLEMENTED**

No changes to `app/projects/[projectId]/creative-hub/storyboard/page.tsx`. As this AC is explicitly marked "optional stretch" in the PRD, this is acceptable for the current ticket.

---

## TypeScript Errors

`npx tsc --noEmit` reports errors in the following files. **None are introduced by this PR.**

| File | Error | Pre-existing? |
|---|---|---|
| `components/creative-hub/SceneDetailModal.tsx` | `number \| null` not assignable to `number` (×7) | Yes — predates STO-757 commits |
| `components/creative-hub/SceneItem.tsx` | `number \| null` not assignable to `number` (×2) | Yes |
| `components/creative-hub/ScriptEditor.tsx` | `history` not in `StarterKitOptions` | Yes |
| `components/creative-hub/ShotDetailModal.tsx` | `number \| null \| undefined` not assignable to `number \| undefined` (×2) | Yes — present in pre-STO-757 commits |
| `components/creative-hub/WardrobeModal.tsx` | `File` not assignable to `string` | Yes |
| `services/creative-hub.ts` | `instanceof` left-hand side type error | Yes — introduced by STO-726-fe commit |

The three files changed by STO-757 (`types/creative-hub.ts`, `PrevizReferenceStrip.tsx`, `ShotDetailModal.tsx`) produce **zero new TypeScript errors**.

---

## Test Suite

No project-level test suite found (no `jest.config.*`, `vitest.config.*`, or `__tests__` directories outside `node_modules`). No tests to run.

---

## Summary

All 8 mandatory acceptance criteria pass. AC-9 (optional stretch) is not implemented but is explicitly out-of-scope for a passing verdict. No new TypeScript errors are introduced. No test failures.
