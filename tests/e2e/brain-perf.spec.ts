import { expect, test } from '@playwright/test';
import { DRAW_MEAN_BUDGET_MS } from '../../src/app/brain/constants';
import { full } from './fixtures/brain';
import { seedEvents, seedParts, seedPlans } from './helpers';

test('a 5 s drag across the plate keeps the draw mean within budget', async ({
  page,
}, testInfo) => {
  test.setTimeout(90_000);
  test.skip(testInfo.project.name !== 'iphone', 'frame time is measured on WebKit');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
  const seed = full(Date.now());
  await seedParts(page, seed.parts);
  await seedPlans(page, seed.plans);
  await seedEvents(page, seed.events);
  const canvas = page.locator('canvas');
  await expect(canvas).toHaveAttribute('data-loop', 'running');

  const box = await canvas.boundingBox();
  if (!box) throw new Error('no canvas box');
  const y = box.y + box.height / 2;
  const left = box.x + box.width * 0.15;
  const span = box.width * 0.7;
  await page.mouse.move(left, y);
  await page.mouse.down();
  // Drive by wall time: a slow runner lands fewer moves, but the drag still lasts 5 s.
  const start = Date.now();
  for (let elapsed = 0; elapsed < 5000; elapsed = Date.now() - start) {
    // Sweep right and back, so the drag never runs off the plate.
    const t = (elapsed / 5000) * 2;
    const x = left + span * (t <= 1 ? t : 2 - t);
    await page.mouse.move(x, y);
    await page.waitForTimeout(16);
  }
  await page.mouse.up();

  await expect(canvas).toHaveAttribute('data-draw-mean', /^\d/);
  const mean = Number(await canvas.getAttribute('data-draw-mean'));
  console.log(`data-draw-mean=${mean} budget=${DRAW_MEAN_BUDGET_MS}`);
  expect(mean).toBeLessThanOrEqual(DRAW_MEAN_BUDGET_MS);
});
