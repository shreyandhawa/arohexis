import { expect, test, type Page } from '@playwright/test';
import { full, knownEvents } from './fixtures/brain';
import { expectAccessible, seedEvents, seedParts, seedPlans, setTheme } from './helpers';

const stuck = "I'm stuck";
const region = (page: Page) => page.getByRole('region', { name: 'Brain space' });
const canvas = (page: Page) => page.locator('canvas');
const dialog = (page: Page) => page.getByRole('dialog');
const still = (page: Page) => region(page).getByRole('button', { name: 'Still', exact: true });

/** The app has created its database once it has rendered Home's heading. */
async function home(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
  await expect(region(page)).toBeVisible();
}

async function begin(page: Page): Promise<void> {
  await page.getByRole('button', { name: stuck }).click();
  await page.getByRole('button', { name: 'Anxious' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Started.', { exact: true })).toBeVisible();
}

test.describe('with the renderer chunk blocked', () => {
  test.use({ serviceWorkers: 'block' });

  test('with the renderer chunk blocked, every Brain space action works', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      // The blocked request is the one error this test expects.
      if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|brain-/.test(m.text()))
        errors.push(m.text());
    });
    await page.route('**/assets/brain-*.js', (r) => r.abort());

    await home(page);
    await seedEvents(page, knownEvents(Date.now()));
    await expect(region(page)).toContainText('Work: 3 starts.');

    // Still, zoom and turn.
    await still(page).click();
    await expect(still(page)).toHaveAttribute('aria-pressed', 'true');
    await still(page).click();
    await expect(still(page)).toHaveAttribute('aria-pressed', 'false');
    for (const name of ['Zoom in', 'Zoom out', 'Turn left', 'Turn right'])
      await region(page).getByRole('button', { name, exact: true }).click();

    // A part chip opens its card.
    await region(page).getByRole('button', { name: 'Work', exact: true }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page)).toContainText('3 starts');
    await page.keyboard.press('Escape');
    await expect(dialog(page)).toBeHidden();

    // Settings, Parts edits.
    await page.goto('/settings/parts');
    const work = page.getByRole('group', { name: 'Work', exact: true });
    await work.getByLabel('Name').fill('Job');
    await work.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('group', { name: 'Job', exact: true })).toBeVisible();

    // The stuck flow reaches Started, and the strip's text shows.
    await page.goto('/');
    await begin(page);
    await expect(page.getByText(/starts? · /)).toBeVisible();
    expect(errors).toEqual([]);
  });
});

test('keyboard only', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'keyboard only');
  await home(page);
  await seedEvents(page, knownEvents(Date.now()));
  await expect(region(page)).toContainText('Work: 3 starts.');
  await expect(canvas(page)).toHaveAttribute('data-field-ms', /./);

  // Tab reaches every chip and plate control.
  const expected = new Set(
    await region(page)
      .getByRole('button')
      .evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label') ?? b.textContent ?? '')),
  );
  expect(expected.size).toBeGreaterThanOrEqual(11);
  const reached = new Set<string>();
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  for (let i = 0; i < 40 && reached.size < expected.size; i++) {
    await page.keyboard.press('Tab');
    const name = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.closest('[role="region"]')
        ? (el.getAttribute('aria-label') ?? el.textContent ?? '')
        : '';
    });
    if (name) reached.add(name);
  }
  expect([...reached].sort()).toEqual([...expected].sort());

  // Arrows turn, plus and minus zoom.
  const read = async (name: string) => Number(await canvas(page).getAttribute(name));
  await region(page).getByRole('button', { name: 'Turn right' }).focus();
  const yaw = await read('data-yaw');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => read('data-yaw')).not.toBe(yaw);
  const turned = await read('data-yaw');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => read('data-yaw')).not.toBe(turned);
  const zoom = await read('data-zoom');
  await page.keyboard.press('+');
  await expect.poll(() => read('data-zoom')).toBeGreaterThan(zoom);
  const zoomed = await read('data-zoom');
  await page.keyboard.press('-');
  await expect.poll(() => read('data-zoom')).toBeLessThan(zoomed);

  // Enter opens a card, Esc closes it.
  const work = region(page).getByRole('button', { name: 'Work', exact: true });
  await work.focus();
  await page.keyboard.press('Enter');
  await expect(dialog(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();

  // S still opens the stuck flow.
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  await page.keyboard.press('s');
  await expect(page).toHaveURL(/\/stuck$/);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`Home, Started, the card and Settings → Parts are accessible in ${scheme}`, async ({
    page,
  }) => {
    await setTheme(page, scheme);
    await home(page);
    const seed = full(Date.now());
    await seedParts(page, seed.parts);
    await seedPlans(page, seed.plans);
    await seedEvents(page, seed.events);
    await expect(region(page)).toBeVisible();
    await expectAccessible(page);

    await region(page).getByRole('button', { name: 'Work', exact: true }).click();
    await expect(dialog(page)).toBeVisible();
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    await expectAccessible(page);
    await page.keyboard.press('Escape');

    await page.goto('/settings/parts');
    await expect(page.getByRole('heading', { level: 1, name: 'Parts' })).toBeVisible();
    await expectAccessible(page);

    await page.goto('/');
    await begin(page);
    await page.getByRole('button', { name: 'Work', exact: true }).click();
    await expect(canvas(page)).toHaveAttribute('data-reveal', /./);
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    await expectAccessible(page);
  });
}
