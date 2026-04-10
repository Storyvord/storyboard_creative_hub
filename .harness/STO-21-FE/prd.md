# PRD: STO-21-FE — Per-Scene Storyboarding Style Selector

**Status:** Draft  
**Author:** Senior Frontend Engineer  
**Backend ticket:** STO-21  
**Date:** 2026-04-04

---

## 1. Problem Statement

The backend now supports a per-scene `storyboarding_type` override with inheritance from the project (script) level. The frontend currently shows a single project-level "Style" selector in the storyboard toolbar that writes to `Script.storyboarding_type`. There is no way for a user to:

- Pin a specific scene to a style that differs from the project default
- See which scenes are using the project default vs. an explicit override
- Reset a scene's style back to the project default
- Have per-scene style information sent during bulk previz generation

Without these UI affordances, the backend's new inheritance system is invisible to users and the per-scene style data is never sent to `BulkGeneratePrevisualizationView`, so all shots will still be generated with the project-level style regardless of any per-scene pins.

---

## 2. Background and Data Model

The backend serializer for `Scene` now returns two new fields:

| Field | Type | Meaning |
|---|---|---|
| `storyboarding_type` | `'hd' \| 'sketch' \| 'anime' \| 'storyboard' \| null` | Raw value; `null` means "inherit from project" |
| `effective_storyboarding_type` | `'hd' \| 'sketch' \| 'anime' \| 'storyboard'` | Resolved value, always non-null |

`PATCH /api/creative_hub/scenes/{id}/edit/` accepts `storyboarding_type`:
- Send a value (`'hd'`, `'sketch'`, `'anime'`, `'storyboard'`) to pin the scene.
- Send `null` explicitly to reset to project default.

`POST /api/creative_hub/previsualization/bulk-generate/` now accepts:
- Top-level `storyboarding_type` — global batch override
- Per-shot `storyboarding_type` inside each shot item object

---

## 3. Acceptance Criteria

### AC-1: Scene type fields in the TypeScript model
- The `Scene` interface in `/types/creative-hub.ts` includes `storyboarding_type: 'hd' | 'sketch' | 'anime' | 'storyboard' | null` (optional).
- The `Scene` interface includes `effective_storyboarding_type: 'hd' | 'sketch' | 'anime' | 'storyboard'` (optional).

### AC-2: Scene style selector in the storyboard scene header
- Each `SceneItem` header (in `storyboard/page.tsx`) displays a style `<select>` showing the scene's current `effective_storyboarding_type` as the selected value.
- The selector lists the same four options as the project-level selector: HD, Sketch, Storyboard, Anime.
- The selector is always visible (not hidden by a flag), aligned with the existing metadata row (int_ext, location, time).

### AC-3: Distinguish "inheriting" vs "pinned" state visually
- When `scene.storyboarding_type` is `null` (inheriting), the selector renders with a visual cue — either a muted color, italic label, or a small badge such as "default" appended — to communicate that no explicit override is active.
- When `scene.storyboarding_type` is non-null (pinned), the selector renders in the standard active style (e.g., white text, no badge), communicating that an override is active.

### AC-4: Selecting a style pins the scene (PATCH to backend)
- When the user changes the scene's style selector, the frontend calls `PATCH /api/creative_hub/scenes/{id}/edit/` with `{ storyboarding_type: <selected value> }`.
- The scene's local state is updated optimistically (the new value is shown immediately without a full re-fetch).
- On success, a toast confirms the update (e.g., "Scene style updated.").
- On failure, the optimistic update is reverted and an error toast is shown.

### AC-5: Resetting a scene to the project default
- When a scene has a non-null `storyboarding_type` (is pinned), a small "Reset" or "x" button appears adjacent to the scene's style selector.
- Clicking Reset calls `PATCH /api/creative_hub/scenes/{id}/edit/` with `{ storyboarding_type: null }`.
- After a successful reset, `scene.storyboarding_type` returns to `null` and the selector reverts to showing `effective_storyboarding_type` with the "inheriting" visual cue.
- On failure, the optimistic state is reverted and an error toast is shown.

### AC-6: Project-level style change propagates visually without per-scene edits
- When the user changes the project-level style in the toolbar, scenes where `storyboarding_type === null` (inheriting) immediately reflect the new effective style without requiring a page reload or manual per-scene update.
- Pinned scenes (non-null `storyboarding_type`) are unaffected by project-level style changes in the UI.

### AC-7: Scene-level storyboarding_type is passed during bulk previz generation
- In `handleModelConfirm` (storyboard page), when building `shotsConfig`, each shot item includes `storyboarding_type` derived from the shot's parent scene: use `scene.storyboarding_type` if non-null (pinned), otherwise omit the field (let the backend inherit from the top-level default or script).
- The top-level `storyboarding_type` sent in `bulkGeneratePreviz` payload remains derived from `activeScript.storyboarding_type` (unchanged behavior).

### AC-8: `BulkGenerateShotConfig` type updated
- The `BulkGenerateShotConfig` interface in `services/creative-hub.ts` includes an optional `storyboarding_type?: 'hd' | 'sketch' | 'anime' | 'storyboard'` field.
- The `bulkGeneratePreviz` function signature accepts an optional top-level `storyboarding_type` param and passes it in the request body alongside the shots array.

### AC-9: `updateScene` uses PATCH, not PUT
- The `updateScene` function in `services/creative-hub.ts` is changed from `api.put` to `api.patch` to match the backend's supported method for partial updates (including nullable `storyboarding_type`).

### AC-10: Scene style selector is absent from `SceneCard` (scene list page)
- The scene card component used in the Scenes list page (`/scenes/page.tsx` via `SceneCard.tsx`) does not need a style selector — that page is read-only navigation. Style management happens exclusively on the Storyboard page.

### AC-11: Storyboard page fetches and persists `storyboarding_type` from the API response
- In `parseStoryboardPage`, the parsed `Scene` object includes `storyboarding_type` and `effective_storyboarding_type` from the API response.
- In `fetchShots` (which re-fetches a single scene's storyboard data), the scene's `storyboarding_type` and `effective_storyboarding_type` fields are preserved when refreshing shots — the scene metadata in `scenes` state is updated, not replaced with stale data.

### AC-12: Single-shot previz generation passes the scene's storyboarding_type
- When `onGeneratePreviz` is called for a single shot (from both the shot card retry button and `ShotDetailModal`), the `bulkGeneratePreviz` call for that single shot includes the parent scene's `storyboarding_type` (if pinned) in the shot item.

### AC-13: No regression on project-level style selector
- The existing project-level "Style" selector in the toolbar continues to save to `Script.storyboarding_type` via `updateScript`.
- Changing the project-level style still shows a success toast and updates `activeScript` state.

---

## 4. Technical Approach

### 4.1 Types — `/types/creative-hub.ts`

Add to the `Scene` interface:

```ts
storyboarding_type?: 'hd' | 'sketch' | 'anime' | 'storyboard' | null;
effective_storyboarding_type?: 'hd' | 'sketch' | 'anime' | 'storyboard';
```

### 4.2 Service layer — `/services/creative-hub.ts`

**`updateScene`:** Change `api.put` to `api.patch`. The existing signature (`Partial<Scene>`) already allows sending just `{ storyboarding_type: null }`.

**`BulkGenerateShotConfig`:** Add `storyboarding_type?: 'hd' | 'sketch' | 'anime' | 'storyboard'`.

**`bulkGeneratePreviz`:** Add optional `storyboarding_type?: string` parameter. Include it in the request body as a top-level key when provided.

### 4.3 Storyboard page — `/app/projects/[projectId]/creative-hub/storyboard/page.tsx`

**`parseStoryboardPage`:** When constructing each `Scene` object in the `forEach`, read `sceneData.storyboarding_type` and `sceneData.effective_storyboarding_type` and include them on the object.

**`fetchShots`:** After fetching fresh scene data, update the matching scene in `scenes` state with the fresh `storyboarding_type` / `effective_storyboarding_type` values (currently, only `shotsMap` is updated; scene metadata is not refreshed).

**`handleBulkGeneratePreviz` / `handleModelConfirm`:** When building `shotsConfig`, look up each shot's parent scene. If the scene has a non-null `storyboarding_type`, add it to the shot item. Pass `activeScript.storyboarding_type` as the top-level `storyboarding_type` to `bulkGeneratePreviz`.

**`handleGeneratePrevizForShot` (single-shot path):** Both the inline retry path (`onGeneratePreviz` prop on `SceneItem`) and the `ShotDetailModal` path already call `bulkGeneratePreviz` with a single-shot array. Update these call sites to look up the parent scene and include `storyboarding_type` on the shot item.

**`SceneItem` component (local, defined in this file):** Add a per-scene style selector to the scene header row. The component already receives the `scene` prop with all fields.

- Add a handler prop `onUpdateSceneStyle: (sceneId: number, value: string | null) => void` to `SceneItemProps`.
- In the header `<div>` (after the shot count badge), render:
  - A `<select>` pre-populated with `STORYBOARDING_TYPES`.
  - Set its value to `scene.effective_storyboarding_type ?? activeScript?.storyboarding_type ?? 'hd'`.
  - Apply muted styling when `scene.storyboarding_type === null` (inheriting).
  - A "Reset" button (only rendered when `scene.storyboarding_type !== null`) that calls `onUpdateSceneStyle(scene.id, null)`.

**`StoryboardPage` component:** Implement `handleUpdateSceneStyle`:

```ts
const handleUpdateSceneStyle = async (sceneId: number, value: string | null) => {
  // Optimistic update in scenes state
  setScenes(prev => prev.map(s =>
    s.id === sceneId
      ? { ...s, storyboarding_type: value as any, effective_storyboarding_type: (value ?? activeScript?.storyboarding_type ?? 'hd') as any }
      : s
  ));
  try {
    await updateScene(sceneId, { storyboarding_type: value as any });
    toast.success(value ? "Scene style pinned." : "Scene style reset to project default.");
  } catch (err) {
    // Revert
    setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, storyboarding_type: undefined } : s));
    toast.error(extractApiError(err, "Failed to update scene style."));
  }
};
```

Pass `onUpdateSceneStyle={handleUpdateSceneStyle}` to each `<SceneItem>`.

**Project-level style change propagation (AC-6):** When `activeScript.storyboarding_type` changes (existing `onChange` handler), update inheriting scenes in local state:

```ts
setScenes(prev => prev.map(s =>
  s.storyboarding_type === null || s.storyboarding_type === undefined
    ? { ...s, effective_storyboarding_type: newValue as any }
    : s
));
```

### 4.4 No changes needed
- `SceneCard.tsx` — scene list page card, no style UI needed.
- `SceneDetailModal` / `ShotDetailModal` — no changes needed for style management.
- `ModelSelector` — no changes needed.
- State management approach is local `useState` throughout (no Redux/Zustand/Context); this change follows the same pattern.

---

## 5. Edge Cases

| Case | Handling |
|---|---|
| Scene API response lacks `effective_storyboarding_type` (old backend) | Fall back to `scene.storyboarding_type ?? activeScript?.storyboarding_type ?? 'hd'` |
| `activeScript` is null when a scene style change is triggered | Guard with early return; disable selector until script is loaded |
| User changes project style while a scene PATCH is in-flight | The PATCH completes independently; project style change updates only scenes still in null state |
| Bulk generate triggered before any scenes are loaded | Existing guard `if (selectedSceneIds.size === 0 && selectedShotIds.size === 0) return` prevents this |
| Paginated scenes not yet loaded still need correct per-scene style in bulk generate | Bulk generate only acts on `selectedShotIds` derived from `shotsMap`, which only has data for loaded pages; this is pre-existing behaviour and out of scope |
| Reset sends `null` via PATCH — axios may strip `null` values | Verify that the `api` axios instance does not have a `transformRequest` that strips nulls; if so, explicitly serialize to JSON |

---

## 6. Out of Scope

- Per-scene style selector on the `/scenes` list page (read-only, navigation only).
- Adding storyboarding_type to `Shot` level (backend does not support shot-level style; scenes is the finest granularity).
- Surfacing `effective_storyboarding_type` in the `ShotDetailModal` or shot card.
- Migrating existing previz images when a scene style is changed (regeneration is a separate user action).
- Pagination edge case: applying per-scene style to shots in pages not yet loaded during bulk generate (pre-existing limitation).
- Any changes to the character/location/wardrobe pages.
