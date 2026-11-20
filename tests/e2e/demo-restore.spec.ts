import { expect, test, type Page } from '@playwright/test';
import { startEvents } from './fixtures/brain';
import { expectAccessible, seedEvents } from './helpers';

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
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('link', { name: 'Insights' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible();
  await expect(ribbon).toBeVisible();
  const weeks = page.getByRole('table', { name: /week/i }).first();
  // A header row, then every calendar week the ten weeks touch (ten or eleven).
  await expect.poll(() => weeks.getByRole('row').count()).toBeGreaterThanOrEqual(11);

  await ribbon.getByRole('button', { name: 'Reset demo' }).click();
  await expect(ribbon).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await ribbon.getByRole('button', { name: 'Exit demo' }).click();
  await expect(page.getByRole('region', { name: 'Demo' })).toHaveCount(0);
  expect(await mainEventCount(page)).toBe(mainBefore);
  expect(await insightsText(page)).toBe(textBefore);
});

test.describe('onboarding', () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test('a first run goes to Welcome, and Start fresh offers a first plan', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/welcome$/);
    await expect(page.getByText(/helps you practice one thing: starting/)).toBeVisible();
    await expect(page.getByText(/Add Arohexis to your Home Screen/)).toHaveCount(0);
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Start fresh' }).click();
    await expect(page).toHaveURL(/\/plans\/new$/);
    await expect(page.getByRole('heading', { level: 1, name: 'New plan' })).toBeVisible();
    await expect(
      page.getByText("Pick one thing you keep putting off, and when you'll start it."),
    ).toBeVisible();
    await expect(
      page.getByText("Habits took about two months in one review. A day off isn't a reset."),
    ).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('link', { name: 'Skip for now' }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.reload();
    await expect(page).toHaveURL(/\/$/);
    // Skipping is an answer: Home does not offer the plan again.
    await expect(page.getByRole('region', { name: 'Make a plan' })).toHaveCount(0);
  });

  test('a first plan saves and opens on its own page with Add to calendar', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Start fresh' }).click();
    await page.getByLabel('Place').fill('my desk');
    await page.getByLabel('First action').fill('open the essay doc');
    await page.getByRole('button', { name: 'Save plan' }).click();
    await expect(page).toHaveURL(/\/plans\/[^/]+$/);
    await expect(page.getByRole('button', { name: 'Add to calendar' })).toBeVisible();
  });

  test('Explore the demo opens the demo', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Explore the demo' }).click();
    await expect(page.getByRole('region', { name: 'Demo' })).toBeVisible();
  });

  test('the Welcome hero plays without touching any database', async ({ page }) => {
    await page.goto('/welcome');
    await expect(
      page.getByRole('img', { name: /lit by ten weeks of sample starts/ }),
    ).toBeVisible();
    // It plays once (the loop runs), then rests and stays at rest: it never loops.
    const canvas = page.locator('canvas');
    await expect(canvas).toHaveAttribute('data-loop', 'running');
    await expect(canvas).toHaveAttribute('data-loop', 'idle', { timeout: 5000 });
    await page.waitForTimeout(1500);
    await expect(canvas).toHaveAttribute('data-loop', 'idle');
    const names = await page.evaluate(async () => (await indexedDB.databases()).map((d) => d.name));
    expect(names).not.toContain('arohexis-demo');
    if (names.includes('arohexis')) expect(await mainEventCount(page)).toBe(0);
  });

  test('Explore the demo from step 1 opens the demo', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Explore the demo' }).click();
    await expect(page.getByRole('region', { name: 'Demo' })).toBeVisible();
  });

  test.describe('with reduced motion', () => {
    test.use({ reducedMotion: 'reduce' });
    test('the hero rests at once and stays at rest', async ({ page }) => {
      await page.goto('/welcome');
      // The final frame is drawn once, and the loop never starts.
      const canvas = page.locator('canvas[data-field-ms]');
      await expect(canvas).toBeAttached();
      await page.waitForTimeout(1500);
      await expect(canvas).toHaveAttribute('data-loop', 'idle');
    });
  });

  test.describe('with the renderer chunk blocked', () => {
    test.use({ serviceWorkers: 'block' });
    test('the hero keeps its label, Next and the demo still work', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => {
        if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|brain-/.test(m.text()))
          errors.push(m.text());
      });
      await page.route('**/assets/brain-*.js', (r) => r.abort());
      await page.goto('/welcome');
      await expect(page.getByRole('img', { name: /sample starts/ })).toBeVisible();
      await page.getByRole('button', { name: 'Next' }).click();
      await expect(page.getByRole('button', { name: 'Start fresh' })).toBeVisible();
      await page.goto('/welcome');
      await page.getByRole('button', { name: 'Explore the demo' }).click();
      await expect(page.getByRole('region', { name: 'Demo' })).toBeVisible();
      expect(errors).toEqual([]);
    });
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

for (const route of ['/welcome', '/settings/data'] as const) {
  test(`${route} is accessible`, async ({ page }) => {
    await page.goto(route);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectAccessible(page);
  });
}
