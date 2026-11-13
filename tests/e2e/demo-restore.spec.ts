import { expect, test, type Page } from '@playwright/test';
import { startEvents } from './fixtures/brain';
import { expectAccessible, seedEvents, setTheme } from './helpers';

test.beforeEach(({ page }, testInfo) => {
  void page;
  test.skip(testInfo.project.name === 'iphone', 'the iOS share sheet is checked by hand');
});

async function ready(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
}

async function insightsText(page: Page): Promise<string> {
  await page.goto('/insights');
  await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible();
  await expect(page.getByText('Insights appear after a few starts.')).toHaveCount(0);
  return page.getByRole('main').innerText();
}

/** A demo entered today can open with a plan's repair sheet; it may arrive a moment late. */
async function closeSheet(page: Page): Promise<void> {
  const sheet = page.getByRole('dialog');
  try {
    await sheet.waitFor({ state: 'visible', timeout: 2000 });
  } catch {
    return;
  }
  await sheet.getByRole('button', { name: 'Close' }).click();
  await expect(sheet).toHaveCount(0);
}

async function mainEventCount(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open('arohexis');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction('events').objectStore('events').count();
          req.onsuccess = () => {
            db.close();
            resolve(req.result);
          };
          req.onerror = () => reject(req.error);
        };
      }),
  );
}

test('export, delete everything, import, and the same Insights reappear', async ({ page }) => {
  await ready(page);
  await seedEvents(
    page,
    startEvents({
      now: Date.now(),
      tagged: [['work', 'Work', 3]],
      untagged: 4,
      undone: 1,
    }),
  );
  const before = await insightsText(page);

  await page.goto('/settings/data');
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const path = await (await downloading).path();

  await page.getByRole('button', { name: 'Delete everything on this device' }).click();
  await expect(page.getByRole('heading', { name: 'Delete everything?' })).toBeVisible();
  await page.getByRole('button', { name: 'Delete everything', exact: true }).click();
  await expect(page.getByText('Everything is deleted. The defaults are back.')).toBeVisible();
  expect(await mainEventCount(page)).toBe(0);

  await page.locator('input[type="file"]').setInputFiles(path);
  await expect(page.getByRole('heading', { name: 'Replace with this backup?' })).toBeVisible();
  await expect(page.getByText(/\d+ events, \d+ plans, \d+ feelings, \d+ parts/)).toBeVisible();
  await page.getByRole('button', { name: 'Replace with this backup' }).click();
  await expect(page.getByText('Imported. Your data is now the backup.')).toBeVisible();

  expect(await insightsText(page)).toBe(before);
});

test('a file that is not a backup is refused and nothing changes', async ({ page }) => {
  await page.goto('/settings/data');
  await page.locator('input[type="file"]').setInputFiles({
    name: 'nope.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello":1}'),
  });
  await expect(page.getByRole('heading', { name: 'Replace with this backup?' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Import backup' })).toBeVisible();
});

test('the demo shows ten weeks, and exiting leaves the main database unchanged', async ({
  page,
}) => {
  await ready(page);
  await seedEvents(page, startEvents({ now: Date.now(), tagged: [], untagged: 4, undone: 0 }));
  const mainBefore = await mainEventCount(page);
  const textBefore = await insightsText(page);

  await page.goto('/settings/data');
  await page.getByRole('button', { name: 'Explore the demo' }).click();
  const ribbon = page.getByRole('region', { name: 'Demo' });
  await expect(ribbon).toBeVisible();
  await closeSheet(page);

  await page.getByRole('link', { name: 'Insights' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible();
  await expect(ribbon).toBeVisible();
  const weeks = page.getByRole('table', { name: /week/i }).first();
  // A header row, then every calendar week the ten weeks touch (ten or eleven).
  await expect.poll(() => weeks.getByRole('row').count()).toBeGreaterThanOrEqual(11);

  await ribbon.getByRole('button', { name: 'Reset demo' }).click();
  await expect(ribbon).toBeVisible();
  await closeSheet(page);

  await ribbon.getByRole('button', { name: 'Exit demo' }).click();
  await expect(page.getByRole('region', { name: 'Demo' })).toHaveCount(0);
  expect(await mainEventCount(page)).toBe(mainBefore);
  expect(await insightsText(page)).toBe(textBefore);
});

test.describe('onboarding', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a first run goes to Welcome, and Start fresh goes Home', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.getByText(/helps you practice one thing: starting/)).toBeVisible();
    await expect(page.getByText(/Add Arohexis to your Home Screen/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Start fresh' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.reload();
    await expect(page).toHaveURL(/\/$/);
  });

  test('Explore the demo opens the demo', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Explore the demo' }).click();
    await expect(page.getByRole('region', { name: 'Demo' })).toBeVisible();
  });

  test.describe('in Safari on an iPhone', () => {
    test.use({
      userAgent:
        'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
    });
    test('shows the Home Screen step', async ({ page }) => {
      await page.goto('/welcome');
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.getByText(/Add Arohexis to your Home Screen/)).toBeVisible();
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.getByRole('button', { name: 'Start fresh' })).toBeVisible();
    });
  });
});

for (const scheme of ['light', 'dark'] as const) {
  for (const route of ['/welcome', '/settings/data'] as const) {
    test(`${route} is accessible in ${scheme}`, async ({ page }) => {
      await setTheme(page, scheme);
      await page.goto(route);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expectAccessible(page);
    });
  }
}
