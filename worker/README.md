# SnapSolve AI proxy

A minimal Cloudflare Worker that lets the app read + solve photographed math
problems using Cloudflare Workers AI — a vision-language model that handles
handwriting, diagrams, and word problems, none of which the on-device
Tesseract OCR + rule-based solver can do.

Free to run: Cloudflare Workers' free plan (100,000 requests/day) and Workers
AI's free tier (10,000 Neurons/day, a few thousand requests worth depending
on model/image size) both cost nothing, no credit card required, as of this
writing — but limits and offerings change, so double-check current terms
when you set this up.

This deliberately does **not** use an external AI provider (e.g. Gemini,
OpenAI): it originally did, but Gemini's free tier turned out to be
region-locked for some accounts (shows `limit: 0` regardless of actual
usage). Workers AI runs on Cloudflare's own infrastructure via a native
binding, so there's no separate account, no separate API key to manage, and
no region-eligibility gate tied to a different company's consumer product.
The tradeoff: open vision models here are noticeably weaker at math
reasoning than a frontier model like Gemini or GPT-4o would be — still a
large step up from the on-device OCR+regex pipeline, just not as strong as
the best commercial option would have been.

## One-time setup

1. **Install dependencies**:
   ```bash
   cd worker
   npm install
   ```

2. **Log into Cloudflare** (free account — sign up at https://dash.cloudflare.com if you don't have one):
   ```bash
   npx wrangler login
   ```
   This opens a browser to authorize; no payment info required for the free plan.

3. **Set the shared secret** (you'll be prompted to paste a value — nothing
   is written to any file):
   ```bash
   npx wrangler secret put APP_SHARED_SECRET
   # invent any random string, e.g. output of: openssl rand -hex 24
   ```
   This is a lightweight abuse gate, not real security — it's embedded in
   the app and can be extracted by a determined attacker. It's enough to
   stop casual scraping of a discovered URL; it won't stop someone who
   decompiles the APK. That's an acceptable tradeoff here: worst case if it
   leaks, someone burns your free Workers AI quota, at which point the app
   just falls back to the on-device solver automatically — nothing breaks.

4. **Deploy**:
   ```bash
   npm run deploy
   ```
   Wrangler prints the Worker's URL, something like
   `https://snapsolve-ai-proxy.<your-subdomain>.workers.dev`. If your
   Cloudflare account has never deployed a Worker before, it'll ask you to
   claim a `workers.dev` subdomain first (one-time, account-wide — do that
   in the dashboard under Workers & Pages, then re-run deploy).

5. **Accept the model's license, once** — Llama 3.2 Vision requires an
   explicit one-time acceptance per Cloudflare account before it'll run.
   Easiest way: open the Workers AI section of the Cloudflare dashboard,
   find `llama-3.2-11b-vision-instruct` under Models, and use the
   in-dashboard playground to run it once (any prompt) — it'll show the
   license prompt there. (If you get a `5016` error the first time you use
   the deployed Worker, that's this — accept it and it'll stop happening.)

6. **Wire it into the app**: in the project root (not `worker/`), create
   `.env` (copy `.env.example`) and set:
   ```
   VITE_AI_SOLVE_ENDPOINT=https://snapsolve-ai-proxy.<your-subdomain>.workers.dev
   VITE_AI_SHARED_SECRET=<the same random string from step 3>
   ```
   Rebuild the app. If this endpoint isn't configured, the app silently
   skips the AI path and uses the on-device OCR + rule-based solver only —
   nothing breaks if you skip all of this.

## Local development

```bash
cd worker
npm run dev
```
Runs the Worker locally. Point `VITE_AI_SOLVE_ENDPOINT` at the printed local
URL (usually `http://localhost:8787`) to test against it from `npm run dev`
in the main app.

## Changing the model

Workers AI's model catalog changes over time. To use a different
vision-capable model without touching code, either set a secret:
```bash
npx wrangler secret put VISION_MODEL
```
or uncomment the `[vars]` block in `wrangler.toml` for a non-secret
override, then `npm run deploy`. See the current catalog at
https://developers.cloudflare.com/workers-ai/models/ (filter by "Text
Generation" + vision-capable, or search "vision").
