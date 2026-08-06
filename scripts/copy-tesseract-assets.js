// Self-hosts the tesseract.js worker + WASM core so OCR doesn't depend on
// tesseract.js's CDN defaults (cdn.jsdelivr.net) being reachable at runtime.
// Runs automatically via the "postinstall" npm script.
import { existsSync, mkdirSync, copyFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const destDir = path.join(root, 'public', 'tesseract');
const destCoreDir = path.join(destDir, 'core');
mkdirSync(destCoreDir, { recursive: true });

const workerSrc = path.join(root, 'node_modules', 'tesseract.js', 'dist', 'worker.min.js');
const workerDest = path.join(destDir, 'worker.min.js');

const coreDir = path.join(root, 'node_modules', 'tesseract.js-core');
const coreFiles = [
  'tesseract-core-lstm.wasm.js',
  'tesseract-core-lstm.wasm',
  'tesseract-core-simd-lstm.wasm.js',
  'tesseract-core-simd-lstm.wasm',
  'tesseract-core-relaxedsimd-lstm.wasm.js',
  'tesseract-core-relaxedsimd-lstm.wasm',
];

if (!existsSync(workerSrc)) {
  console.warn(`[copy-tesseract-assets] Skipping — ${workerSrc} not found (run "npm install" first).`);
  process.exit(0);
}

copyFileSync(workerSrc, workerDest);

for (const file of coreFiles) {
  const src = path.join(coreDir, file);
  if (!existsSync(src)) {
    console.warn(`[copy-tesseract-assets] Missing ${file} in tesseract.js-core — skipping.`);
    continue;
  }
  copyFileSync(src, path.join(destCoreDir, file));
}

console.log('[copy-tesseract-assets] tesseract.js worker + core copied to public/tesseract.');
