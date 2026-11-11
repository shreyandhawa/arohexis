import { expect, test } from '@playwright/test';
import { expectAccessible, setTheme } from './helpers';

test('home shows one large stuck button', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', { name: "I'm stuck" });
  await expect(button).toHaveCount(1);
  const box = await button.boundingBox();
  expect(box?.width).toBeGreaterThanOrEqual(48);
  expect(box?.height).toBeGreaterThanOrEqual(48);
});

test('S opens the stuck flow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'keyboard shortcut is desktop only');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('s');
  await expect(page).toHaveURL(/\/stuck$/);
});

test('S is ignored while typing', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'keyboard shortcut is desktop only');
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'Temporary field');
    document.body.appendChild(input);
    input.focus();
  });
  await page.keyboard.press('s');
  await expect(page).toHaveURL(/\/about$/);
  await expect(page.getByLabel('Temporary field')).toHaveValue('s');
});

test('about shows the not-medical-advice note', async ({ page }) => {
  await page.goto('/about');
  await expect(
    page.getByText(
      "Arohexis is a self-help tool, not medical advice. It doesn't diagnose or treat ADHD, depression, anxiety or any other condition. If procrastination is seriously affecting your life, consider talking to a qualified professional.",
    ),
  ).toBeVisible();
});

test('settings links to data and about', async ({ page }) => {
  await page.goto('/settings');
  await expect(page.getByRole('link', { name: 'Data' })).toBeVisible();
  await page.getByRole('link', { name: 'About' }).click();
  await expect(page).toHaveURL(/\/about$/);
});

for (const scheme of ['light', 'dark'] as const) {
  test(`home and about are accessible in ${scheme}`, async ({ page }) => {
    await setTheme(page, scheme);
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectAccessible(page);
    await page.goto('/about');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectAccessible(page);
  });
}

test('storage failure shows a calm message', async ({ page }) => {
  await page.addInitScript(() => {
    // Dexie also looks for the vendor-prefixed names, so remove those too.
    const names = ['indexedDB', 'webkitIndexedDB', 'mozIndexedDB', 'msIndexedDB'];
    for (const name of names) {
      try {
        delete (window as unknown as Record<string, unknown>)[name];
      } catch {
        // not configurable; fall through
      }
      if (name in window) {
        Object.defineProperty(window, name, { value: undefined, configurable: true });
      }
    }
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: "Can't save on this device" })).toBeVisible();
});

for (const path of ['/settings', '/about']) {
  test(`stuck button is visible without scrolling on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.getByRole('button', { name: "I'm stuck" })).toBeInViewport({ ratio: 1 });
  });
}

for (const path of ['/stuck']) {
  test(`stuck button is absent on ${path}`, async ({ page }) => {
    await page.goto(path);
    await expect(page.getByRole('button', { name: "I'm stuck" })).toHaveCount(0);
  });
}

test('stuck button does not cover the end of the about page', async ({ page }) => {
  await page.goto('/about');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const last = page.locator('main li').last();
  const button = page.getByRole('button', { name: "I'm stuck" });
  await expect(button).toBeInViewport({ ratio: 1 });
  await expect(last).toBeInViewport({ ratio: 1 });
  const lastBox = await last.boundingBox();
  const buttonBox = await button.boundingBox();
  expect(lastBox && buttonBox && lastBox.y + lastBox.height <= buttonBox.y).toBe(true);
});

test('iPhone Safari tab sees the install note without losing the thumb zone', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone', 'the note is for iOS Safari only');
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto('/');
  await expect(page.getByText(/add Arohexis to your Home Screen/)).toBeVisible();
  await expect(page.getByRole('button', { name: "I'm stuck" })).toBeInViewport({ ratio: 1 });
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
  ).toBe(true);
});

test('the install note goes away once the database has data', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'iphone', 'the note is for iOS Safari only');
  await page.goto('/');
  await expect(page.getByText(/add Arohexis to your Home Screen/)).toBeVisible();
  await page.getByRole('button', { name: "I'm stuck" }).click();
  await page.getByRole('button', { name: 'Anxious' }).click();
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByText(/That's fine/)).toBeVisible();
  await expect(page.getByText(/add Arohexis to your Home Screen/)).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('button', { name: "I'm stuck" })).toBeVisible();
  await expect(page.getByText(/add Arohexis to your Home Screen/)).toHaveCount(0);
});

test('other browsers do not see the install note', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === 'iphone', 'iOS Safari shows it');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect(page.getByText(/add Arohexis to your Home Screen/)).toHaveCount(0);
});
