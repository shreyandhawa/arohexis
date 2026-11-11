import process from 'node:process';
import console from 'node:console';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 150 * 1024;
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

console.log(
  `Total initial JS (gzip): ${(total / 1024).toFixed(1)} kB of ${BUDGET_BYTES / 1024} kB`,
);
if (total > BUDGET_BYTES) {
  console.error('Initial JS exceeds the 150 kB gzip budget');
  process.exit(1);
}
