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
