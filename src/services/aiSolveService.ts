import type { SolveResult } from './mathSolver';

const ENDPOINT = (import.meta.env.VITE_AI_SOLVE_ENDPOINT || '').trim();
const SHARED_SECRET = (import.meta.env.VITE_AI_SHARED_SECRET || '').trim();

/** True when the optional AI proxy is configured (see worker/README.md). */
export function isAiSolveConfigured(): boolean {
  return Boolean(ENDPOINT);
}

function toDataParts(imageBase64: string): { data: string; mimeType: string } {
  const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  return { mimeType: 'image/jpeg', data: imageBase64 };
}

/**
 * Reads AND solves a photographed math problem via the Workers AI-backed
 * proxy — handles handwriting, diagrams, and word problems the on-device
 * Tesseract OCR + rule-based solver can't. Throws on any failure (missing
 * config, network error, rate limit, unreadable image); callers should catch
 * and fall back to the local OCR + mathSolver pipeline.
 */
export async function solveFromImageAI(imageBase64: string): Promise<SolveResult> {
  if (!ENDPOINT) {
    throw new Error('AI solve endpoint is not configured.');
  }

  const { data, mimeType } = toDataParts(imageBase64);

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-App-Secret': SHARED_SECRET,
    },
    body: JSON.stringify({ imageBase64: data, mimeType }),
  });

  let body: (SolveResult & { error?: string }) | { error: string };
  try {
    body = await response.json();
  } catch {
    throw new Error('AI solve returned an invalid response.');
  }

  if (!response.ok || 'error' in body) {
    const message = 'error' in body && body.error ? body.error : `AI solve failed (status ${response.status}).`;
    throw new Error(message);
  }

  return body;
}
