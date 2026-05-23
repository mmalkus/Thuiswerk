# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Thuiswerk** is a Progressive Web App (PWA) for Dutch and English primary school education, featuring three standalone apps delivered as single-page HTML files:
- **Dictee** (Spelling practice with text-to-speech)
- **Rekentoets** (Arithmetic quiz)
- **Topografie** (Geography/map learning)

The site is fully client-side with offline support via service worker. No build step required for the apps themselves; users can deploy directly or install as a PWA.

## Repository Structure

```
Thuiswerk/
├── index.html              # PWA home screen / app launcher
├── dictee.html             # Spelling practice app (React + Babel standalone)
├── rekentoets.html         # Maths quiz app (vanilla JS)
├── topografie.html         # Geography game with SVG maps (vanilla JS)
├── sidebar.js              # Shared navigation, theme, language, favorites UI
├── sw.js                   # Service worker for offline caching
├── manifest.json           # PWA metadata
├── i18n-nl.json            # Dutch UI strings (dictee, rekentoets, topo, sidebar)
├── i18n-en.json            # English UI strings
├── words-nl.json           # Dutch word lists by grade (dictee)
├── words-en.json           # English word lists by year group
├── topo-nl.json            # NL provinces, cities, rivers (GeoJSON features)
├── topo-europe.json        # European countries + capitals
├── topo-world.json         # World countries + capitals
├── topo-physical.json      # European rivers, mountains, seas
├── build/
│   ├── build.js            # Data generation: fetches Natural Earth data, processes country/province/city/river/mountain/sea features into GeoJSON
│   └── package.json        # Dependencies: topojson-client, world-atlas, i18n-iso-countries
└── icons/
    └── icon.svg            # Single app icon (maskable SVG)
```

## Architecture & Patterns

### App Structure (Dictee, Rekentoets, Topografie)

Each app is a **single self-contained HTML file** with embedded CSS and JavaScript:

1. **Initialization Block** (top of `<head>` or early `<body>`):
   - Load and cache i18n strings (`i18n-{lang}.json`)
   - Load word lists or map data (`words-{lang}.json`, `topo-*.json`)
   - Detect startup language from URL `?fav=` param, localStorage, or default
   - Set up `window.APP_READY` Promise to signal when all data is loaded

2. **Global State** (`window` namespace):
   - App config: `window.THUISWERK_APP` (id, theme, primaryColor, textColor)
   - Cached data: `window._i18n`, `window._words`, `window._mapData`
   - Sidebar integration: `window._twSB` methods (lang, setTheme, save, load, del)

3. **Rendering Approaches**:
   - **Dictee**: React 18 via CDN (Babel standalone), tabs for practice/word bank/mistakes
   - **Topografie**: Vanilla JS, screen-based (settings/game/results), SVG canvas with dynamic feature rendering
   - **Rekentoets**: Vanilla JS, collapsible settings panel, operation picker, countdown timer, result history

4. **Theme System**:
   - Dark/light controlled by `localStorage.thuiswerk_theme`
   - Applied via `html[data-theme="light"]` CSS overrides
   - Sidebar respects app's theme colors (passed in `THUISWERK_APP.primaryColor` etc.)

5. **Favorites/Settings Persistence**:
   - `localStorage.thuiswerk_favorites`: JSON array of `{ id, app, name, settings }` objects
   - Apps can serialize their state (e.g., selected language, difficulty) and restore via `?fav={id}` URL param

### Sidebar Integration (`sidebar.js`)

Injected into all three app HTML files via `<script src="sidebar.js"></script>`. Creates a **hamburger menu** with:
- Back to Home link
- Language picker (NL/EN) — writes to `localStorage.thuiswerk_lang`
- Theme picker (Dark/Light)
- Save current settings as a named favorite
- List saved favorites with delete button

The sidebar reads from `window.THUISWERK_APP` to know which app it's in, and uses `window._twSB` as the API for app interactions.

### Map Data & Topografie Architecture

**Map files** (topo-*.json) are GeoJSON FeatureCollections with properties:
```javascript
{
  "type": "FeatureCollection",
  "features": [
    {
      "id": "province_id",
      "type": "province|country|city|capital|river|mountain|sea",
      "names": { "nl": "…", "en": "…" },
      "coords": [lon, lat],    // for points (cities)
      "geometry": { … }        // for polygons/linestrings
    }
  ]
}
```

**Topografie app** implements:
- **Click mode**: Click the correct region on the map
- **Type mode**: Enter the name (fuzzy match with Levenshtein distance ≤ 2)
- SVG rendering via custom projection (Mercator or similar)
- Timer with visual progress bar (warn/danger states)
- Score tracking and results list with answer history

The build script (`build/build.js`) generates these files by fetching:
- Natural Earth 110m (world-atlas npm)
- Natural Earth 50m via Mapbox CDN (countries, rivers, mountains)
- Dutch PDOK/CBS WFS (provinces, cities)

### Build System

**Only the map data requires a build:**
```bash
cd build
npm install
npm run build
```

This outputs the four `topo-*.json` files. The apps themselves need no build; they are deployed as-is.

For offline use or local testing, all assets are listed in `sw.js` and cached on first visit.

## Internationalization (i18n)

Both `i18n-nl.json` and `i18n-en.json` contain:
```javascript
{
  "dictee": { "appTitle": "…", "tabs": { … }, … },
  "reken": { "title": "…", … },
  "topo": { "typePrompt": "…", … },
  "sidebar": { "home": "…", "language": "…", … }
}
```

Apps load their language dynamically on startup and use helper functions to access strings:
- Dictee (React): `i18n.dictee.appTitle`
- Rekentoets/Topografie: `u('key')` function looks up in `_i18n[currentLang].appName.key`

Template substitution: `t(str, val)` replaces `{key}` placeholders.

## PWA & Offline

- **manifest.json**: Defines app name, icons, shortcuts (quick-launch to Dictee, Rekentoets)
- **sw.js**: Cache-first strategy; updates cached assets on every network fetch
- **No server required**: All data is pre-packaged; users can clone/download and open `index.html` in a browser

## Storage & Data Persistence

| Key | Structure | Used By |
|-----|-----------|---------|
| `thuiswerk_lang` | `"nl" \| "en"` | All apps; set by sidebar |
| `thuiswerk_theme` | `"dark" \| "light"` | All apps; set by sidebar |
| `thuiswerk_favorites` | `[{ id, app, name, settings }, …]` | Sidebar; launched via `?fav={id}` |
| `dictee_history` | `{ word: { correct, wrong }, … }` | Dictee only; error tracking |

## Common Tasks

### Translate UI to Another Language

1. Add new language file: `i18n-xx.json` with same structure as `i18n-en.json`
2. For Dictee: add `words-xx.json` with grade levels
3. Update `sidebar.js` to add language chip
4. Update manifest.json `lang` field if needed
5. Update `sw.js` to cache the new files

### Add a Map Dataset (Topografie)

1. Create a new `topo-{region}.json` GeoJSON file with proper structure
2. Add to `sw.js` ASSETS array
3. In topografie.html, add a new chip/selection option and loader for the map
4. Update build script if data needs to be regenerated

### Modify Quiz Settings (Rekentoets/Topografie)

Settings are persisted in the favorited config. Each app serializes `settings` object when saving a favorite:
- **Rekentoets**: `{ min, max, ops: [...], timerEnabled, timerSecs, answerCheckEnabled }`
- **Topografie**: `{ mapId, mode: 'click'|'type', types: [...], timerEnabled, timerSecs, questionCount }`

When loading a favorite via `?fav={id}`, the app restores these settings.

### Style Theme Changes

Color variables are defined in each HTML's `<style>` tag `:root` block. Two sets:
- Default (dark theme)
- `html[data-theme="light"]` overrides

Apps also define app-specific colors (e.g., Dictee's blue `#3b9eff`, Rekentoets' lime `#e8ff47`). Sidebar respects these via `window.THUISWERK_APP.primaryColor`.

## Notes

- **No external JS framework** except Dictee (React via CDN). Rekentoets and Topografie are vanilla JS for small file size.
- **Mobile-first design**: All apps use responsive CSS with viewport meta tags.
- **Accessibility**: Semantic HTML, ARIA labels where needed (e.g., menu button), keyboard support (Enter to submit).
- **Performance**: Inline all assets; no external requests except CDN fonts and occasionally fetching map data during build.
- **Favorites system**: Allows users to save custom quiz configs (e.g., "Maths: 1–10 addition only"). Each favorite has a unique UUID-style `id`.

