# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Thuiswerk** is a Progressive Web App (PWA) for Dutch and English primary school education, featuring three standalone apps delivered as single-page HTML files:
- **Dictee** (`dictee.html`) — Spelling practice with text-to-speech; React 18 via CDN
- **Rekentoets** (`rekentoets.html`) — Arithmetic quiz; vanilla JS
- **Topografie** (`topografie.html`) — Geography/map game with SVG maps; vanilla JS

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

**Note:** Dictee is the exception — it uses React inline styles with a `COLORS` object instead of CSS variables. New apps should follow the CSS variable pattern.

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

## Adding a New App

Follow these steps to add a fourth app (e.g., `spelletje.html`):

### 1. Create the HTML file

Copy the structure of `rekentoets.html` as a starting point. Key sections:

**`<head>`** — include `shared.css`, Google Fonts, viewport + PWA meta tags:
```html
<link rel="stylesheet" href="shared.css">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#YOUR_COLOR">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="App Name">
<link rel="manifest" href="manifest.json">
```

**CSS** — define `:root` color variables + light-mode overrides:
```css
:root { --bg: …; --surface: …; --border: …; --text: …; --muted: …; --accent: …; }
html[data-theme="light"] { /* override all of the above */ }
```

**HTML screens** — use the `.screen` / `.screen.active` pattern:
```html
<div class="screen active" id="setupScreen">…</div>
<div class="screen" id="quizScreen">
  <div class="quiz-header">     <!-- add padding-left per sidebar clearance rule -->
    <span id="myTitle">App Name</span>
    …
  </div>
  …
</div>
<div class="screen" id="resultScreen">…</div>
```

**Screen switching:**
```javascript
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
```

**Before `sidebar.js`** — register the app and wire i18n:
```javascript
window.THUISWERK_APP = {
  id: 'myapp',
  theme: localStorage.getItem('thuiswerk_theme') || 'dark',
  primaryColor: '#YOUR_COLOR',
  bgColor: '#YOUR_DARK_BG',
  textColor: '#YOUR_TEXT_COLOR',
  getSettings: () => ({ /* serialize state */ }),
  applySettings: s => { /* restore state */ },
};
```

**Last line of `<body>`:**
```html
<script src="sidebar.js"></script>
```

### 2. Add i18n entries

In both `i18n-nl.json` and `i18n-en.json`, add a top-level key:
```json
"myapp": {
  "appTitle": "Mijn App",
  "startBtn": "▶ Start",
  "stopBtn": "✕ stop"
}
```

### 3. Register in `sw.js`

Add the new file to the `ASSETS` array so it's cached for offline use:
```javascript
'spelletje.html',
```

### 4. Add a launcher card in `index.html`

Follow the pattern of the existing launcher cards. Include a link to the new file and a short description.

### 5. Update `manifest.json` (optional)

Add a shortcut entry if the app should be launchable directly from the PWA icon.

---

## Adding a New Language

### 1. Create the i18n file

Copy `i18n-en.json` to `i18n-xx.json` (replace `xx` with the BCP-47 language code, e.g. `de`, `fr`). Translate all values; keep all keys identical.

### 2. Add word lists for Dictee

Create `words-xx.json` with the same grade-level structure as `words-nl.json`:
```json
{
  "grade1": ["word1", "word2", …],
  "grade2": […]
}
```

### 3. Add the language chip in `sidebar.js`

In the `render()` function, add the new chip alongside the existing NL/EN chips:
```javascript
'<button class="tw-chip lang-chip' + (lc==='de' ? ' on' : '') +
'" onclick="window._twSB.lang(\'de\')">DE</button>'
```

Also update the toggle logic that checks chip text content:
```javascript
if (c.textContent === 'DE') c.classList.toggle('on', lc === 'de');
```

### 4. Register all app files in `sw.js`

Add the new `i18n-xx.json` (and `words-xx.json` if applicable) to the `ASSETS` array.

### 5. Update each app's `applyLanguage` / `switchLang`

Each app's language-switch function assumes the i18n file exists and calls `loadI18n(lc)`. No app-specific changes are needed as long as the new file follows the same key structure.

### 6. Update `manifest.json`

If the new language becomes the primary language, update the `lang` field.

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

These exist in the codebase and should be fixed when touching the relevant file:

| Location | Issue |
|----------|-------|
| `rekentoets.html` | `THUISWERK_APP.theme` is hardcoded `'dark'`; should read from `localStorage` |
| `topografie.html` | `THUISWERK_APP` is missing `bgColor`; sidebar falls back to a generic default |
| `dictee.html` | Colors are in a React `COLORS` object instead of CSS variables; makes theming harder |
| `topografie.html` | Some map chip labels are hardcoded strings, not looked up from i18n (falls back gracefully via `applyLanguage`) |

---

## Notes

- **No build step** for the apps; only map data generation requires `npm run build`
- **Mobile-first**: All apps use responsive CSS with viewport meta tags; tested at 375px width
- **Accessibility**: Semantic HTML, ARIA labels on the menu button, Enter-key submission
- **Performance**: All assets inlined or pre-cached; no runtime external requests except CDN fonts
- **Favorites**: Saved as `{ id, app, name, settings }` with a timestamp+random UUID. Launched via `?fav={id}` URL param which each app reads on startup
