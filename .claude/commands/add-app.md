# Add a New App

Add a new standalone app to the Thuiswerk PWA. Ask the user for any missing details before starting.

**Required information** (ask if not provided):
- App name (display name, e.g. "Spelletje")
- App id/slug (e.g. `spelletje`, used as filename, i18n key, and `THUISWERK_APP.id`)
- Accent color (hex, e.g. `#e8ff47`)
- Dark-mode background color (hex, e.g. `#161616`)
- Brief description for the launcher card

## Steps

### 1. Create `{id}.html`

Copy `rekentoets.html` as the starting point. Update:

**`<head>`** — set the theme color and app title meta tags:
```html
<meta name="theme-color" content="{accentColor}">
<meta name="apple-mobile-web-app-title" content="{name}">
```

**CSS** — replace all color variables in `:root` and `html[data-theme="light"]` to match the new app's palette. Follow the CSS variables convention from CLAUDE.md.

**`THUISWERK_APP` registration** (before `sidebar.js`):
```javascript
window.THUISWERK_APP = {
  id: '{id}',
  theme: localStorage.getItem('thuiswerk_theme') || 'dark',
  primaryColor: '{accentColor}',
  bgColor: '{bgColor}',
  textColor: '#f0f0f0',
  getSettings: () => ({ /* current state to serialize */ }),
  applySettings: s => { /* restore state */ },
};
```

Add sidebar clearance padding to the quiz header (`padding-left`) — see the sidebar button layout section in CLAUDE.md.

### 2. Create word/data list files (if the app uses word or item data)

If the app draws on a set of words or items (vocabulary, grammar words, quiz content, etc.), store that data in **separate JSON files** — one per language — rather than inlining it in the HTML. Follow the Woordflits / Grammatica pattern:

**File naming:** `{id}-nl.json`, `{id}-en.json` (or a single `{id}-data.json` for language-agnostic data)

**Loading:** add a `loadWords` function alongside `loadI18n`, cache in `window._words[lc]`, and fetch both in parallel before the app starts:

```javascript
window._words = window._words || {};

function loadWords(lc) {
  return window._words[lc]
    ? Promise.resolve(window._words[lc])
    : fetch('{id}-' + lc + '.json').then(r => r.json())
        .then(d => { window._words[lc] = d; return d; });
}

window.APP_READY = Promise.all([loadI18n(window._initLang), loadWords(window._initLang)]);
```

Also call `loadWords` whenever the language switches:
```javascript
function switchLang(lc) {
  Promise.all([loadI18n(lc), loadWords(lc)]).then(() => applyLanguage(lc));
}
// and in the thuiswerk:setLang event listener
```

Register the data files in `sw.js`:
```
'/Thuiswerk/{id}-nl.json',
'/Thuiswerk/{id}-en.json',
```

If the app has **no language-specific word data** (e.g., a pure maths or conversion app), skip this step entirely.

### 4. Add i18n entries

In **both** `i18n-nl.json` and `i18n-en.json`, add a top-level key `"{id}"` with at minimum:
```json
"{id}": {
  "appTitle": "{name}"
}
```
Add any further strings the app needs (button labels, instructions, etc.).

### 5. Register in `sw.js`

Add `'/Thuiswerk/{id}.html'` to the `ASSETS` array (word list files are handled in step 2 if applicable).

### 6. Add a launcher card in `index.html`

Follow the pattern of existing cards. Include a link to `{id}.html` and a short description.

### 7. Update `manifest.json` (optional)

Add a shortcut entry if the app should be launchable directly from the PWA icon.

### 8. Update `README.md`

Add an entry for the new app under the **Apps** section, following the pattern of the existing entries:

```markdown
### {emoji} {name} ({English name})
One or two sentences describing what the app practises, what settings are available, and any notable features.
```

### 9. Verify

- Open the app in a browser and check the setup screen renders correctly.
- Toggle dark/light theme via the sidebar and confirm colors update.
- Check the sidebar hamburger button does not overlap header content.
- Switch language and confirm i18n strings update.
