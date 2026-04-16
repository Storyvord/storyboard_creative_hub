# PRD: STO-757 — Display Reference Images on Shot Details / Previz UI

**Author:** Engineering  
**Date:** 2026-04-14  
**Status:** Draft

---

## Problem Statement

The backend Previsualization API now returns a `reference_images` array on each Previz object, containing character portraits, scene-character stills, and location images that were used when that previz was generated. Currently the frontend discards this data entirely: users opening the Shot Detail modal see the generated previz image but have no visibility into the reference material that informed it. This makes it difficult for directors to verify continuity, assess whether a re-generation is needed, or communicate reference intent to the crew. Surfacing these thumbnails directly beneath each previz — labeled by type and expandable in a lightbox — closes this feedback loop with minimal UI footprint.

---

## Acceptance Criteria

1. **AC-1 – Reference strip renders for populated previz**  
   When a Previz object in the "Previz History" grid has a non-empty `reference_images` array, a labeled thumbnail strip appears below that previz card (within `ShotDetailModal`). Each thumbnail shows the image and a type badge (`character`, `scene_character`, or `location`).

2. **AC-2 – Empty state**  
   When `reference_images` is `[]` or absent, no strip or section is shown for that previz card (no empty box or placeholder text).

3. **AC-3 – Lightbox on thumbnail click**  
   Clicking a reference thumbnail opens a fullscreen lightbox overlay (dark background) displaying the full-resolution image with the type label and, where available, alt text. Clicking outside the image or pressing Escape closes the lightbox.

4. **AC-4 – Broken image graceful degradation**  
   If a reference image URL fails to load (`onError`), the thumbnail is replaced by a muted placeholder icon (e.g., `ImageIcon` from lucide-react) with the type label still visible; the lightbox entry for that thumbnail is disabled.

5. **AC-5 – TypeScript types updated**  
   `ReferenceImage` interface is added to `/types/creative-hub.ts` and `Previsualization.reference_images?: ReferenceImage[]` is typed. No TypeScript errors (`tsc --noEmit` passes).

6. **AC-6 – Active previz header strip (left column)**  
   In the left column of `ShotDetailModal`, beneath the main previz image, a compact horizontal reference strip is shown for the active previz's `reference_images` (if any). Thumbnails are 40×40 px with type badge on hover, and are also lightbox-clickable.

7. **AC-7 – Script Previz Bank tab**  
   The same thumbnail strip logic applies to previz cards in the "Script Previz Bank" tab.

8. **AC-8 – No layout regression**  
   Existing shot-detail layout, previz history grid, camera angle / shot-type selectors, and all other sections are visually unchanged when `reference_images` is absent or empty.

9. **AC-9 – Storyboard list/gallery mini-strip (optional stretch)**  
   On the main storyboard `ShotCard` (in `storyboard/page.tsx`), if `shot.previz.reference_images` has entries, a row of up to 3 tiny avatars (24×24 px) appears below the previz thumbnail as a visual affordance. Overflow beyond 3 is indicated by a `+N` chip. Clicking opens the Shot Detail modal (existing behavior).

---

## Technical Approach

### 1. Type updates — `/types/creative-hub.ts`

Add a new interface immediately before `Previsualization`:

```ts
export interface ReferenceImage {
  type: 'character' | 'scene_character' | 'location';
  id: number;
  image_url: string;
}
```

Extend `Previsualization`:

```ts
reference_images?: ReferenceImage[];
```

No changes needed to `Shot` — it already has `[key: string]: any` and references `Previsualization`.

### 2. New component — `/components/creative-hub/PrevizReferenceStrip.tsx`

```
Props:
  images: ReferenceImage[]       // pass [] to render nothing
  size?: 'sm' | 'md'             // 'sm' = 40px (history grid), 'md' = 56px (active strip)
  className?: string
```

Responsibilities:
- Return `null` when `images.length === 0`.
- Render a horizontal flex scroll container of thumbnails.
- Each thumbnail: rounded-sm, overflow-hidden, `onError` → show `ImageIcon` placeholder.
- Type badge: absolute bottom-left, 7px text, color-coded by type  
  (`character` → emerald, `scene_character` → purple, `location` → amber).
- On click → set local state `lightboxIndex: number | null`.

Inline lightbox (no external library):
- `AnimatePresence` + `motion.div` (framer-motion already in deps).
- Fixed inset-0 z-[100] dark overlay.
- Centered `<img>` max-h-[80vh] max-w-[80vw] object-contain.
- Label below image.
- Close on overlay click or Escape keydown.
- Disabled (no click handler + reduced opacity) when image has errored.

### 3. Modify — `/components/creative-hub/ShotDetailModal.tsx`

**Import** `PrevizReferenceStrip` and `ReferenceImage`.

**Left column (active previz strip) — after `shot.image_url` img block:**

```tsx
{shot.previz?.reference_images && shot.previz.reference_images.length > 0 && (
  <div className="px-4 pb-3 border-t border-[var(--border)]">
    <p className="text-[9px] text-[var(--text-muted)] uppercase tracking-widest mb-1.5 pt-2">References</p>
    <PrevizReferenceStrip images={shot.previz.reference_images} size="md" />
  </div>
)}
```

**Previz History grid — inside each previz card, below the `p-2 border-t` meta section:**

```tsx
<PrevizReferenceStrip images={previz.reference_images ?? []} size="sm" className="px-2 pb-2" />
```

**Script Previz Bank tab — same pattern as history grid.**

### 4. Optional — `/app/projects/[projectId]/creative-hub/storyboard/page.tsx` (ShotCard)

In `ShotCard`, if `shot.previz?.reference_images?.length`, render a flex row of up to 3 × 24px thumbnails below the shot image area. Each `<img>` with `onError` fallback. A `+N` chip if overflow. No lightbox — clicking the card already opens `ShotDetailModal`.

### 5. API layer — `/services/creative-hub.ts`

No changes required. `getShotPreviz` returns the raw API response which already includes `reference_images` per item. The field will be present once the backend ships (STO-753 backend).

### 6. CSS / design tokens

All styling uses existing Tailwind utility classes and CSS variables (`--surface`, `--border`, `--text-muted`). No new design tokens needed.

---

## Edge Cases and Failure Modes

| Scenario | Handling |
|---|---|
| `reference_images` key missing entirely (older API response) | Optional chaining + `?? []` — renders nothing |
| Image URL returns 4xx/5xx | `onError` sets per-image error state; placeholder icon shown; lightbox entry disabled |
| Very long list of references (>10) | Horizontal scroll container; no grid wrap to preserve card height |
| Slow image load | Browser-native lazy loading (`loading="lazy"`) on thumbnails |
| Escape key pressed while lightbox open | `keydown` listener added on mount, removed on unmount |
| Multiple lightboxes open simultaneously | State is local to each `PrevizReferenceStrip` instance; only one can be open at a time per strip |
| `type` value unexpected / future type | Badge falls back to a neutral gray, label shows the raw type string |

---

## Out of Scope

- Adding or editing reference images from the frontend (read-only display only).
- Displaying reference images on the Locations, Characters, or Wardrobe pages.
- Fetching reference images from a separate endpoint (data comes embedded in previz object).
- Caching or prefetching reference image URLs.
- Mobile/responsive breakpoint changes (existing modal is already responsive).
- Any changes to how previz is generated or which references the backend picks.
