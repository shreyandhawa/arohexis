import { expect, test, type Page } from '@playwright/test';
import { knownEvents } from './fixtures/brain';
import { expectAccessible, seedEvents, seedParts } from './helpers';

const stuck = 'Light a line';
const canvas = (page: Page) => page.locator('canvas');
const region = (page: Page) => page.getByRole('region', { name: 'Brain space' });
const chip = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const dialog = (page: Page) => page.getByRole('dialog');
const partCard = (page: Page) => page.locator('[data-part-card]');
const SIX = { id: 'extra', label: 'Extra', order: 6, enabled: true, colour: 6, region: 6 };

/** The app has created its database once Home has rendered its heading. */
async function home(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
  await expect(region(page)).toBeVisible();
}

/** From Home to a running timer: three taps, no typing. */
async function begin(page: Page): Promise<void> {
  await page.getByRole('button', { name: stuck }).click();
  await page.getByRole('button', { name: 'Anxious' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Started.', { exact: true })).toBeVisible();
}

const reveal = async (page: Page): Promise<number> =>
  Number(await canvas(page).getAttribute('data-reveal'));

async function settled(page: Page): Promise<void> {
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
}

test.describe('at 375x667', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test("Started doesn't scroll with six parts and the strip", async ({ page }) => {
    await page.clock.install({ time: Date.now() });
    await home(page);
    await seedParts(page, [SIX]);
    await begin(page);
    await expect(canvas(page)).toBeVisible();
    // The brain is the stage: at least 200 px, with no scroll, while the timer runs and once it ends.
    const fits = async (): Promise<void> => {
      await settled(page);
      expect(
        await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
      ).toBe(true);
      expect((await canvas(page).boundingBox())?.height).toBeGreaterThanOrEqual(200);
      await expect(page.getByRole('button', { name: 'Done for now' })).toBeInViewport({
        ratio: 1,
      });
    };
    await fits();
    // Jump the clock: replaying every frame of a tall strip outlasts the test timeout on CI.
    await page.clock.fastForward(120_000);
    await expect(page.getByRole('button', { name: 'Keep going' })).toBeVisible();
    await fits();
  });
});

test('the strip reveals the new light over two minutes', async ({ page }) => {
  await page.clock.install({ time: Date.now() });
  await home(page);
  await begin(page);
  await chip(page, 'Work').click();
  await page.clock.fastForward(60_000);
  await expect.poll(() => reveal(page)).toBeGreaterThan(0.48);
  // The installed clock also ticks in real time, so a slow runner adds a few seconds past 60.
  expect(await reveal(page)).toBeLessThan(0.56);
  await page.clock.fastForward(60_000);
  await expect.poll(() => reveal(page)).toBe(1);
});

test('a reload mid-reveal resumes at the right progress', async ({ page }) => {
  await page.clock.install({ time: Date.now() });
  await home(page);
  await begin(page);
  await chip(page, 'Work').click();
  await page.clock.runFor(60_000);
  // Hold the clock so a slow reload cannot advance the reveal.
  await page.clock.setFixedTime((await page.evaluate(() => Date.now())) + 1_000);
  await page.reload();
  await expect(canvas(page)).toHaveAttribute('data-reveal', /./);
  expect(await reveal(page)).toBeGreaterThan(0.47);
  expect(await reveal(page)).toBeLessThan(0.56);
});

test('a re-tag mid-reveal moves only that light', async ({ page }) => {
  await home(page);
  await seedEvents(page, knownEvents(Date.now()));
  await expect(region(page)).toContainText('Work: 3 starts.');
  await begin(page);
  await chip(page, 'Work').click();
  await expect(canvas(page)).toHaveAttribute('data-reveal-part', 'work');
  await chip(page, 'Study').click();
  await expect(canvas(page)).toHaveAttribute('data-reveal-part', 'study');
  await page.getByRole('button', { name: 'Done for now' }).click();
  await expect(region(page)).toContainText('Study: 3 starts. 3 start lines.');
  await expect(region(page)).toContainText('Work: 3 starts. 3 start lines.');
});

test("undo removes only that start's light", async ({ page }) => {
  await home(page);
  await seedEvents(page, knownEvents(Date.now()));
  await expect(region(page)).toContainText('Work: 3 starts.');
  await begin(page);
  await chip(page, 'Work').click();
  await expect(canvas(page)).toHaveAttribute('data-reveal-part', 'work');
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Start removed.')).toBeVisible();
  await expect(region(page)).toContainText('Work: 3 starts. 3 start lines.');
  await expect(region(page)).toContainText('Study: 2 starts. 2 start lines.');
  await expect(canvas(page)).not.toHaveAttribute('data-reveal', /./);
});

test('Still on the strip shows the light whole and idles the loop', async ({ page }) => {
  await home(page);
  await begin(page);
  await chip(page, 'Work').click();
  await page.getByRole('button', { name: 'Still', exact: true }).click();
  await expect(page.locator('[data-motion]')).toHaveAttribute('data-motion', 'still');
  await expect(canvas(page)).toHaveAttribute('data-reveal', '1.00');
  await expect(canvas(page)).toHaveAttribute('data-loop', 'idle', { timeout: 1000 });
});

test('leaving Started early shows the light whole on Home', async ({ page }) => {
  await home(page);
  await begin(page);
  await chip(page, 'Work').click();
  await page.getByRole('button', { name: 'Done for now' }).click();
  await expect(region(page)).toContainText('Work: 1 start. 1 start line.');
  await expect(canvas(page)).not.toHaveAttribute('data-reveal', /./);
});

test.describe('the part card', () => {
  test('a part chip zooms to its part and shows its card beside the plate; Close returns', async ({
    page,
  }) => {
    await home(page);
    await seedEvents(page, knownEvents(Date.now()));
    const work = region(page).getByRole('button', { name: 'Work', exact: true });
    const before = await canvas(page).getAttribute('data-zoom');
    await work.click();
    await expect(partCard(page).getByRole('heading', { name: 'Work' })).toBeVisible();
    await expect(dialog(page)).toHaveCount(0);
    await expect(canvas(page)).toHaveAttribute('data-zoom', '1.80');
    await partCard(page).getByRole('button', { name: 'Close' }).click();
    await expect(partCard(page)).toHaveCount(0);
    await expect(work).toHaveAttribute('aria-pressed', 'false');
    await expect(canvas(page)).toHaveAttribute('data-zoom', before ?? '1.00');
  });

  test('the card shows counts and the focus line', async ({ page }) => {
    await home(page);
    await seedEvents(page, knownEvents(Date.now()));
    await region(page).getByRole('button', { name: 'Work', exact: true }).click();
    const card = partCard(page);
    await expect(card.getByRole('heading', { name: 'Work' })).toBeVisible();
    await expect(card).toContainText('3 starts');
    await expect(card).toContainText('3 start lines');
    await expect(card.getByRole('heading', { name: 'What to focus on' })).toBeVisible();
    await expect(card).toContainText(
      'An if-then plan, with a set time, place and first step, may help these starts happen.',
    );
    await expect(card.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      '/about#brain-space',
    );
  });
});

test(`Started and the card are accessible`, async ({ page }) => {
  await home(page);
  await seedEvents(page, knownEvents(Date.now()));
  await begin(page);
  await chip(page, 'Work').click();
  await expect(canvas(page)).toHaveAttribute('data-reveal', /./);
  await settled(page);
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Done for now' }).click();
  await region(page).getByRole('button', { name: 'Work', exact: true }).click();
  await expect(partCard(page)).toBeVisible();
  await expectAccessible(page);
});
