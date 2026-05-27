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

### 2. Add i18n entries

In **both** `i18n-nl.json` and `i18n-en.json`, add a top-level key `"{id}"` with at minimum:
```json
"{id}": {
  "appTitle": "{name}"
}
```
Add any further strings the app needs (button labels, instructions, etc.).

### 3. Register in `sw.js`

Add `'/Thuiswerk/{id}.html'` to the `ASSETS` array.

### 4. Add a launcher card in `index.html`

Follow the pattern of existing cards. Include a link to `{id}.html` and a short description.

### 5. Update `manifest.json` (optional)

Add a shortcut entry if the app should be launchable directly from the PWA icon.

### 6. Update `README.md`

Add an entry for the new app under the **Apps** section, following the pattern of the existing entries:

```markdown
### {emoji} {name} ({English name})
One or two sentences describing what the app practises, what settings are available, and any notable features.
```

### 7. Verify

- Open the app in a browser and check the setup screen renders correctly.
- Toggle dark/light theme via the sidebar and confirm colors update.
- Check the sidebar hamburger button does not overlap header content.
- Switch language and confirm i18n strings update.
