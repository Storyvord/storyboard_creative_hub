# PRD — STO-702: Black/White Theme Toggle Option

**Author:** Senior Product Engineer  
**Date:** 2026-04-10  
**Status:** Draft  

---

## 1. Problem Statement

The Creative Hub frontend is currently hardcoded to a single dark theme using inline Tailwind hex values (`#0a0a0a`, `#1a1a1a`, etc.) with no theming abstraction whatsoever. There are no CSS custom-property variants for light mode, no `darkMode` configuration in Tailwind, and no context or hook for persisting user preference. Users who work in bright environments or have accessibility needs (e.g. light-on-dark sensitivity) have no way to switch to a light theme. STO-702 asks for a toggle button in the top-right area of the Projects (Dashboard) page that lets users switch between the existing dark theme and a new light theme, with the preference persisted across sessions.

---

## 2. Acceptance Criteria

- [ ] **AC-1 — Toggle button present:** A sun/moon (or equivalent) icon button is visible in the top-right area of the header on `/dashboard`, adjacent to the existing Logout button.
- [ ] **AC-2 — Dark mode (default):** On first visit or when no preference is stored, the page renders in the current dark theme (`#0a0a0a` backgrounds, white text).
- [ ] **AC-3 — Light mode:** Clicking the toggle switches the entire page to a high-contrast light palette (white/near-white backgrounds, dark text, green accent preserved).
- [ ] **AC-4 — Toggle is bi-directional:** Clicking the toggle a second time restores the dark theme.
- [ ] **AC-5 — Persistence:** The chosen theme is saved to `localStorage` under the key `ch-theme` (`"dark"` | `"light"`) and restored on page load without a flash of the wrong theme.
- [ ] **AC-6 — No flash of unstyled content (FOUC):** Theme is applied before first paint. This requires injecting a small inline script into `<head>` in `app/layout.tsx` to read `localStorage` and set the `data-theme` attribute on `<html>` synchronously.
- [ ] **AC-7 — Scope covers the full Dashboard page:** All cards, the header, the empty-state, and the loader skeleton adopt the correct theme colours.
- [ ] **AC-8 — Accessible button:** The toggle button has an `aria-label` that reads `"Switch to light theme"` or `"Switch to dark theme"` depending on the current state.
- [ ] **AC-9 — Keyboard accessible:** The toggle button is reachable and activatable via keyboard (Tab + Enter/Space).
- [ ] **AC-10 — System preference respected on first load:** If no `localStorage` value exists, `prefers-color-scheme` media query is used to determine the initial theme.
- [ ] **AC-11 — Toggle icon updates:** The icon shown is a sun icon in dark mode (indicating "click to go light") and a moon icon in light mode (indicating "click to go dark"), using existing `lucide-react` icons (`Sun`, `Moon`).
- [ ] **AC-12 — Tailwind `dark:` variant enabled:** `tailwind.config.js` is updated with `darkMode: "class"` so Tailwind's `dark:` utilities apply when `<html>` has class `dark`.

---

## 3. Technical Approach

### 3.1 Styling System

The app uses **Tailwind CSS v3** with inline hex values hardcoded throughout. No `darkMode` key exists in `tailwind.config.js`. All colour tokens are defined as CSS custom properties in `app/globals.css` under `:root` but only in dark-mode values.

### 3.2 Changes Required

#### `tailwind.config.js`
- Add `darkMode: "class"` to enable class-based dark mode toggling.

#### `app/globals.css`
- Add a `:root` (or `[data-theme="light"]`) block defining light-mode values for all existing custom properties:
  - `--surface`, `--surface-raised`, `--surface-hover`
  - `--border`, `--border-hover`
  - `--text-primary`, `--text-secondary`, `--text-muted`
  - `--foreground-rgb`, `--background-start-rgb`, `--background-end-rgb`
  - Accent colours remain the same (`--accent: #22c55e`).
- Add a `[data-theme="dark"]` block that mirrors the current `:root` values, so the attribute-driven toggle works without a class strategy clash.

#### `app/layout.tsx`
- Inject a `<script>` tag (with `dangerouslySetInnerHTML`) inside `<head>` that reads `localStorage.getItem("ch-theme")` and, falling back to `matchMedia("(prefers-color-scheme: dark)")`, sets `document.documentElement.setAttribute("data-theme", ...)` before the body renders. This eliminates FOUC.
- Add `suppressHydrationWarning` to the `<html>` element (Next.js requirement when the attribute is set by the inline script).

#### `context/ThemeContext.tsx` (new file)
- Create a React context with `useContext` hook: `useTheme()`.
- Exposes `{ theme: "dark" | "light", toggleTheme: () => void }`.
- On mount, reads `data-theme` attribute from `document.documentElement` (already set by the inline script, so no flash).
- On toggle, updates `data-theme` on `<html>` and writes to `localStorage`.

#### `app/layout.tsx` (wrap with provider)
- Wrap `<ToastProvider>` with `<ThemeProvider>` so all pages have access.

#### `app/dashboard/page.tsx`
- Import `useTheme` from `context/ThemeContext`.
- Add a `<button>` in the `<header>` flex row (between the title and the Logout button) with `Sun` or `Moon` icon from `lucide-react`.
- Replace hardcoded hex Tailwind classes with CSS-variable-based classes or Tailwind semantic classes so colours respond to the `data-theme` attribute on `<html>`.
  - Example: replace `bg-[#0a0a0a]` → `bg-[var(--surface)]` or introduce Tailwind aliases.

### 3.3 Data Model

No backend changes. Theme preference is client-side only, stored in `localStorage["ch-theme"]`.

### 3.4 Hardcoded Colour Refactor Scope (Dashboard page only)

All Tailwind classes using inline hex colours (`bg-[#...]`, `text-[#...]`, `border-[#...]`) in `app/dashboard/page.tsx` must be replaced with `bg-[var(--surface)]` style references or equivalent semantic Tailwind tokens. This is required only for the Dashboard page for this ticket.

---

## 4. Edge Cases and Failure Modes

| Scenario | Handling |
|---|---|
| `localStorage` unavailable (private browsing, SSR) | Wrap access in `try/catch`; default to `dark`. |
| User's OS switches `prefers-color-scheme` after page load | Not auto-updated; only applied on first load when no stored preference exists. Acceptable for v1. |
| Inline script fails (CSP restriction) | Page renders with default `:root` styles (dark). Graceful degradation. |
| Next.js SSR hydration mismatch | `suppressHydrationWarning` on `<html>` prevents React from throwing; the attribute is set before React hydrates. |
| Users with JavaScript disabled | Inline script won't run; CSS `:root` defaults (dark) apply. Acceptable. |
| Toggle button in collapsed sidebar layout (`creative-hub` pages) | **Out of scope for this ticket** — the toggle only appears on `/dashboard`. |

---

## 5. Out of Scope

- Theme toggle on any page other than `/dashboard` (Creative Hub inner pages, Login page).
- Syncing theme preference to a backend user profile.
- Additional themes beyond dark and light (e.g. sepia, high-contrast).
- Auto-switching theme based on time of day.
- Animated theme transitions (CSS transitions between themes).
- Any changes to `app/login/page.tsx`.
- Any changes to the Creative Hub inner layout (`app/projects/[projectId]/creative-hub/layout.tsx`) or its child pages.

---

## 6. File Change Summary

| File | Change Type |
|---|---|
| `tailwind.config.js` | Modify — add `darkMode: "class"` |
| `app/globals.css` | Modify — add light-mode CSS variable block |
| `app/layout.tsx` | Modify — add inline script for FOUC prevention, add ThemeProvider wrapper |
| `context/ThemeContext.tsx` | **New** — theme context and `useTheme` hook |
| `app/dashboard/page.tsx` | Modify — add toggle button, replace hardcoded colours with CSS variables |
