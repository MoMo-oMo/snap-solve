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
    workerPath: '/tesseract/worker.min.js',
    corePath: '/tesseract/core',
  });
  try {
    const { data: { text } } = await worker.recognize(src);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}
