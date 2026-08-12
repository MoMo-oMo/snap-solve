/**
 * SnapSolve AI proxy — Cloudflare Worker.
 *
 * Uses Cloudflare Workers AI (native binding, no separate API key/account
 * needed) to read AND solve a photographed math problem in one call — a
 * vision-language model handles handwriting, diagrams, word problems, things
 * the on-device Tesseract OCR + rule-based solver can't. Returns JSON shaped
 * exactly like the app's existing SolveResult type so the frontend needs no
 * special-casing.
 *
 * Originally built against Gemini's free tier, but that free tier turned out
 * to be region-locked (limit: 0 for this account) — Workers AI has no such
 * restriction and needs zero extra account/key setup since Cloudflare is
 * already the host.
 */

interface Ai {
  run(model: string, inputs: Record<string, unknown>): Promise<unknown>;
}

export interface Env {
  AI: Ai;
  APP_SHARED_SECRET: string;
  VISION_MODEL?: string;
}

interface SolveResult {
  problem: string;
  topic: string;
  explanation: string;
  steps: string[];
  finalAnswer: string;
}

const DEFAULT_MODEL = '@cf/meta/llama-3.2-11b-vision-instruct';

const PROMPT = `You are a patient, precise math tutor. The attached image is a photo taken by a student of ONE math problem they want solved — it may be printed, handwritten, low quality, or a diagram with labeled values (e.g. a triangle with side lengths marked).

The photo may also contain things that are NOT the problem: a worksheet title, "Name/Date" fields, instructions like "show your work", other unrelated problems elsewhere on the page, page numbers, doodles. IGNORE all of that. Your job is to find the single actual math problem the student wants solved and solve ONLY that one.

- If the image shows a numbered list of several distinct problems (e.g. "1) ... 2) ... 3) ..."), solve ONLY problem 1 and ignore the rest — do not merge them, do not list the others as steps.
- "problem" must be an actual solvable math question or equation, transcribed as written — NEVER a title, heading, label, or instruction like "Chapter 4 Algebra Homework" or "Show your work below".
- "steps" must be genuine mathematical working (calculations, algebraic manipulation, substitutions) that derives the answer — NEVER a restatement or list of the problem(s) themselves.
- Interpret word problems and diagrams, but still solve exactly one self-contained question.

Show clear, numbered step-by-step working a student could follow and learn from — don't skip algebraic steps. Use plain text math notation (x^2, sqrt(x), pi, /, *) rather than LaTeX.

Respond with ONLY a single JSON object, no markdown code fences, no commentary before or after it, matching exactly this shape:
{
  "problem": "the ONE problem you are solving, exactly as written/transcribed from the image",
  "topic": "e.g. Quadratic Equations, Geometry - Circle, Word Problem - Rates",
  "explanation": "one or two sentences describing the approach",
  "steps": ["step 1", "step 2", "..."],
  "finalAnswer": "the final answer, concise"
}

If the image does not contain any legible, solvable math problem at all, respond with ONLY this JSON object instead:
{ "error": "short explanation of what's wrong" }`;

function corsHeaders(): HeadersInit {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-App-Secret',
  };
}

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

/** Models reliably follow "JSON only" instructions most of the time, but
 * sometimes wrap it in a code fence or add a stray sentence — extract the
 * first {...} block rather than assuming response is pure JSON. */
function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : text;
  const braceMatch = candidate.match(/\{[\s\S]*\}/);
  return JSON.parse(braceMatch ? braceMatch[0] : candidate);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders() });
    }

    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405);
    }

    if (!env.APP_SHARED_SECRET || request.headers.get('X-App-Secret') !== env.APP_SHARED_SECRET) {
      return json({ error: 'Unauthorized' }, 401);
    }

    let body: { imageBase64?: string; mimeType?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    const { imageBase64, mimeType } = body;
    if (!imageBase64 || typeof imageBase64 !== 'string') {
      return json({ error: 'Missing imageBase64' }, 400);
    }

    const model = env.VISION_MODEL || DEFAULT_MODEL;
    const dataUrl = `data:${mimeType || 'image/jpeg'};base64,${imageBase64}`;

    let aiResult: any;
    try {
      aiResult = await env.AI.run(model, {
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: PROMPT },
              { type: 'image_url', image_url: { url: dataUrl } },
            ],
          },
        ],
        max_tokens: 2048,
        temperature: 0.2,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return json({ error: `Workers AI error: ${message.slice(0, 300)}` }, 502);
    }

    const raw = aiResult?.response;
    if (!raw) {
      return json({ error: 'Workers AI returned no content' }, 502);
    }

    // Usually a plain string that needs JSON extraction, but this model
    // sometimes returns an already-parsed object — handle both.
    let parsed: SolveResult & { error?: string };
    try {
      parsed = typeof raw === 'string' ? (extractJson(raw) as SolveResult & { error?: string }) : raw;
    } catch {
      return json({ error: 'Could not parse model response as JSON' }, 502);
    }

    if (parsed.error) {
      return json({ error: parsed.error }, 422);
    }

    if (!parsed.problem || !parsed.topic || !Array.isArray(parsed.steps) || !parsed.finalAnswer) {
      return json({ error: 'Model response was missing required fields' }, 502);
    }

    const result: SolveResult = {
      problem: parsed.problem,
      topic: parsed.topic,
      explanation: parsed.explanation || '',
      steps: parsed.steps,
      finalAnswer: parsed.finalAnswer,
    };

    return json(result);
  },
};
