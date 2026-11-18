// Captures the showcase in demo mode: stills of Home, Started, Insights and Replay at phone and
// desktop sizes into docs/media/, the link-preview image public/og.png, and one recording of
// Replay playing (docs/media/replay.webm). Run it after `npm run build`; it serves dist/ itself.
/* global document, getComputedStyle -- used inside page.evaluate, which runs in the browser */
import console from 'node:console';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';

const PORT = 4180;
const BASE = `http://localhost:${PORT}`;
const MEDIA = 'docs/media';
const SIZES = {
  phone: { viewport: { width: 375, height: 812 }, deviceScaleFactor: 2 },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
};

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
});
const browser = await chromium.launch();
try {
  await waitForServer();
  mkdirSync(MEDIA, { recursive: true });
  const demo = await demoState();

  for (const [name, size] of Object.entries(SIZES)) {
    // Reduced motion keeps every still the same from run to run.
    const context = await browser.newContext({
      ...size,
      storageState: demo,
      reducedMotion: 'reduce',
      serviceWorkers: 'block',
    });
    const page = await context.newPage();
    for (const route of ['/', '/insights', '/replay']) {
      await page.goto(BASE + route);
      await settle(page);
      const file = route === '/' ? 'home' : route.slice(1);
      await page.screenshot({ path: `${MEDIA}/${file}-${name}.png` });
    }
    await page.goto(BASE + '/');
    await page.getByRole('button', { name: "I'm stuck" }).click();
    await page.getByRole('button', { name: 'Anxious' }).click();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByText('Started.', { exact: true }).waitFor();
    await settle(page);
    await page.screenshot({ path: `${MEDIA}/started-${name}.png` });
    if (name === 'desktop') await linkPreview(page);
    await context.close();
  }

  await recordReplay(demo);
  console.log(`Saved stills and replay.webm to ${MEDIA}/, and public/og.png`);
} finally {
  await browser.close();
  server.kill();
}

async function waitForServer() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await globalThis.fetch(BASE)).ok) return;
    } catch {
      // not up yet
    }
    await sleep(100);
  }
  throw new Error(`vite preview did not start on ${BASE}. Run npm run build first.`);
}

/** Enters the demo once from Welcome; every capture starts from a copy of its storage. */
async function demoState() {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  await page.goto(BASE + '/welcome');
  await page.getByRole('button', { name: 'Explore the demo' }).first().click();
  await page.getByRole('region', { name: 'Demo' }).waitFor();
  const state = await context.storageState({ indexedDB: true });
  await context.close();
  return state;
}

/** Waits for fonts and for the renderer's first picture, when the screen has one. */
async function settle(page) {
  await page.getByRole('heading', { level: 1 }).first().waitFor();
  await page.evaluate(() => document.fonts.ready);
  if ((await page.locator('canvas').count()) > 0)
    await page.locator('canvas[data-field-ms]').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(600);
}

/** The Home plate's light on its own background, framed at 1200x630. */
async function linkPreview(page) {
  await page.goto(BASE + '/');
  await settle(page);
  const { image, bg } = await page
    .locator('canvas')
    .first()
    .evaluate((canvas) => ({
      image: canvas.toDataURL('image/png'),
      bg: getComputedStyle(canvas.closest('.plate') ?? document.body).backgroundColor,
    }));
  const frame = await browser.newPage({ viewport: { width: 1200, height: 630 } });
  // about:blank has no CSP, so the frame can use an inline style.
  await frame.setContent(
    `<body style="margin:0;height:630px;overflow:hidden;display:grid;place-items:center;background:${bg}">` +
      // The plate leaves room around the brain for its controls; a 1.15 scale trims that margin.
      `<img src="${image}" style="height:${Math.round(630 * 1.15)}px"></body>`,
  );
  await frame.locator('img').evaluate((img) => img.decode());
  await frame.screenshot({ path: 'public/og.png' });
  await frame.close();
}

/** Replay playing through the whole history once, at desktop size. */
async function recordReplay(demo) {
  const dir = join(tmpdir(), `arohexis-video-${process.pid}`);
  const size = { width: 1280, height: 800 };
  const context = await browser.newContext({
    viewport: size,
    storageState: demo,
    serviceWorkers: 'block',
    recordVideo: { dir, size },
  });
  const page = await context.newPage();
  await page.goto(BASE + '/replay');
  await settle(page);
  await page.getByRole('button', { name: 'Play' }).click();
  await page.getByRole('button', { name: 'Play' }).waitFor({ timeout: 20_000 });
  await page.waitForTimeout(1500);
  const video = page.video();
  await context.close();
  await video?.saveAs(`${MEDIA}/replay.webm`);
  rmSync(dir, { recursive: true, force: true });
}
