// Captures the showcase in demo mode: stills of Home, Started, Insights and Replay at phone and
// desktop sizes into docs/media/, the first-run Setup and walkthrough, a part zoomed in, a fully lit
// brain as the logo, a labelled diagram of Home (anatomy.png), the link-preview image public/og.png, and two recordings: Replay playing
// (replay.webm) and a short tour of the app (demo.webm). Run it after `npm run build`; it serves dist/.
/* global document, getComputedStyle, localStorage, Image, OffscreenCanvas -- used inside page.evaluate, which runs in the browser */
import console from 'node:console';
import { spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { setTimeout as sleep } from 'node:timers/promises';
import { chromium } from '@playwright/test';
// Node strips the types from these test files, so the README images use the tests' own seed.
import { lit } from '../tests/e2e/fixtures/brain.ts';
import { seedEvents, seedParts, seedPlans } from '../tests/e2e/helpers.ts';

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
    await page.getByRole('button', { name: 'Light a line' }).click();
    await page.getByRole('button', { name: 'Anxious' }).click();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await page.getByText('Started.', { exact: true }).waitFor();
    await settle(page);
    await page.screenshot({ path: `${MEDIA}/started-${name}.png` });
    if (name === 'desktop') await linkPreview(page);
    // A part zoomed in, with its card beside the plate (ADR-045).
    await page.goto(BASE + '/');
    await settle(page);
    await page.locator('[data-part-id]').first().click();
    await page.locator('[data-part-card]').waitFor();
    await page.waitForTimeout(600);
    await page.screenshot({ path: `${MEDIA}/part-${name}.png` });
    await context.close();
  }

  await firstRun();
  const full = await litState();
  await logo(full);
  await anatomy(full);
  await recordReplay(demo);
  await recordDemo(demo);
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
  // The stills show Home itself, so the walkthrough counts as seen.
  await page.evaluate(() => localStorage.setItem('arohexis:toured', '1'));
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

/** A new user: Setup with two names, then the first walkthrough card on Home, at phone size. */
async function firstRun() {
  const context = await browser.newContext({
    ...SIZES.phone,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  await page.goto(BASE + '/welcome');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Start fresh' }).click();
  await page.getByLabel('Part 1').fill('Portfolio');
  await page.getByRole('group', { name: 'Ideas' }).getByRole('button', { name: 'Health' }).click();
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: `${MEDIA}/setup-phone.png` });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('dialog', { name: 'Light a line' }).waitFor();
  await settle(page);
  await page.screenshot({ path: `${MEDIA}/tour-phone.png` });
  await context.close();
}

/** A short tour at phone size: zoom into a part, back to All, then Light a line to Started. */
async function recordDemo(demo) {
  const dir = join(tmpdir(), `arohexis-demo-${process.pid}`);
  const size = { width: 390, height: 844 };
  const context = await browser.newContext({
    viewport: size,
    storageState: demo,
    serviceWorkers: 'block',
    recordVideo: { dir, size },
  });
  const page = await context.newPage();
  await page.goto(BASE + '/');
  await settle(page);
  await page.waitForTimeout(1200);
  await page.locator('[data-part-id]').first().click();
  await page.waitForTimeout(2500);
  await page.getByRole('button', { name: 'All', exact: true }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Light a line' }).click();
  await page.waitForTimeout(800);
  await page.getByRole('button', { name: 'Anxious' }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByText('Started.', { exact: true }).waitFor();
  await page.waitForTimeout(3500);
  const video = page.video();
  await context.close();
  await video?.saveAs(`${MEDIA}/demo.webm`);
  rmSync(dir, { recursive: true, force: true });
}

/** A record with every region lit at full strength (the tests' `lit` seed), past onboarding. */
async function litState() {
  const context = await browser.newContext({ serviceWorkers: 'block' });
  await context.addInitScript(() => {
    for (const key of ['welcomed', 'toured', 'setup']) localStorage.setItem(`arohexis:${key}`, '1');
  });
  const page = await context.newPage();
  await page.goto(BASE + '/');
  await page.getByRole('heading', { level: 1 }).first().waitFor({ state: 'attached' });
  const seed = lit(Date.now());
  await seedParts(page, seed.parts);
  await seedPlans(page, seed.plans);
  await seedEvents(page, seed.events);
  // Home lands the newest line once and remembers it; after that the camera stays at its rest angle.
  await page.locator('canvas[data-field-ms]').first().waitFor({ state: 'attached' });
  await page.waitForTimeout(1500);
  const state = await context.storageState({ indexedDB: true });
  await context.close();
  return state;
}

/** The lit brain alone, cropped to its light, on a rounded square with transparent corners. */
async function logo(state) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 1200 },
    deviceScaleFactor: 2,
    storageState: state,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  await page.goto(BASE + '/');
  await settle(page);
  const { image, bg } = await plateLight(page);
  await context.close();
  const frame = await browser.newPage({ viewport: { width: 512, height: 512 } });
  await frame.setContent(
    `<body style="margin:0;background:transparent"><canvas width="512" height="512" style="border-radius:112px;display:block"></canvas></body>`,
  );
  // Crops to the bounding box of the light, so the brain fills the square whatever the plate size.
  await frame.evaluate(
    async ([src, fill]) => {
      const img = new Image();
      img.src = src;
      await img.decode();
      const scan = new OffscreenCanvas(img.width, img.height).getContext('2d');
      scan.drawImage(img, 0, 0);
      const { data, width, height } = scan.getImageData(0, 0, img.width, img.height);
      let [x0, y0, x1, y1] = [width, height, 0, 0];
      for (let y = 0; y < height; y += 2)
        for (let x = 0; x < width; x += 2) {
          const i = (y * width + x) * 4;
          if (data[i] + data[i + 1] + data[i + 2] < 150) continue;
          [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
        }
      const side = Math.max(x1 - x0, y1 - y0) * 1.12;
      const [cx, cy] = [(x0 + x1) / 2, (y0 + y1) / 2];
      const out = document.querySelector('canvas').getContext('2d');
      out.fillStyle = fill;
      out.fillRect(0, 0, 512, 512);
      out.drawImage(img, cx - side / 2, cy - side / 2, side, side, 0, 0, 512, 512);
    },
    [image, bg],
  );
  await frame.locator('canvas').screenshot({ path: `${MEDIA}/logo.png`, omitBackground: true });
  await frame.close();
}

/** The plate canvas as an image, with the plate's background colour. */
function plateLight(page) {
  return page
    .locator('canvas')
    .first()
    .evaluate((canvas) => ({
      image: canvas.toDataURL('image/png'),
      bg: getComputedStyle(canvas.closest('.plate') ?? document.body).backgroundColor,
    }));
}

/** Home on a laptop with a part open, labelled like a textbook diagram: a leader line per control. */
async function anatomy(state) {
  const size = { width: 1440, height: 900 };
  const context = await browser.newContext({
    viewport: size,
    storageState: state,
    reducedMotion: 'reduce',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();
  await page.goto(BASE + '/');
  await settle(page);
  await page.locator('[data-part-id]').first().click();
  await page.locator('[data-part-card]').waitFor();
  await page.waitForTimeout(600);
  const plate = page.getByRole('region', { name: 'Brain space' });
  const labels = [
    ['left', plate.getByText(/starts · /), 'Starts and lines', 'every start so far'],
    ['left', page.locator('canvas').first(), 'Brain space', 'one line of light per start'],
    [
      'left',
      page.locator('[data-tour="turn"]'),
      'Turn and zoom',
      'arrows turn, minus and plus zoom',
    ],
    [
      'left',
      page.locator('[data-tour="parts"] button'),
      'Your parts',
      'tap one to zoom into its region',
    ],
    ['right', page.locator('[data-tour="still"]'), 'Still', 'stops all motion'],
    ['right', page.locator('[data-part-card]'), 'Part card', 'starts, plans, what to focus on'],
    ['right', page.locator('[data-tour="start"]'), 'Light a line', "tap here when you're stuck"],
    ['right', page.getByText(/starts? this week/), 'This week', 'starts since the week began'],
    [
      'right',
      page.locator('[data-tour="nav"]'),
      'Everything else',
      'plans, insights, replay, settings',
    ],
  ];
  const marks = [];
  for (const [side, locator, title, note] of labels) {
    // A line of text is measured by its glyphs, not its full-width box.
    const box = await locator.first().evaluate((el) => {
      const r =
        el.tagName === 'P'
          ? (() => {
              const range = document.createRange();
              range.selectNodeContents(el);
              return range.getBoundingClientRect();
            })()
          : el.getBoundingClientRect();
      return { x: r.x, y: r.y, width: r.width, height: r.height };
    });
    // The dot sits on the edge facing the label; inside the big canvas and card, a little way in.
    const inside = title === 'Brain space' || title === 'Part card';
    const inset = title === 'Brain space' ? box.width * 0.44 : inside ? 28 : -6;
    const x = side === 'left' ? box.x + inset : box.x + box.width - inset;
    // The canvas's dot sits on the lit part of the brain, a little above its middle.
    const y = title === 'Brain space' ? box.y + box.height * 0.42 : box.y + box.height / 2;
    marks.push({ side, x, y, title, note });
  }
  const shot = (await page.screenshot()).toString('base64');
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  await context.close();

  const gutter = 320;
  const top = 48;
  const width = size.width + gutter * 2;
  const height = size.height + top * 2;
  // Labels on each side keep their element's height but never closer than 64 px to each other.
  for (const side of ['left', 'right']) {
    let last = -Infinity;
    for (const m of marks.filter((n) => n.side === side).sort((a, b) => a.y - b.y)) {
      m.ly = Math.max(m.y + top, last + 64);
      last = m.ly;
    }
  }
  const line = (m) => {
    const lx = m.side === 'left' ? gutter - 20 : gutter + size.width + 20;
    const [ex, ey] = [gutter + m.x, top + m.y];
    return `<line x1="${lx}" y1="${m.ly}" x2="${ex}" y2="${ey}" stroke="#eef1f6" stroke-opacity="0.75" stroke-width="1.5"/>
      <circle cx="${ex}" cy="${ey}" r="5" fill="#eef1f6" stroke="${bg}" stroke-width="2"/>
      <circle cx="${lx}" cy="${m.ly}" r="3" fill="#eef1f6"/>`;
  };
  const label = (m) => {
    const style =
      m.side === 'left'
        ? `right:${width - gutter + 32}px;text-align:right`
        : `left:${gutter + size.width + 32}px`;
    return `<div style="position:absolute;${style};top:${m.ly - 22}px;width:${gutter - 56}px">
      <div style="font-weight:600;font-size:19px">${m.title}</div>
      <div style="color:#9aa3b5;font-size:16px">${m.note}</div></div>`;
  };
  const frame = await browser.newPage({ viewport: { width, height } });
  await frame.setContent(
    `<body style="margin:0;width:${width}px;height:${height}px;position:relative;background:${bg};color:#e6e9ef;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;line-height:1.3">
      <img src="data:image/png;base64,${shot}" style="position:absolute;left:${gutter}px;top:${top}px;width:${size.width}px;border-radius:12px;outline:1px solid #262c39">
      <svg width="${width}" height="${height}" style="position:absolute;inset:0">${marks.map(line).join('')}</svg>
      ${marks.map(label).join('')}</body>`,
  );
  await frame.locator('img').evaluate((img) => img.decode());
  await frame.screenshot({ path: `${MEDIA}/anatomy.png` });
  await frame.close();
}
