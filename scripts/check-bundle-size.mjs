import process from 'node:process';
import console from 'node:console';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 150 * 1024;
const BRAIN_BUDGET_BYTES = 30 * 1024;
const BRAIN_ENTRY = 'src/app/brain/brain.ts';
const distDir = 'dist';
const html = readFileSync(join(distDir, 'index.html'), 'utf8');

const files = new Set();
for (const tag of html.match(/<(script|link)\b[^>]*>/gi) ?? []) {
  const isModuleScript = /^<script\b/i.test(tag) && /\btype=["']module["']/i.test(tag);
  const isPreload = /^<link\b/i.test(tag) && /\brel=["']modulepreload["']/i.test(tag);
  if (!isModuleScript && !isPreload) continue;
  const ref = /\b(?:src|href)=["']([^"']+)["']/i.exec(tag)?.[1];
  if (ref) files.add(ref);
}

if (files.size === 0) {
  console.error('No module scripts found in dist/index.html');
  process.exit(1);
}

let total = 0;
for (const ref of files) {
  const path = join(distDir, ref.replace(/^\.?\/+/, ''));
  const size = gzipSync(readFileSync(path)).length;
  console.log(`${size.toString().padStart(8)} B gzip  ${ref}`);
  total += size;
}

const gz = (file) => gzipSync(readFileSync(join(distDir, file))).length;
const initialFiles = new Set([...files].map((ref) => ref.replace(/^\.?\/+/, '')));

// The lazy Brain space chunk: its own file plus static imports outside the initial set.
const manifest = JSON.parse(readFileSync(join(distDir, '.vite', 'manifest.json'), 'utf8'));
const entry = manifest[BRAIN_ENTRY];
if (!entry) {
  console.error(`No manifest entry for ${BRAIN_ENTRY}`);
  process.exit(1);
}
const chunkFiles = new Set();
const visit = (key) => {
  const chunk = manifest[key];
  if (!chunk || initialFiles.has(chunk.file) || chunkFiles.has(chunk.file)) return;
  chunkFiles.add(chunk.file);
  for (const next of chunk.imports ?? []) visit(next);
};
visit(BRAIN_ENTRY);
let brainTotal = 0;
for (const file of chunkFiles) {
  const size = gz(file);
  console.log(`${size.toString().padStart(8)} B gzip  ${file} (lazy)`);
  brainTotal += size;
}

console.log(
  `Total initial JS (gzip): ${(total / 1024).toFixed(1)} kB of ${BUDGET_BYTES / 1024} kB`,
);
if (total > BUDGET_BYTES) {
  console.error('Initial JS exceeds the 150 kB gzip budget');
  process.exit(1);
}

console.log(
  `Brain space chunk (gzip): ${(brainTotal / 1024).toFixed(1)} kB of ${BRAIN_BUDGET_BYTES / 1024} kB`,
);
if (brainTotal > BRAIN_BUDGET_BYTES) {
  console.error('Brain space chunk exceeds the 30 kB gzip budget');
  process.exit(1);
}
