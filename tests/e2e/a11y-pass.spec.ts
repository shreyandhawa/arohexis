import { expect, test, type Page } from '@playwright/test';

/** Tabs until the focused element's name matches, then presses Enter. */
async function tabTo(page: Page, name: string): Promise<void> {
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('Tab');
    const label = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null;
      return (el?.getAttribute('aria-label') ?? el?.textContent ?? '').trim();
    });
    if (label === name) {
      await page.keyboard.press('Enter');
      return;
    }
  }
  throw new Error(`Never reached "${name}" with Tab`);
}

async function heading(page: Page, name: string): Promise<void> {
  await expect(page.getByRole('heading', { level: 1, name })).toBeVisible();
}

test.describe('keyboard only', () => {
  test.skip(({ isMobile }) => isMobile, 'desktop only');

  test('the stuck flow and the main screens work without a pointer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: "I'm stuck" })).toBeVisible();
    await tabTo(page, "I'm stuck");
    await tabTo(page, 'Anxious');
    await tabTo(page, 'Start');
    await expect(page).toHaveURL(/\/started\//);
    await tabTo(page, 'Done for now');
    await expect(page.getByRole('button', { name: "I'm stuck" })).toBeVisible();
    for (const [link, title] of [
      ['Plans', 'Plans'],
      ['Home', ''],
      ['Insights', 'Insights'],
      ['Home', ''],
      ['Settings', 'Settings'],
    ] as const) {
      await tabTo(page, link);
      if (title) await heading(page, title);
      else await expect(page.getByRole('button', { name: "I'm stuck" })).toBeVisible();
    }
  });
});

const ROUTES = [
  '/',
  '/plans',
  '/plans/new',
  '/insights',
  '/checkin',
  '/settings',
  '/settings/parts',
  '/settings/feelings',
  '/settings/obstacles',
  '/settings/data',
  '/about',
  '/stuck',
];

test('no horizontal scroll at 320 px on any top-level route', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  for (const path of ROUTES) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeAttached();
    const over = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(over, path).toBeLessThanOrEqual(0);
  }
});

test.describe('200% zoom', () => {
  test.use({ viewport: { width: 640, height: 800 }, deviceScaleFactor: 2 });

  for (const path of ['/', '/settings']) {
    test(`no clipped controls on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole('heading', { level: 1 }).first()).toBeAttached();
      const clipped = await page.evaluate(() => {
        const w = document.documentElement.clientWidth;
        const bad: string[] = [];
        for (const el of document.querySelectorAll<HTMLElement>(
          'a, button, input, select, textarea, [role=button]',
        )) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue;
          if (r.left < -0.5 || r.right > w + 0.5) bad.push(el.textContent?.trim() ?? el.tagName);
          if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflow !== 'visible')
            bad.push(`clipped: ${el.textContent?.trim() ?? el.tagName}`);
        }
        return bad;
      });
      expect(clipped).toEqual([]);
    });
  }
});
