# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Thuiswerk** is a Progressive Web App (PWA) for Dutch and English primary school education, featuring four standalone apps delivered as single-page HTML files:
- **Dictee** (`dictee.html`) — Spelling practice with text-to-speech; React 18 via CDN
- **Rekentoets** (`rekentoets.html`) — Arithmetic quiz; vanilla JS
- **Topografie** (`topografie.html`) — Geography/map game with SVG maps; vanilla JS
- **Woordflits** (`woordflits.html`) — Speed-reading flash cards: word flashes briefly, user types or speaks it back; vanilla JS

The site is fully client-side with offline support via service worker. No build step required for the apps themselves.

## Repository Structure

```
Thuiswerk/
├── index.html              # PWA home screen / app launcher
├── dictee.html             # Spelling practice app
├── rekentoets.html         # Maths quiz app
├── topografie.html         # Geography game with SVG maps
├── sidebar.js              # Shared navigation, theme, language, favorites UI
├── shared.css              # Sidebar structural CSS + sidebar button positioning
├── sw.js                   # Service worker for offline caching
├── manifest.json           # PWA metadata
├── i18n-nl.json            # Dutch UI strings (all apps + sidebar)
├── i18n-en.json            # English UI strings
├── words-nl.json           # Dutch word lists by grade (dictee)
├── words-en.json           # English word lists by year group
├── topo-nl.json            # NL provinces, cities, rivers (GeoJSON)
├── topo-europe.json        # European countries + capitals
├── topo-world.json         # World countries + capitals
├── topo-physical.json      # European rivers, mountains, seas
├── build/
│   ├── build.js            # Generates topo-*.json from Natural Earth + PDOK
│   └── package.json        # topojson-client, world-atlas, i18n-iso-countries
└── icons/
    └── icon.svg            # Single app icon (maskable SVG)
```

## Architecture & Patterns

### App Structure

Each app is a **single self-contained HTML file** with embedded CSS and JavaScript:

1. **Initialization block** (top of `<script>` near `</body>`):
   - Declare `window.THUISWERK_APP` before `sidebar.js` runs (sidebar reads it)
   - Load and cache i18n strings via `loadI18n(lc)`
   - Load any app data (word lists, map data)
   - Detect startup language from `?fav=` param → `localStorage.thuiswerk_lang` → `'nl'`
   - Apply language via `applyLanguage(lc)` once data is loaded

2. **Global state** (`window` namespace):
   - `window.THUISWERK_APP` — app identity for sidebar (see below)
   - `window._i18n` — cached i18n JSON, keyed by locale: `{ nl: {...}, en: {...} }`
   - `window._twSB` — sidebar API, written by `sidebar.js`

3. **Rendering approaches**:
   - **Dictee**: React 18 via CDN (Babel standalone); state-based screen switching
   - **Rekentoets / Topografie**: Vanilla JS; CSS `.active` class on `.screen` elements

4. **Theme system**:
   - `localStorage.thuiswerk_theme` → `'dark'` (default) | `'light'`
   - Applied as `html[data-theme="light"]` CSS overrides
   - Each app defines a `:root` block (dark defaults) and `html[data-theme="light"]` overrides
   - `window.THUISWERK_APP.theme` should read `localStorage.getItem('thuiswerk_theme') || 'dark'` — **not** hardcoded

5. **Favorites / settings persistence**:
   - `localStorage.thuiswerk_favorites`: `[{ id, app, name, settings }, …]`
   - Each app serializes its settings via `THUISWERK_APP.getSettings()` and restores via `THUISWERK_APP.applySettings(settings)`

### Sidebar Integration (`sidebar.js`)

Add `<script src="sidebar.js"></script>` as the **last** `<body>` script. The sidebar reads `window.THUISWERK_APP` which must be set before this script runs.

**Required `window.THUISWERK_APP` shape:**
```javascript
window.THUISWERK_APP = {
  id: 'myapp',                // unique slug; matches key in i18n files and favorites
  theme: localStorage.getItem('thuiswerk_theme') || 'dark',
  primaryColor: '#e8ff47',    // accent color for sidebar chips and buttons
  bgColor: '#161616',         // dark-mode background (used to compute sidebar surface color)
  textColor: '#f0f0f0',       // body text color
  getSettings: () => ({ /* current app state to serialize */ }),
  applySettings: (s) => { /* restore state from saved favorite */ },
};
```

The sidebar then exposes `window._twSB` with: `lang(lc)`, `setTheme(t)`, `save()`, `load(id)`, `del(id)`.

Listen for language changes with:
```javascript
window.addEventListener('thuiswerk:setLang', e => applyLanguage(e.detail));
```

### Sidebar Button Layout Clearance

The hamburger button is `position: fixed; top: 14px; left: 14px` and is ~56px wide, so it **ends ~70px from the viewport left edge**. Any header row at the top of the page must leave that space clear. Add `padding-left` to the header flex container:

- If the header is flush with the page edge: use `padding-left: 72px`
- If the header sits inside a card/container with its own left padding of `N px`, use `padding-left: (72 − N) px`

Example (topografie — header flush with edge): `.g-header { padding-left: 72px; }`
Example (rekentoets — header inside 20px container + 24px card = 44px already): `.quiz-header { padding-left: 52px; }` (44 + 52 = 96 — slightly generous to account for the 70px button width + breathing room)

When the sidebar is not present (e.g., testing standalone), the padding is harmless.

### CSS Variables Convention

Apps use CSS custom properties for all colors. Define them in `:root` for dark mode and override in `html[data-theme="light"]`:

```css
:root {
  --bg:      #0d0d0d;
  --surface: #161616;
  --border:  #2a2a2a;
  --text:    #f0f0f0;
  --muted:   #909090;
  --accent:  #e8ff47;   /* app primary color */
  --good:    #47ff8a;
  --bad:     #ff4747;
}
html[data-theme="light"] {
  --bg:      #ffffff;
  --surface: #f0f8ff;
  --border:  #b8d8f5;
  --text:    #1a3a5c;
  --muted:   #64748b;
  --accent:  #e8ff47;
}
```

The sidebar injects its own `--tw-*` variables and reads the app's `primaryColor` from `THUISWERK_APP`.

Dictee follows this convention via `--d-` prefixed variables (to avoid collisions with `--tw-` sidebar variables). The `C` constant in `dictee.html` maps semantic names to CSS variable strings (`C.blue = 'var(--d-accent)'`), so React inline styles automatically respond to theme changes through the cascade without any JS state.

## Internationalization (i18n)

### File structure

`i18n-nl.json` and `i18n-en.json` share the same shape:
```json
{
  "dictee":  { "appTitle": "✏️ Dictee", … },
  "reken":   { "title": "Rekentoets", … },
  "topo":    { "appTitle": "🗺️ Topografie", … },
  "sidebar": { "home": "Terug naar Home", … },
  "myapp":   { "appTitle": "My App", … }
}
```

Each app has its own top-level key matching `THUISWERK_APP.id` (except `reken` uses `"reken"` not `"rekentoets"`).

### Loading i18n in an app

```javascript
let lang = 'nl';
const _i18n = {};

function loadI18n(lc) {
  if (_i18n[lc]) return Promise.resolve(_i18n[lc]);
  return fetch(`i18n-${lc}.json`).then(r => r.json()).then(d => { _i18n[lc] = d; return d; });
}

function applyLanguage(lc) {
  lang = lc;
  localStorage.setItem('thuiswerk_lang', lc);
  document.getElementById('htmlRoot').lang = lc;
  document.querySelectorAll('.lang-chip').forEach(c =>
    c.classList.toggle('on', c.dataset.lc === lc));
  const d = _i18n[lc]?.myapp;
  if (!d) return;
  document.title = d.appTitle;
  document.getElementById('myTitle').textContent = d.appTitle;
  // … update all other translatable elements …
}

window.addEventListener('thuiswerk:setLang', e => {
  loadI18n(e.detail).then(() => applyLanguage(e.detail));
});
```

Template substitution: use `str.replace('{key}', value)` for dynamic values.

---

## Skills (slash commands)

Procedural tasks have dedicated slash commands defined in `.claude/commands/`. Invoke them by typing the command name; Claude will ask for any missing details before starting.

| Command | What it does |
|---|---|
| `/add-app` | Scaffolds a new standalone app — creates the HTML file, i18n entries, `sw.js` registration, and launcher card |
| `/add-language` | Adds a new UI language — i18n file, sidebar chip, `sw.js` registration, and optional Dictee word list |
| `/add-wordlist` | Creates or documents a Dictee word list (built-in for a new language, or a custom importable JSON) |

The full step-by-step instructions for each task live in the corresponding `.claude/commands/*.md` file rather than here, keeping this file focused on architecture.

---

## Map Data & Topografie Architecture

**Map files** (`topo-*.json`) are GeoJSON FeatureCollections:
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "id": "province_id",
      "type": "province|country|city|capital|river|mountain|sea",
      "names": { "nl": "Gelderland", "en": "Gelderland" },
      "coords": [5.91, 52.0],
      "geometry": { "type": "Polygon", "coordinates": […] }
    }
  ]
}
```

**Adding a new map dataset:**
1. Create `topo-{region}.json` following the structure above
2. Add to `sw.js` ASSETS array
3. In `topografie.html`, add a chip in `#mapChips` with `data-map="{region}"` and load the file in `loadMap()`
4. Add translated map name to `i18n-nl.json` and `i18n-en.json` under `topo.maps.{region}`
5. Update `build/build.js` if the data needs to be generated from source

**Topografie app features:**
- **Click mode**: Click the correct region on the SVG map
- **Type mode**: Type the name (fuzzy match, Levenshtein distance ≤ 2)
- Timer with progress bar (warn/danger color states)
- Score tracking and results list with per-question history

**Build (map data only):**
```bash
cd build && npm install && npm run build
```
Outputs the four `topo-*.json` files from Natural Earth (world-atlas npm + Mapbox CDN) and Dutch PDOK/CBS WFS data.

---

## PWA & Offline

- **`manifest.json`**: App name, icons, shortcuts to Dictee and Rekentoets
- **`sw.js`**: Cache-first strategy; updates on every network fetch. All app files, data files, and CDN assets must be listed in `ASSETS`
- **No server required**: Open `index.html` directly in a browser

---

## Storage & Data Persistence

| Key | Structure | Used By |
|-----|-----------|---------|
| `thuiswerk_lang` | `"nl" \| "en"` | All apps; set by sidebar |
| `thuiswerk_theme` | `"dark" \| "light"` | All apps; set by sidebar |
| `thuiswerk_favorites` | `[{ id, app, name, settings }, …]` | Sidebar; launched via `?fav={id}` |
| `dictee_history` | `{ word: { correct, wrong }, … }` | Dictee only |

**Settings objects per app:**
- **Rekentoets**: `{ min, max, ops: […], timerEnabled, timerSecs, answerCheckEnabled }`
- **Topografie**: `{ mapId, mode: 'click'|'type', types: […], timerEnabled, timerSecs, questionCount }`

---

## Known Inconsistencies

None outstanding. Previously noted issues have been resolved:
- All three apps now read `THUISWERK_APP.theme` from `localStorage` rather than hardcoding `'dark'`
- `topografie.html` now includes `bgColor` in its `THUISWERK_APP` registration
- `dictee.html` color system converted from a JS `COLORS` object to CSS custom properties (`--d-*`)
- Topografie map chip labels were already translated via `applyLanguage`; the hardcoded HTML is just a Dutch fallback overwritten on first load

---

## Notes

- **No build step** for the apps; only map data generation requires `npm run build`
- **Mobile-first**: All apps use responsive CSS with viewport meta tags; tested at 375px width
- **Accessibility**: Semantic HTML, ARIA labels on the menu button, Enter-key submission
- **Performance**: All assets inlined or pre-cached; no runtime external requests except CDN fonts
- **Favorites**: Saved as `{ id, app, name, settings }` with a timestamp+random UUID. Launched via `?fav={id}` URL param which each app reads on startup
