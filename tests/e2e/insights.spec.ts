import { expect, test, type Page } from '@playwright/test';
import { startEvents } from './fixtures/brain';
import { expectAccessible, seedEvents } from './helpers';

// A Sunday, the default check-in day.
const SUNDAY = Date.parse('2026-11-15T10:00:00Z');

async function ready(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
}

async function answerAll(page: Page, point: number): Promise<void> {
  for (const group of await page.getByRole('group').all()) {
    await group.getByLabel(`${point} of 7`).check();
  }
}

test('a start tagged with a part appears under Parts in Insights', async ({ page }) => {
  await ready(page);
  await seedEvents(page, startEvents({ now: Date.now(), tagged: [], untagged: 2, undone: 0 }));
  await page.getByRole('button', { name: 'Light a line' }).click();
  await page.getByRole('button', { name: 'Anxious' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Work', exact: true }).click();
  await page.getByRole('button', { name: 'Done for now' }).click();

  await page.getByRole('link', { name: 'Insights' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible();
  const parts = page.getByRole('table', { name: 'Parts' });
  await expect(parts.getByRole('row', { name: 'Work 1' })).toBeAttached();
  await expect(parts.getByRole('row', { name: 'No part 2' })).toBeAttached();
  await expect(page.getByText('3 starts over 1 week, 3 this week.')).toBeVisible();
});

test('fewer than three starts shows the calm empty state', async ({ page }) => {
  await ready(page);
  await seedEvents(page, startEvents({ now: Date.now(), tagged: [], untagged: 2, undone: 1 }));
  await page.goto('/insights');
  await expect(page.getByText('Insights appear after a few starts.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Starts per week' })).toHaveCount(0);
});

test.describe('check-in', () => {
  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: SUNDAY });
    await ready(page);
    await seedEvents(page, startEvents({ now: SUNDAY, tagged: [], untagged: 3, undone: 0 }));
    // The make-a-plan offer outranks the check-in, so it is set aside first.
    await page
      .getByRole('region', { name: 'Make a plan' })
      .getByRole('button', { name: 'Not now' })
      .click();
  });

  test('is due on Home, and the submitted week shows in the trend', async ({ page }) => {
    const card = page.getByRole('region', { name: 'Weekly check-in' });
    await expect(card).toBeVisible();
    await card.getByRole('link', { name: 'Check in' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Weekly check-in' })).toBeVisible();
    await expect(page.getByText('Adapted from the Self-Report Behavioural')).toBeVisible();
    const submit = page.getByRole('button', { name: 'Submit' });
    await expect(submit).toBeDisabled();
    await answerAll(page, 5);
    await submit.click();

    await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible();
    const trend = page.getByRole('table', { name: 'How automatic starting feels' });
    await expect(trend.getByRole('row', { name: '2026-11-15 5.0' })).toBeAttached();
    await page.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(page.getByRole('region', { name: 'Weekly check-in' })).toHaveCount(0);
  });

  test('Skip this week rests the card', async ({ page }) => {
    await page.getByRole('link', { name: 'Check in' }).click();
    await page.getByRole('button', { name: 'Skip this week' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
    await expect(page.getByRole('region', { name: 'Weekly check-in' })).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
    await expect(page.getByRole('button', { name: 'Light a line' })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Weekly check-in' })).toHaveCount(0);
  });

  test('the radio groups work from the keyboard', async ({ page }) => {
    await page.goto('/checkin');
    const first = page.getByRole('group').first();
    await first.getByLabel('1 of 7').focus();
    await page.keyboard.press('ArrowRight');
    await expect(first.getByLabel('2 of 7')).toBeChecked();
  });
});

test(`Insights and Check-in are accessible`, async ({ page }) => {
  await page.clock.install({ time: SUNDAY });
  await ready(page);
  await seedEvents(
    page,
    startEvents({ now: SUNDAY, tagged: [['work', 'Work', 2]], untagged: 2, undone: 0 }),
  );
  await expectAccessible(page);
  await page.goto('/checkin');
  await expect(page.getByRole('button', { name: 'Submit' })).toBeVisible();
  await expectAccessible(page);
  await answerAll(page, 4);
  await expectAccessible(page);
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Insights' })).toBeVisible();
  await expectAccessible(page);
  await page.goto('/insights');
  await expect(page.getByRole('heading', { name: 'Starts per week' })).toBeVisible();
  await expectAccessible(page);
});

test.describe('Insights leads somewhere', () => {
  test.use({ timezoneId: 'UTC' });
  const EVENING = Date.parse('2026-11-17T21:30:00Z');

  test.beforeEach(async ({ page }) => {
    await page.clock.install({ time: EVENING });
    await ready(page);
  });

  test('puts how automatic starting feels first', async ({ page }) => {
    await seedEvents(page, startEvents({ now: EVENING, tagged: [], untagged: 5, undone: 0 }));
    await page.goto('/insights');
    await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(
      'How automatic starting feels',
    );
  });

  test('offers a plan for the most common hour, with the time prefilled', async ({ page }) => {
    await seedEvents(page, startEvents({ now: EVENING, tagged: [], untagged: 5, undone: 0 }));
    await page.goto('/insights');
    await expectAccessible(page);
    await page.getByRole('link', { name: 'Make a plan for around 9 PM' }).click();
    await expect(page).toHaveURL(/\/plans\/new$/);
    await expect(page.getByLabel('Time')).toHaveValue('21:00');
  });

  test('waits for enough starts before offering it', async ({ page }) => {
    await seedEvents(page, startEvents({ now: EVENING, tagged: [], untagged: 4, undone: 0 }));
    await page.goto('/insights');
    await expect(page.getByRole('heading', { name: 'When you start' })).toBeVisible();
    await expect(page.getByRole('link', { name: /Make a plan for around/ })).toHaveCount(0);
  });
});
