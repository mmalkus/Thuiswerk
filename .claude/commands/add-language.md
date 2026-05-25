# Add a New Language

Add a new UI language to all Thuiswerk apps. Ask the user for any missing details before starting.

**Required information** (ask if not provided):
- BCP-47 language code (e.g. `de`, `fr`)
- Display label for the sidebar chip (e.g. `DE`)
- Whether Dictee word lists need to be created for this language

## Steps

### 1. Create `i18n-{lc}.json`

Copy `i18n-en.json` to `i18n-{lc}.json`. Translate all string values; keep every key identical to the English file.

### 2. Add word lists for Dictee (if applicable)

Create `words-{lc}.json` at the repo root. Follow the same structure as `words-nl.json`:
```json
{
  "_level_labels": { "grade1": "Grade 1", … },
  "_labels": { "all": "Mixed", … },
  "grade1": { "all": ["word1", "word2", …] }
}
```
See the word list format section in CLAUDE.md or run `/add-wordlist` for details.

### 3. Add the language chip in `sidebar.js`

In the `render()` function, add the new chip alongside the existing NL/EN chips:
```javascript
'<button class="tw-chip lang-chip' + (lc==='{lc}' ? ' on' : '') +
'" onclick="window._twSB.lang(\'{lc}\')">{LABEL}</button>'
```

Update the toggle logic that refreshes chip active states:
```javascript
if (c.textContent === '{LABEL}') c.classList.toggle('on', lc === '{lc}');
```

### 4. Register new files in `sw.js`

Add to the `ASSETS` array:
```javascript
'/Thuiswerk/i18n-{lc}.json',
'/Thuiswerk/words-{lc}.json',   // if created
```

### 5. No per-app changes needed

Each app's `loadI18n(lc)` fetches `i18n-{lc}.json` automatically. As long as the file follows the same key structure, no app code changes are required.

### 6. Update `manifest.json` (optional)

If the new language becomes the primary language, update the `lang` field.

### 7. Verify

- Open each app, switch to the new language via the sidebar chip, and confirm all strings update correctly.
- Check that Dictee loads the correct word list for the new language.
