# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running the App

There is no build step. The app is plain HTML + ES6 modules served statically.

To run locally, use any static file server from the project root:

```sh
npx serve .
# or
python -m http.server 8080
```

The Vercel serverless function (`api/claude.js`) requires an `ANTHROPIC_API_KEY` environment variable. For local dev, use Vercel CLI:

```sh
npx vercel dev
```

There are no tests, no linter, and no package.json.

## Architecture

**Stack:** Vanilla JS (ES6 modules), HTML5 Canvas, CSS custom properties, Vercel serverless (Node.js), Claude API.

### Frontend Modules (`src/js/`)

| File | Responsibility |
|------|---------------|
| `main.js` | App entry point: constants, state bootstrap, canvas setup, event handlers, draw loop |
| `graph.js` | Canvas rendering: coordinate transforms (`worldToScreen`/`screenToWorld`), layout algorithm, node/edge drawing, hit testing |
| `state.js` | localStorage wrapper (`sm_state_v2`): `loadState()`, `saveState()`, `clearState()` |
| `data.js` | Diagnosis registry (`DIAG_MAP`) and default selection (`DEFAULT_SELECTED`) |
| `ai.js` | Claude API client: `suggestSymptoms()` and prompt builders for `es`/`en` locales |

### CSS Layers (`src/styles/`)

Load order matters — each layer depends on the previous:
1. `tokens.css` — all design tokens (colors, fonts, spacing) as CSS variables
2. `layout.css` — three-panel shell (topbar, left sidebar, canvas area, right detail panel), modals, legend widget
3. `components.css` — buttons, inputs, accordions, AI badge, toast notifications

### Backend (`api/claude.js`)

Vercel serverless function that proxies requests to `https://api.anthropic.com/v1/messages`. It exists solely to keep the API key server-side. Model used: `claude-sonnet-4-6`, max tokens: 1000.

### State Shape

```js
{
  lang: 'es' | 'en',
  username: string,
  selectedDiags: string[],   // e.g. ['tda', 'tlp', 'an', 'aut']
  diagProfiles: {},          // per-diagnosis questionnaire answers
  nodes: [],                 // symptom/hub nodes with positions
  idCounter: number
}
```

Persisted in `localStorage` under key `sm_state_v2`.

### UI Structure

Three-panel layout loaded from `index.html`:
- **Left sidebar** — diagnosis list + symptom chips
- **Center canvas** — interactive graph (pan/zoom/drag, hub-and-spoke layout)
- **Right panel** — node detail editor (slides in on selection)

Three-step onboarding (language → name → how-it-works) runs on first visit.

### Domain Language

The codebase uses Spanish for domain concepts — use these terms in code and comments:
- **Diagnóstico / diag** — diagnosis hub node
- **Síntoma** — symptom leaf node
- **Arista** — graph edge/connection
- **Perfil** — per-diagnosis profile questionnaire
- **Mapa** — the graph visualization
