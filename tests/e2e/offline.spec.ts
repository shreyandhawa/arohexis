import { expect, test, type Page } from '@playwright/test';

function skipIphone(project: string): void {
  test.skip(project === 'iphone', 'WebKit service worker support is checked by hand');
}

async function swReady(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  // The first load must be controlled before going offline.
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, undefined, {
    timeout: 15_000,
  });
}

async function completeStuckFlow(page: Page): Promise<void> {
  await page.getByRole('button', { name: "I'm stuck" }).click();
  await page.getByRole('button', { name: 'Anxious' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Started.', { exact: true })).toBeVisible();
}

test('works offline after first load', async ({ page, context }, testInfo) => {
  skipIphone(testInfo.project.name);
  await page.goto('/');
  await swReady(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1, name: 'Arohexis' })).toBeVisible();
  await completeStuckFlow(page);
  await page.goto('/');
  await expect(page.getByText('1 start this week')).toBeVisible();

  // Spec §13 scenario 4: back online, the app keeps working with nothing lost.
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText('1 start this week')).toBeVisible();
  await completeStuckFlow(page);
  await page.goto('/');
  await expect(page.getByText('2 starts this week')).toBeVisible();
});

test('data survives reload and a new page', async ({ page, context }, testInfo) => {
  skipIphone(testInfo.project.name);
  await page.goto('/');
  await swReady(page);
  await completeStuckFlow(page);
  await page.goto('/');
  await expect(page.getByText('1 start this week')).toBeVisible();
  await page.reload();
  await expect(page.getByText('1 start this week')).toBeVisible();
  const second = await context.newPage();
  await second.goto('/');
  await expect(second.getByText('1 start this week')).toBeVisible();
});
