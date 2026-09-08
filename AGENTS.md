# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Stack
- **Backend**: Python 3 + Flask 3.x (`app.py`)
- **Frontend**: Vanilla HTML/CSS/JS (no build step, no bundler)
- **Templates**: Jinja2 via `templates/index.html`
- **Static assets**: `static/css/style.css`, `static/js/main.js`

## Commands
```bash
# Install dependencies
pip install -r requirements.txt

# Run the dev server (http://localhost:5000)
python app.py
```
No build step, no lint config, no test suite — run directly.

## Architecture
```
app.py          ← single Flask app; two routes: GET / and POST /plan
templates/      ← index.html (Jinja2, served at /)
static/css/     ← style.css (CSS variables, dark theme)
static/js/      ← main.js (fetch API → /plan, DOM rendering)
```

## Key Patterns
- `/plan` accepts JSON `{ destination, budget, days, travel_type }` and returns a single JSON blob with `hotels`, `itinerary`, `budget`, `places`, `tips`.
- Travel type values accepted: `beach`, `adventure`, `cultural`, `luxury`, `budget` (lowercase).
- All data is generated in-process from static dictionaries in `app.py` — no external API calls.
- Budget bars animate via `data-width` attribute + `requestAnimationFrame` in `main.js`.

## Extending
- Add a new travel type: add entries in `HOTELS`, `ACTIVITIES`, `PLACES`, `TIPS` dicts in `app.py` (all keyed by the same string).
- The frontend re-renders entirely on each `/plan` response — no state persistence between requests.
