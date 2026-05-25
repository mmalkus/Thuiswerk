# Add or Create a Word List

Create or import a custom word list for the Dictee app. Ask the user for any missing details before starting.

**Required information** (ask if not provided):
- Purpose: built-in list for a new language, or a custom importable list?
- Language code (if built-in, e.g. `de`)
- Grade/year levels and category structure (if generating content)

## Word list JSON format

```json
{
  "_level_labels": {
    "groep5": "Groep 5",
    "groep6": "Groep 6"
  },
  "_labels": {
    "all":   "Gemengd",
    "ei_ij": "ei of ij",
    "dt":    "d / dt / t"
  },
  "groep5": {
    "all":   ["fiets", "huis", "trein", "goud"],
    "ei_ij": ["fiets", "trein"],
    "dt":    ["houd", "rijdt"]
  },
  "groep6": {
    "all": ["architect", "balkon", "theater"]
  }
}
```

**Rules:**
- Keys starting with `_` are metadata; all other top-level keys are levels.
- `_level_labels` — display names for levels; raw key shown if omitted.
- `_labels` — display names for categories; raw key shown if omitted.
- `"all"` within a level is the mixed pool used when no category filter is active.
- All other keys within a level are named categories the user can filter by.
- Words should be lowercase. The app lowercases input before comparing.
- A level with only `"all"` (no named categories) is valid.

## Option A — Built-in list for a new language

1. Create `words-{lc}.json` at the repo root following the format above.
2. Add `'/Thuiswerk/words-{lc}.json'` to the `ASSETS` array in `sw.js`.
3. The `loadWords(lc)` function in `dictee.html` fetches `words-{lc}.json` automatically — no code change needed.

## Option B — Custom importable list

Generate the JSON file and provide it to the user for download. They can import it via the "📁 Import JSON" button in Dictee's Woordenbank tab. The app will persist it in `localStorage` (`dictee_custom_words`) so it survives page reloads. The user can export the current list at any time via "⬇ Export JSON".

## Tip

To start from the existing Dutch list, export it from the app ("⬇ Export JSON") and edit the result.
