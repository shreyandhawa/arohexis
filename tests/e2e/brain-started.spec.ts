import { expect, test, type Page } from '@playwright/test';
import { knownEvents } from './fixtures/brain';
import { expectAccessible, seedEvents, seedParts, setTheme } from './helpers';

const stuck = "I'm stuck";
const canvas = (page: Page) => page.locator('canvas');
const region = (page: Page) => page.getByRole('region', { name: 'Brain space' });
const chip = (page: Page, name: string) => page.getByRole('button', { name, exact: true });
const dialog = (page: Page) => page.getByRole('dialog');
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
    await home(page);
    await seedParts(page, [SIX]);
    await begin(page);
    await expect(canvas(page)).toBeVisible();
    await settled(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
    ).toBe(true);
    const strip = await canvas(page).boundingBox();
    expect(strip?.height).toBeGreaterThanOrEqual(64);
    expect(strip?.height).toBeLessThanOrEqual(80);
    await expect(page.getByRole('button', { name: 'Done for now' })).toBeInViewport({ ratio: 1 });
  });
});

test('the strip reveals the new light over two minutes', async ({ page }) => {
  await page.clock.install({ time: Date.now() });
  await home(page);
  await begin(page);
  await chip(page, 'Work').click();
  await page.clock.runFor(60_000);
  await expect.poll(() => reveal(page)).toBeGreaterThan(0.48);
  expect(await reveal(page)).toBeLessThan(0.52);
  await page.clock.runFor(60_000);
  await expect.poll(() => reveal(page)).toBe(1);
});

test('a reload mid-reveal resumes at the right progress', async ({ page }) => {
  await page.clock.install({ time: Date.now() });
  await home(page);
  await begin(page);
  await chip(page, 'Work').click();
  await page.clock.runFor(60_000);
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
  test('a part chip opens its card with focus trapped; Esc and Close each return focus to the chip', async ({
    page,
  }) => {
    await home(page);
    await seedEvents(page, knownEvents(Date.now()));
    const work = region(page).getByRole('button', { name: 'Work', exact: true });
    await work.click();
    await expect(dialog(page)).toBeVisible();
    for (let i = 0; i < 6; i += 1) {
      await page.keyboard.press('Tab');
      expect(await page.evaluate(() => !!document.activeElement?.closest('dialog'))).toBe(true);
    }
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();
    await expect(work).toBeFocused();
    await work.click();
    await dialog(page).getByRole('button', { name: 'Close' }).click();
    await expect(dialog(page)).toBeHidden();
    await expect(work).toBeFocused();
  });

  test('the card shows counts and the focus line', async ({ page }) => {
    await home(page);
    await seedEvents(page, knownEvents(Date.now()));
    await region(page).getByRole('button', { name: 'Work', exact: true }).click();
    const card = dialog(page);
    await expect(card.getByRole('heading', { name: 'Work' })).toBeVisible();
    await expect(card).toContainText('3 starts');
    await expect(card).toContainText('3 start lines');
    await expect(card.getByRole('heading', { name: 'What to focus on' })).toBeVisible();
    await expect(card).toContainText(
      "When you're stuck here, name the feeling, then pick a first step your hands can do.",
    );
    await expect(card.getByRole('link', { name: 'About' })).toHaveAttribute(
      'href',
      '/about#brain-space',
    );
  });
});

for (const scheme of ['light', 'dark'] as const) {
  test(`Started and the card are accessible in ${scheme}`, async ({ page }) => {
    await setTheme(page, scheme);
    await home(page);
    await seedEvents(page, knownEvents(Date.now()));
    await begin(page);
    await chip(page, 'Work').click();
    await expect(canvas(page)).toHaveAttribute('data-reveal', /./);
    await settled(page);
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Done for now' }).click();
    await region(page).getByRole('button', { name: 'Work', exact: true }).click();
    await expect(dialog(page)).toBeVisible();
    await expectAccessible(page);
  });
}
