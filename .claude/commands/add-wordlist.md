# Add or Create a Word List

Create or import a word list for Dictee (spelling practice), Woordflits (word flash), or Grammatica (grammar classification). Ask the user for any missing details before starting.

**Required information** (ask if not provided):
- Which app: **Dictee**, **Woordflits**, or **Grammatica**?
- Language code (e.g. `nl`, `en`, `de`)
- For Dictee: grade/year levels and whether to include spelling categories
- For Woordflits: word length range (default 3–8+)
- For Grammatica: no extra info needed (format is fixed: `noun`/`verb`/`adj` categories)

---

## Step 1 — Find a reference list on the internet

**Always start here.** Fetch real word lists rather than generating words from memory. Generated lists tend to contain truncated words, non-existent words, and English mixed in.

### Dutch (`nl`)

| Source | URL | Best for |
|--------|-----|----------|
| OpenTaal approved base words | `https://raw.githubusercontent.com/OpenTaal/opentaal-wordlist/master/elements/basiswoorden-gekeurd.txt` | Verified real Dutch words (lemmas) |
| Dutch frequency top-50k | `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/nl/nl_50k.txt` | Sorting by commonness |
| Dutch nouns (with articles) | `https://raw.githubusercontent.com/bzdgn/dutch-vocabulary/master/contents/01_WOORDEN.txt` | Verified Dutch nouns for Grammatica |
| Dutch verbs (conjugation table) | `https://raw.githubusercontent.com/bzdgn/dutch-vocabulary/master/contents/02_WERKWOORDEN.txt` | Verified Dutch verbs for Grammatica |
| Dutch adjectives/adverbs | `https://raw.githubusercontent.com/bzdgn/dutch-vocabulary/master/contents/03_ADJ_ADVB.txt` | Verified Dutch adjectives for Grammatica (filter out adverbs/prepositions) |

**Cross-reference both:** a word that appears in the OpenTaal list (verified real) AND in the frequency list (commonly used) is ideal for educational use.

### English (`en`)

| Source | URL | Best for |
|--------|-----|----------|
| English frequency top-50k | `https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/en/en_50k.txt` | Common English words with frequencies |
| English word list (SCOWL) | `https://raw.githubusercontent.com/en-wl/wordlist/master/alt12dicts/2of12inf.txt` | Verified dictionary words |
| English nouns (frequency-ranked) | `https://raw.githubusercontent.com/david47k/top-english-wordlists/master/top_english_nouns_lower_10000.txt` | Top 10k English nouns for Grammatica |
| English verbs (frequency-ranked) | `https://raw.githubusercontent.com/david47k/top-english-wordlists/master/top_english_verbs_lower_10000.txt` | Top 10k English verbs for Grammatica |
| English adjectives (frequency-ranked) | `https://raw.githubusercontent.com/david47k/top-english-wordlists/master/top_english_adjs_lower_10000.txt` | Top 10k English adjectives for Grammatica |

### Other languages

The hermitdave/FrequencyWords repository has 50k-word frequency lists for many languages:
`https://raw.githubusercontent.com/hermitdave/FrequencyWords/master/content/2016/{lc}/{lc}_50k.txt`

OpenTaal has Dutch only. For other languages, search GitHub for `{language} wordlist` or `{language} spellcheck dictionary` (Hunspell/Aspell sources are well-curated).

### Frequency list format

```
word  count
het   5706767
een   4077605
```

Filter out non-alphabetic entries (numbers, hyphens, apostrophes). In Python:
```python
import re
dutch_alpha = re.compile(r'^[a-zàáâçèéêëîïôùúûüÿ]+$')
words = [parts[0].lower() for line in open('freq.txt')
         if (parts := line.split()) and dutch_alpha.match(parts[0].lower())]
```

---

## Dictee word list format (`words-{lc}.json`)

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

### Building Dictee word lists from internet sources

1. Fetch the frequency list and the verified wordlist for the language.
2. Cross-reference: keep only words present in both.
3. For Dutch, assign words to grade levels by length and complexity:
   - groep 3–4: 3–5 letter words, CVC patterns, no rare diacritics
   - groep 5–6: 5–8 letter words, common compound words
   - groep 7–8: 7–12 letter words, longer compounds, loanwords
4. For Dutch spelling categories, filter by pattern:
   - `ei_ij`: words containing `ei` or `ij`
   - `dt`: words with `dt`, `d` or `t` endings (regular verb forms)
   - `au_ou`: words containing `au` or `ou`
   - `open_closed`: words with open vs. closed syllable doubling (e.g. `lopen`, `lopen` vs `liggen`)
5. Each category word must also appear in `all` for that level.

### Option A — Built-in list for a new language

1. Create `words-{lc}.json` at the repo root following the format above.
2. Add `'/Thuiswerk/words-{lc}.json'` to the `ASSETS` array in `sw.js`.
3. The `loadWords(lc)` function in `dictee.html` fetches `words-{lc}.json` automatically — no code change needed.

### Option B — Custom importable list

Generate the JSON file and provide it to the user for download. They can import it via the "📁 Import JSON" button in Dictee's Woordenbank tab. The app persists it in `localStorage` (`dictee_custom_words`). The user can export the current list at any time via "⬇ Export JSON".

**Tip:** To start from the existing Dutch list, export it from the app ("⬇ Export JSON") and edit the result.

---

## Woordflits word list format (`wordflits-{lc}.json`)

```json
{
  "3": ["aap", "bal", "dag"],
  "4": ["auto", "boot", "fiets"],
  "5": ["avond", "brood", "feest"],
  "6": ["achter", "bakker", "camera"],
  "7": ["afstand", "bedankt", "eerlijk"],
  "8": ["aandacht", "belangrijk", "helemaal"]
}
```

**Rules:**
- Keys are the word-length bucket shown in the UI (e.g. `"8"` can hold words of 8–12 letters).
- Words are shown one at a time for a brief flash; the child types or speaks it back.
- Lowercase only. No spaces, hyphens, or punctuation.
- Aim for 150–250 words per bucket; more is fine.

### Building Woordflits word lists from internet sources

```python
import re, json

dutch_alpha = re.compile(r'^[a-zàáâçèéêëîïôùúûüÿ]+$')

# 1. Load verified wordlist (original case preserved)
with open('basiswoorden.txt') as f:
    verified = set(line.strip() for line in f)

# 2. Load frequency list, take only verified + alphabetic words in rank order
freq_words = []
with open('freq50k.txt') as f:
    for i, line in enumerate(f):
        parts = line.split()
        if parts:
            w = parts[0].lower()
            if dutch_alpha.match(w) and w in verified:
                freq_words.append(w)  # list is already most-common-first

# 3. Bucket by length, take most-common N for each bucket
buckets = {'3':[], '4':[], '5':[], '6':[], '7':[], '8':[]}
for w in freq_words:
    n = len(w)
    if 3 <= n <= 7:
        buckets[str(n)].append(w)
    elif 8 <= n <= 12:
        buckets['8'].append(w)

targets = {'3':200, '4':250, '5':220, '6':200, '7':200, '8':200}
result = {k: sorted(v[:targets[k]]) for k, v in buckets.items()}
```

### Option C — Built-in list for a new language

1. Create `wordflits-{lc}.json` at the repo root following the format above.
2. Add `'/Thuiswerk/wordflits-{lc}.json'` to the `ASSETS` array in `sw.js`.
3. The `loadWords(lc)` function in `woordflits.html` fetches `wordflits-{lc}.json` automatically — no code change needed.

---

## Grammatica word list format (`grammatica-{lc}.json`)

```json
{
  "noun": ["hond", "kat", "boom", "..."],
  "verb": ["lopen", "eten", "springen", "..."],
  "adj":  ["groot", "klein", "warm", "..."]
}
```

**Rules:**
- Exactly three keys: `noun`, `verb`, `adj`. Each is an array of lowercase strings.
- Every round picks one word from each category and asks the child to identify the target type.
- Words must be **unambiguously** one part of speech at primary-school level — avoid words that double as another POS (e.g. "light" is both noun and adjective; "work" is both noun and verb).
- Aim for 25–40 words per category; the app shuffles and cycles through them.
- Use infinitive forms for Dutch verbs (e.g. `lopen`, not `loopt`).
- Avoid compound words or words longer than ~10 characters — they won't display well on the word buttons.

### Building Grammatica word lists from internet sources

**Dutch:**
1. Fetch `01_WOORDEN.txt` (nouns): format is `de/het  word  english` — extract the second column.
2. Fetch `02_WERKWOORDEN.txt` (verbs): format is `infinitive  ...  english` — extract the first column.
3. Fetch `03_ADJ_ADVB.txt` (adjectives + adverbs): extract the first column, then **manually remove** non-adjectives (prepositions, adverbs, pronouns such as `aan`, `al`, `alleen`, `altijd`, `bijna`, `daar`, `graag`, `hier`, `iemand`, `maar`, `nu`, `soms`, etc.).
4. Filter all three lists for child-appropriate words (known to ages 6–12, ≤10 characters, no loanwords).

**English:**
1. Fetch `top_english_nouns_lower_10000.txt` — words are one per line, frequency-ranked. Take the first 200 and filter for concrete, child-friendly nouns (skip abstract: `state`, `system`, `policy`; skip plurals: `years`, `states`).
2. Fetch `top_english_verbs_lower_10000.txt` — skip auxiliaries and past tenses near the top (`is`, `was`, `been`, `would`). Scroll to ~line 150+ for concrete action verbs (`run`, `play`, `help`, `read`).
3. Fetch `top_english_adjs_lower_10000.txt` — skip determiners/quantifiers (`other`, `many`, `most`, `few`). Keep concrete descriptors (`big`, `warm`, `red`, `happy`).

### Option D — Built-in list for a new language

1. Create `grammatica-{lc}.json` at the repo root following the format above.
2. Add `'/Thuiswerk/grammatica-{lc}.json'` to the `ASSETS` array in `sw.js`.
3. The `loadWords(lc)` function in `grammatica.html` fetches `grammatica-{lc}.json` automatically — no code change needed.
