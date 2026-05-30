# Keyboard Shortcuts — Design Spec
**Date:** 2026-05-28

## Overview

Add a full keyboard shortcut system to Airwave covering playback, navigation, and app-wide actions. Shortcuts are discoverable via button tooltips and a `?` cheatsheet overlay.

---

## Shortcut Map

| Key | Action | Context |
|-----|--------|---------|
| `Space` | Play / Pause | Suppressed when input focused |
| `↑` | Volume +10% (clamped to 100%) | Suppressed when input focused |
| `↓` | Volume −10% (clamped to 0%) | Suppressed when input focused |
| `→` | Next station in filtered list (wraps) | Suppressed when input focused |
| `←` | Previous station in filtered list (wraps) | Suppressed when input focused |
| `M` | Mute / Unmute | Suppressed when input focused |
| `F` | Favorite current station | Suppressed when input focused; no-op if no station playing |
| `/` | Focus search input | Always fires |
| `Escape` | Clear search if focused; close cheatsheet if open | Always fires |
| `T` | Toggle theme | Suppressed when input focused |
| `?` | Open / close shortcut cheatsheet | Suppressed when input focused |

---

## Architecture

### `hooks/useKeyboardShortcuts.ts`

Single hook called from `ModernAirwave`. Registers one `keydown` listener on `document` via `useEffect`. Returns a `shortcuts` array (label + key pairs) for the cheatsheet to consume.

**Input focus guard:** Before handling any shortcut (except `Escape` and `/`), check `document.activeElement` tag — if it's `INPUT`, `TEXTAREA`, or `SELECT`, bail out.

**Options interface:**
```ts
interface KeyboardShortcutOptions {
  togglePlay: () => void;
  toggleMute: () => void;
  handleVolumeChange: (v: number) => void;
  volume: number;
  isMuted: boolean;
  playStation: (station: Station) => void;
  filteredStations: Station[];
  currentStation: Station | null;
  toggleFavorite: (station: Station) => void;
  isAuthenticated: boolean;
  setSearchTerm: (term: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement>;
  onOpenCheatsheet: () => void;
}
```

**Next/Prev logic:** Find `currentStation` index in `filteredStations`. Wrap with modulo. If no station is playing, next/prev plays `filteredStations[0]` / `filteredStations[last]`.

### `components/ui/ShortcutCheatsheet.tsx`

Modal built on the existing `Modal.tsx`. Receives `shortcuts: { label: string; keys: string[] }[]` and `isOpen`/`onClose` props. Renders three grouped sections: Playback, Navigation, App. Footer note: *"Shortcuts are disabled while typing in search."*

### Tooltips

Wrap player buttons in `PlayControl.tsx` and `VolumeControl.tsx` with the existing `tooltip.tsx` component. Tooltip content: `"Play  Space"`, `"Pause  Space"`, `"Mute  M"`, `"Unmute  M"`. No changes to the tooltip component itself.

### `ModernAirwave.tsx` changes

- Add `searchInputRef` and pass it to `SearchAndFilters` (forward ref onto the `<input>`)
- Add `isCheatsheetOpen` state
- Call `useKeyboardShortcuts(...)` with all required options
- Render `<ShortcutCheatsheet>` at the bottom of the JSX tree

### Theme toggle wiring

Theme is managed by `next-themes`. The hook calls `useTheme()` directly and toggles with `setTheme(theme === 'dark' ? 'light' : 'dark')`. No context changes needed — `useTheme` is available anywhere inside the `ThemeProvider`.

---

## Files to Create

- `hooks/useKeyboardShortcuts.ts`
- `components/ui/ShortcutCheatsheet.tsx`

## Files to Modify

- `components/MordernAirwave.tsx` — wire hook, cheatsheet, searchInputRef
- `components/station/SearchAndFilters.tsx` — accept and forward searchInputRef
- `components/player/PlayControl.tsx` — add tooltips
- `components/player/VolumeControl.tsx` — add tooltips
- No theme context changes needed — hook uses `useTheme()` from `next-themes` directly

---

## Edge Cases

- **`F` with no station playing:** no-op silently
- **`F` when not authenticated:** delegates to existing `toggleFavorite` which already handles the unauthenticated case (triggers login modal)
- **Volume clamping:** `Math.min(1, Math.max(0, volume ± 0.1))`
- **Next/prev with empty filtered list:** no-op
- **`?` while cheatsheet open:** closes it (toggle)
- **`Escape` priority:** if cheatsheet is open, close it; else if search is focused, blur/clear it
