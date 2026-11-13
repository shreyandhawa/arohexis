import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, setTheme } from './helpers';

const SENTENCE = "If it's 9:00 on weekdays at my desk, then I will open the essay doc.";

async function fill(page: Page): Promise<void> {
  await page.goto('/plans/new');
  await expect(page.getByRole('heading', { level: 1, name: 'New plan' })).toBeVisible();
  await page.getByLabel('Place', { exact: true }).fill('my desk');
  await page.getByLabel('First action').fill('open the essay doc');
}

test('create a plan, see the sentence, save, list it, and download the .ics', async ({ page }) => {
  await page.goto('/settings');
  await page.getByRole('link', { name: 'Plans' }).click();
  await expect(page.getByText('No plans yet')).toBeVisible();
  await page.getByRole('link', { name: 'New plan' }).click();
  await page.getByLabel('Place', { exact: true }).fill('my desk');
  await expect(page.getByTestId('plan-preview')).toHaveText(
    "If it's 9:00 on weekdays at my desk, then I will your first step.",
  );
  await page.getByLabel('First action').fill('open the essay doc');
  await expect(page.getByTestId('plan-preview')).toHaveText(SENTENCE);
  await page.getByRole('button', { name: 'Save plan' }).click();

  await expect(page.getByRole('heading', { level: 1, name: 'Plans' })).toBeVisible();
  await expect(page.getByRole('link', { name: SENTENCE })).toBeVisible();
  await expect(page.getByText('Active')).toBeVisible();

  await page.getByRole('link', { name: SENTENCE }).click();
  await expect(page.getByText('The alarm opens your calendar, not Arohexis.')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Add to calendar' }).click();
  const file = await download;
  expect(file.suggestedFilename()).toBe('open-the-essay-doc.ics');
  const text = await readFile((await file.path()) as string, 'utf8');
  expect(text).toContain('BEGIN:VCALENDAR');
  expect(text).toContain('RRULE:FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR');
  expect(text).toContain('BEGIN:VALARM');

  await page.getByRole('button', { name: 'Pause this plan' }).click();
  await page.goto('/plans');
  await expect(page.getByText('Paused')).toBeVisible();
});

test('an empty first action is not saved', async ({ page }) => {
  await fill(page);
  await page.getByLabel('First action').fill('');
  await page.getByRole('button', { name: 'Save plan' }).click();
  await expect(page.getByText('Add a first action.')).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`plans screens are accessible in ${scheme}`, async ({ page }) => {
    await setTheme(page, scheme);
    await fill(page);
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Save plan' }).click();
    await expect(page.getByRole('link', { name: SENTENCE })).toBeVisible();
    await expectAccessible(page);
    await page.getByRole('link', { name: SENTENCE }).click();
    await expect(page.getByRole('button', { name: 'Add to calendar' })).toBeVisible();
    await expectAccessible(page);
  });
}
