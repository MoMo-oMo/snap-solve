# SnapSolve - Architecture & Setup

SnapSolve works fully **client-side** out of the box — no backend, no API
keys, no setup required. An **optional** AI-powered path can be enabled for
smarter photo solving (handwriting, diagrams, word problems); see
[worker/README.md](worker/README.md) for that free, opt-in setup.

## Architecture Overview

```
Mobile/Web App (Ionic Vue)
  → AI path (optional): Cloudflare Worker → Workers AI (vision model, free tier)
      reads AND solves photographed problems in one call — handles
      handwriting, diagrams, word problems. Falls back automatically
      to the path below on any failure or if unconfigured.
  → On-device path (always available, no network):
      OCR: Tesseract.js (runs locally in a Web Worker, src/services/ocrService.ts)
      Solver: mathjs-based rules engine (src/services/mathSolver.ts)
```

1. The user takes a photo (via the browser camera or the Capacitor Camera
   plugin on native) or types a problem directly.
2. **If a photo was taken and `VITE_AI_SOLVE_ENDPOINT` is configured**,
   `solveFromImageAI()` in `src/services/aiSolveService.ts` sends the photo
   to a Cloudflare Worker, which asks a Workers AI vision model to read and
   solve it in one call. On success this goes straight to the solved-result
   screen. On any failure (not configured, offline, rate-limited, unreadable
   image) it silently falls through to step 3 — the app never hard-fails here.
3. Otherwise, `detectMath()` in `src/services/ocrService.ts` runs
   Tesseract.js locally to extract text from the image. No network call is
   made and no API key is needed. The user confirms/edits the detected text.
4. `solveProblem()` in `src/services/mathSolver.ts` normalizes the input,
   detects the topic (arithmetic, linear/quadratic equations, geometry,
   trigonometry, logarithms, derivatives), and solves it using `mathjs`,
   returning structured step-by-step output. A manual topic-hint selector
   (`TopicSelector.vue`) lets the user override auto-detection.
5. `answersMatch()` (also in `mathSolver.ts`) powers the "Check My Work" flow
   by comparing a student's answer against the computed solution. If the
   problem was read via the AI path and the transcribed text wasn't edited,
   the AI's own solution is reused instead of re-solving locally.

## Setup Instructions

```bash
npm install
npm run dev
```

No environment variables or secrets are required for the on-device path —
it works immediately. To enable the optional AI path, see
[worker/README.md](worker/README.md), then copy `.env.example` to `.env`
and fill in the two `VITE_AI_*` values it produces.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the Vite dev server |
| `npm run build` | Type-check (`vue-tsc`) and build for production |
| `npm run preview` | Preview the production build |
| `npm run lint` | Run ESLint |
| `npm run test:unit` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Cypress) |

## Native (Capacitor/Android)

The `android/` directory is a Capacitor-generated native project. After
building the web assets (`npm run build`), sync them with:

```bash
npx cap sync android
```

## Notes on `scripts/` and `data/`

`data/` and the Python scripts under `scripts/` (`build_questions_json.py`,
`ocr_textbook.py`, etc.) are offline tooling used to prepare textbook/question
content; they are not part of the running app.
