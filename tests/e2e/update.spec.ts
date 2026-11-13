import { expect, test, type Page, type Route } from '@playwright/test';

const ready = 'A new version is ready.';

async function controlled(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 15_000,
  });
}

async function noScroll(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight);
}

test.use({ viewport: { width: 375, height: 667 } });

test('update card waits outside the flow and Reload applies the new version', async ({
  page,
  context,
}, testInfo) => {
  test.skip(testInfo.project.name === 'iphone', 'WebKit service worker support is checked by hand');
  // Chromium does not route the service worker's update check, only its first fetch.
  // So the first install gets a trailing comment, and the update then fetches the real
  // file: different bytes, which is what a new deploy looks like.
  const route = async (r: Route) => {
    const response = await r.fetch();
    await r.fulfill({ response, body: `${await response.text()}\n// installed-first` });
  };
  await context.route('**/sw.js', route);
  await page.goto('/');
  await controlled(page);
  // A page that was already controlled when it loaded, as on every later visit.
  // workbox-window only reloads on takeover when that is true.
  await page.reload();
  await controlled(page);
  await expect(page.getByText(ready)).toHaveCount(0);

  await context.unroute('**/sw.js', route);
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  });

  const stuck = page.getByRole('button', { name: "I'm stuck" });
  await expect(page.getByText(ready)).toBeVisible({ timeout: 15_000 });
  await expect(stuck).toBeInViewport({ ratio: 1 });
  expect(await noScroll(page)).toBe(true);

  await stuck.click();
  await expect(page).toHaveURL(/\/stuck$/);
  await expect(page.getByText(ready)).toHaveCount(0);

  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByText(ready)).toBeVisible({ timeout: 15_000 });

  const marker = await page.evaluate(() => {
    (window as unknown as { __before: boolean }).__before = true;
    return true;
  });
  expect(marker).toBe(true);
  await page.getByRole('button', { name: 'Reload' }).click();
  await page.waitForFunction(() => !('__before' in window), undefined, { timeout: 15_000 });
  await expect(page.getByRole('heading', { level: 1, name: 'Arohexis' })).toBeAttached();
  await expect(page.getByText(ready)).toHaveCount(0);
});

test.describe('worst case: update card and notice together, with the install note waiting', () => {
  test.use({
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1',
  });

  test('Home keeps the stuck button in the thumb zone without scrolling', async ({
    page,
    context,
  }, testInfo) => {
    test.skip(
      testInfo.project.name === 'iphone',
      'WebKit service worker support is checked by hand',
    );
    const route = async (r: Route) => {
      const response = await r.fetch();
      await r.fulfill({ response, body: `${await response.text()}\n// installed-first` });
    };
    await context.route('**/sw.js', route);
    await page.goto('/');
    await controlled(page);
    await page.reload();
    await controlled(page);
    await context.unroute('**/sw.js', route);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });
    await expect(page.getByText(ready)).toBeVisible({ timeout: 15_000 });
    // Brings a notice to Home too.
    await page.getByRole('button', { name: "I'm stuck" }).click();
    await page.getByRole('button', { name: 'Anxious' }).click();
    await page.getByRole('button', { name: 'Not now' }).click();
    await expect(page.getByText(/That's fine/)).toBeVisible();
    // The install note only shows while the database is empty, so empty it behind the
    // app's back and reload. The notice survives a reload in the history state.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('arohexis');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const tx = open.result.transaction('events', 'readwrite');
            tx.objectStore('events').clear();
            tx.oncomplete = () => {
              open.result.close();
              resolve();
            };
          };
        }),
    );
    await page.reload();
    await expect(page.getByText(/That's fine/)).toBeVisible();
    await expect(page.getByText(ready)).toBeVisible({ timeout: 15_000 });
    // Home shows one card (ADR-035): the update card, with the install note waiting.
    await expect(page.getByText(/add Arohexis to your Home Screen/)).toHaveCount(0);
    await expect(
      page.getByRole('region', { name: 'Brain space' }).getByText(/That's fine/),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: "I'm stuck" })).toBeInViewport({ ratio: 1 });
    expect(await noScroll(page)).toBe(true);
    // A compact single row: message and Reload share a line at 375px.
    const card = await page.getByText(ready).locator('..').boundingBox();
    expect(card?.height).toBeLessThanOrEqual(72);
  });
});
