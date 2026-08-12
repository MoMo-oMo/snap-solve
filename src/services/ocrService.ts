import { createWorker, OEM } from 'tesseract.js';

export async function detectMath(imageBase64: string): Promise<string> {
  // Preserve the original data URL as-is (keeps the correct MIME type for PNGs/etc.),
  // or construct one assuming JPEG only if the raw base64 was passed in without a prefix.
  const src = imageBase64.startsWith('data:')
    ? imageBase64
    : `data:image/jpeg;base64,${imageBase64}`;

  // createWorker is more reliable than the Tesseract.recognize() one-shot shorthand.
  // workerPath/corePath point at self-hosted copies (public/tesseract) instead of
  // tesseract.js's CDN defaults, so scanning still works on locked-down/offline networks.
  const worker = await createWorker('eng', OEM.LSTM_ONLY, {
    workerPath: `${import.meta.env.BASE_URL}tesseract/worker.min.js`,
    corePath: `${import.meta.env.BASE_URL}tesseract/core`,
  });
  try {
    const { data: { text } } = await worker.recognize(src);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

// Symbols Tesseract hallucinates almost exclusively when it's failing badly
// (photo of a screen, dense body text, glare) — essentially never present in
// a real math problem or word problem.
const GARBAGE_CHARS = /[§¢£™®©¶†‡«»{}[\]~`|]/g;
// Digits, math operators/symbols, letters, and everyday punctuation — the
// character set an actual math/word problem is made of.
const PLAUSIBLE_CHARS = /[a-zA-Z0-9+\-*/=().^√π°×÷−–,.:;?!'" \n]/g;

/**
 * Heuristic check for OCR output that's almost certainly not a legible math
 * problem — e.g. Tesseract doing its best on a photographed screen full of
 * prose. Used to show a clear "couldn't read that" message instead of
 * dumping unreadable noise into the edit box for the user to puzzle over.
 */
export function looksLikeGarbage(text: string): boolean {
  const trimmed = text.trim();
  if (!trimmed) return false; // caller already handles the empty case separately

  // A real single problem — even a wordy one — is rarely this long; a
  // photographed page of unrelated text easily is.
  if (trimmed.length > 500) return true;

  const weirdCount = (trimmed.match(GARBAGE_CHARS) || []).length;
  if (weirdCount / trimmed.length > 0.03) return true;

  const plausibleCount = (trimmed.match(PLAUSIBLE_CHARS) || []).length;
  if (plausibleCount / trimmed.length < 0.85) return true;

  return false;
}
