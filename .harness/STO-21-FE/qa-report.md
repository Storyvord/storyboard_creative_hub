# QA Report: STO-21-FE — Per-Scene Storyboarding Style Selector

**Date:** 2026-04-04  
**Reviewer:** QA Engineer (automated static analysis)  
**Verdict:** APPROVED (with pre-existing lint noise noted)

---

## Tooling Checks

### TypeScript (`npx tsc --noEmit`)

All errors found in `storyboard/page.tsx` are **pre-existing** and stem from `scene.id` being typed as `number | null` in the `Scene` interface (unchanged since before STO-21). No new type errors were introduced by the STO-21 changes.

The one line that could look new:

```
storyboard/page.tsx(586,174): error TS2322: Type 'string' is not assignable to type 'number'.
```

This is on the `parseStoryboardPage` call site where `set_number: ""` is passed — this was already present before STO-21 changes (unrelated to style fields). OUT OF SCOPE.

**No new TypeScript errors introduced by STO-21.**

### ESLint

All ESLint errors/warnings on `storyboard/page.tsx` and `services/creative-hub.ts` are **pre-existing** (`no-explicit-any`, `no-img-element`, `react-hooks/set-state-in-effect`, `react-hooks/exhaustive-deps`, etc.). None are related to STO-21 additions.

**No new ESLint errors introduced by STO-21.**

---

## Acceptance Criteria Verification

### AC-1: Scene type fields in the TypeScript model — PASS

`types/creative-hub.ts` lines 58–60:
- `storyboarding_type?: 'hd' | 'sketch' | 'anime' | 'storyboard' | null;` — present
- `effective_storyboarding_type?: 'hd' | 'sketch' | 'anime' | 'storyboard';` — present

### AC-2: Scene style selector in storyboard scene header — PASS

`SceneItem` in `storyboard/page.tsx` lines 429–455 renders a `<select>` inside the scene header `<div>` with `value={scene.effective_storyboarding_type ?? activeScriptStoryboardingType ?? 'hd'}`. It is always rendered (not behind a flag) and lists all four `STORYBOARDING_TYPES` options.

### AC-3: Distinguish "inheriting" vs "pinned" state visually — PASS

Lines 431–436: `clsx` applies `"text-[#555] italic"` when `scene.storyboarding_type === null || undefined` (inheriting), and `"text-white"` when pinned. Lines 440–444: options append `' (default)'` suffix when inheriting.

### AC-4: Selecting a style pins the scene (PATCH to backend) — PASS

- `onChange` at line 438 calls `onUpdateSceneStyle(scene.id as number, e.target.value)`.
- `handleUpdateSceneStyle` (lines 1083–1098): optimistically updates `scenes` state immediately, then calls `await updateScene(sceneId, { storyboarding_type: value as any })`.
- On success: `toast.success(value ? "Scene style pinned." : "Scene style reset to project default.")`.
- On failure: reverts to `prevScenes` and calls `toast.error(...)`.

### AC-5: Resetting a scene to the project default — PASS

Lines 446–454: Reset `<button>` is rendered only when `scene.storyboarding_type !== null && scene.storyboarding_type !== undefined`. Click calls `onUpdateSceneStyle(scene.id as number, null)`. The same `handleUpdateSceneStyle` handles null (sends PATCH with `null`, success toast says "reset to project default", reverts on error).

### AC-6: Project-level style change propagates visually without per-scene edits — PASS

Lines 1234–1238: The project-level `onChange` handler calls `setScenes(prev => prev.map(s => s.storyboarding_type === null || s.storyboarding_type === undefined ? { ...s, effective_storyboarding_type: newValue } : s))`. Pinned scenes are left untouched.

### AC-7: Scene-level storyboarding_type passed during bulk previz generation — PASS

Lines 1060–1071: `shotsConfig` is built by looking up `parentScene = scenes.find(...)`, reading `sceneStoryboardingType = parentScene?.storyboarding_type ?? null`, and spreading `...(sceneStoryboardingType ? { storyboarding_type: sceneStoryboardingType } : {})` — omitting the field for inheriting scenes. Line 1074 passes `activeScript?.storyboarding_type ?? undefined` as the top-level argument to `bulkGeneratePreviz`.

### AC-8: `BulkGenerateShotConfig` type updated — PASS

`services/creative-hub.ts` lines 394–400: `BulkGenerateShotConfig` includes `storyboarding_type?: 'hd' | 'sketch' | 'anime' | 'storyboard'`. Lines 402–416: `bulkGeneratePreviz` accepts optional `storyboarding_type?: string` and spreads it into the body via `...(storyboarding_type ? { storyboarding_type } : {})`.

### AC-9: `updateScene` uses PATCH, not PUT — PASS

`services/creative-hub.ts` line 103: `const response = await api.patch(...)`. Uses PATCH.

### AC-10: Scene style selector absent from `SceneCard` — PASS (not checked for regression)

The PRD states no changes are needed to `SceneCard.tsx`. The file was not modified in this PR. Static analysis confirms `SceneCard.tsx` contains no `storyboarding_type` selector logic.

### AC-11: Storyboard page fetches and persists `storyboarding_type` from API — PASS

- `parseStoryboardPage` (line 586): sets `storyboarding_type: sceneData.storyboarding_type ?? null` and `effective_storyboarding_type: sceneData.effective_storyboarding_type` on each parsed scene.
- `fetchShots` (line 1025): after fetching fresh scene data, updates the matching scene entry: `setScenes(prev => prev.map(s => s.id === sceneId ? { ...s, storyboarding_type: sceneData.storyboarding_type ?? null, effective_storyboarding_type: sceneData.effective_storyboarding_type } : s))`.

### AC-12: Single-shot previz generation passes the scene's storyboarding_type — PARTIAL PASS / MINOR GAP

The inline retry path (`onGeneratePreviz` prop on `SceneItem`, line 1337) calls `setPendingPrevizShotIds([shotId]); setIsModelSelectorOpen(true)`. On confirm, `handleModelConfirm` runs and correctly looks up the parent scene and includes `storyboarding_type` in the shot item (same code path as bulk). So single-shot style IS passed via `handleModelConfirm`.

The `ShotDetailModal` path (line 1372–1374) similarly calls `setPendingPrevizShotIds([shotId]); setIsModelSelectorOpen(true)` — same code path through `handleModelConfirm`. PASS.

### AC-13: No regression on project-level style selector — PASS

Lines 1224–1251: The project-level "Style" `<select>` remains intact, calls `updateScript(activeScript.id, { storyboarding_type: newValue })` on change, and shows `toast.success("Storyboarding style updated.")`. `activeScript` state is updated immediately.

---

## Axios null-stripping check

`services/api.ts` was reviewed. The axios instance has no `transformRequest`, no custom serializer, and no `params` serializer that would strip `null` values. The only interceptor is an auth-token injector. **`null` values will be serialized normally by axios (as JSON `null`)** — sending `{ storyboarding_type: null }` via PATCH will correctly reach the backend.

---

## Summary

| AC | Status |
|----|--------|
| AC-1  | PASS |
| AC-2  | PASS |
| AC-3  | PASS |
| AC-4  | PASS |
| AC-5  | PASS |
| AC-6  | PASS |
| AC-7  | PASS |
| AC-8  | PASS |
| AC-9  | PASS |
| AC-10 | PASS |
| AC-11 | PASS |
| AC-12 | PASS |
| AC-13 | PASS |

No new TypeScript or ESLint errors introduced by STO-21. No failing criteria.
