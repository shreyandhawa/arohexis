import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { parseExport } from '../../src/domain/exportFormat';
import { expectAccessible } from './helpers';

test.beforeEach(({ page }, testInfo) => {
  void page;
  test.skip(testInfo.project.name === 'iphone', 'the iOS share sheet is checked by hand');
});

async function openData(page: Page): Promise<void> {
  await page.goto('/settings/data');
  await expect(page.getByRole('heading', { name: 'Back up your data' })).toBeVisible();
}

test('exports a valid backup', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: "I'm stuck" }).click();
  await page.getByRole('button', { name: 'Anxious' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Started.', { exact: true })).toBeVisible();

  await openData(page);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^arohexis-export-\d{4}-\d{2}-\d{2}\.json$/);
  const path = await download.path();
  const parsed = parseExport(JSON.parse(await readFile(path, 'utf8')));
  expect(parsed.ok).toBe(true);
  if (parsed.ok) {
    expect(parsed.file.data.events.filter((e) => e.type === 'start.made')).toHaveLength(1);
  }
});

test('shows last backup today', async ({ page }) => {
  await openData(page);
  await expect(page.getByText('No backup yet')).toBeVisible();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  await downloading;
  await expect(page.getByText('Last backup: today')).toBeVisible();
});

const IPHONE_UA =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

/** Stubs the share sheet and records the name of each file it is given. */
async function stubShare(page: Page, behaviour: 'resolve' | 'abort'): Promise<void> {
  await page.addInitScript((mode) => {
    const w = window as unknown as { __shared: string[] };
    w.__shared = [];
    navigator.canShare = () => true;
    navigator.share = (data?: ShareData) => {
      w.__shared.push(data?.files?.[0]?.name ?? '');
      return mode === 'abort'
        ? Promise.reject(new DOMException('cancelled', 'AbortError'))
        : Promise.resolve();
    };
  }, behaviour);
}

test.describe('on an iPhone', () => {
  test.use({ userAgent: IPHONE_UA });

  test('shares the backup file instead of downloading', async ({ page }) => {
    await stubShare(page, 'resolve');
    let downloaded = false;
    page.on('download', () => (downloaded = true));
    await openData(page);
    await page.getByRole('button', { name: 'Export backup' }).click();
    await expect(page.getByText('Last backup: today')).toBeVisible();
    expect(await page.evaluate(() => (window as never as { __shared: string[] }).__shared)).toEqual(
      [expect.stringMatching(/^arohexis-export-\d{4}-\d{2}-\d{2}\.json$/)],
    );
    expect(downloaded).toBe(false);
  });

  test('a cancelled share sheet records nothing', async ({ page }) => {
    await stubShare(page, 'abort');
    await openData(page);
    await page.getByRole('button', { name: 'Export backup' }).click();
    await expect(page.getByRole('button', { name: 'Export backup' })).toBeEnabled();
    await expect(page.getByText('No backup yet')).toBeVisible();
  });
});

test('downloads when the browser can share but the device is not an iPhone or iPad', async ({
  page,
}) => {
  await stubShare(page, 'resolve');
  await openData(page);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  await downloading;
  expect(await page.evaluate(() => (window as never as { __shared: string[] }).__shared)).toEqual(
    [],
  );
});

test.describe('at 375x667', () => {
  test.use({ viewport: { width: 375, height: 667 } });
  test('data screen fits without scrolling', async ({ page }) => {
    await openData(page);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
    ).toBe(true);
  });
});

test('data screen is accessible', async ({ page }) => {
  await openData(page);
  await expectAccessible(page);
});
