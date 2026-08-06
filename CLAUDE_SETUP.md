# SnapSolve - Architecture & Setup

SnapSolve is a fully **client-side** Ionic/Vue app. There is no backend, no
API keys, and no external service calls required to run it.

## Architecture Overview

```
Mobile/Web App (Ionic Vue)
  → OCR: Tesseract.js (runs locally in a Web Worker, src/services/ocrService.ts)
  → Solver: mathjs-based rules engine (src/services/mathSolver.ts)
```

1. The user takes a photo (via the browser camera or the Capacitor Camera
   plugin on native) or types a problem directly.
2. If a photo was taken, `detectMath()` in `src/services/ocrService.ts` runs
   Tesseract.js locally to extract text from the image. No network call is
   made and no API key is needed.
3. The user confirms/edits the detected text.
4. `solveProblem()` in `src/services/mathSolver.ts` normalizes the input,
   detects the topic (arithmetic, linear/quadratic equations, geometry,
   trigonometry, logarithms, derivatives), and solves it using `mathjs`,
   returning structured step-by-step output.
5. `answersMatch()` (also in `mathSolver.ts`) powers the "Check My Work" flow
   by comparing a student's answer against the computed solution.

## Setup Instructions

```bash
npm install
npm run dev
```

No environment variables or secrets are required.

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
content; they are not part of the running app. Nothing in the app currently
reads from Firestore or any other backend.
