import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, seedPlans, setTheme } from './helpers';

test.use({ timezoneId: 'UTC' });

// Monday 2026-11-09, 08:00 UTC.
const T0 = Date.UTC(2026, 10, 9, 8, 0);
const MIN = 60_000;
const DAY = 24 * 60 * MIN;
const SENTENCE = "If it's 9:00 on weekdays at my desk, then I will open the essay doc.";

const plan = (over: Record<string, unknown> = {}) => ({
  id: 'plan-1',
  place: 'my desk',
  firstAction: 'open the essay doc',
  time: '09:00',
  days: [1, 2, 3, 4, 5],
  graceMin: 90,
  active: true,
  createdAt: T0 - 10 * MIN,
  editCount: 0,
  partId: 'work',
  ...over,
});

const region = (page: Page) => page.getByRole('region', { name: 'Brain space' });
const sheet = (page: Page) => page.getByRole('dialog');

async function allEvents(page: Page): Promise<{ type: string; outcome?: string }[]> {
  return page.evaluate(
    () =>
      new Promise<{ type: string; outcome?: string }[]>((resolve, reject) => {
        const open = indexedDB.open('arohexis');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const req = open.result.transaction('events').objectStore('events').getAll();
          req.onsuccess = () => resolve(req.result as { type: string }[]);
          req.onerror = () => reject(req.error);
        };
      }),
  );
}

/** Opens Home on a fixed clock, once the database exists, then seeds plans. */
async function homeWithPlans(page: Page, plans: readonly object[], at = T0): Promise<void> {
  await page.clock.install({ time: at });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
  await seedPlans(page, plans);
  await expect(region(page)).toBeVisible();
}

async function createPlanInApp(page: Page): Promise<void> {
  await page.clock.install({ time: T0 });
  await page.goto('/plans/new');
  await page.getByLabel('Place', { exact: true }).fill('my desk');
  await page.getByLabel('First action').fill('open the essay doc');
  await page.getByLabel('Part (optional)').selectOption('work');
  await page.getByRole('button', { name: 'Save plan' }).click();
  await expect(page.getByRole('link', { name: SENTENCE })).toBeVisible();
}

async function backHome(page: Page): Promise<void> {
  await page.getByRole('link', { name: 'Home', exact: true }).click();
}

const startNow = (page: Page) => page.getByRole('button', { name: 'Start now' });

test('scenario 6: a plan made in the app opens its card, and Start now is a linked start', async ({
  page,
}) => {
  await createPlanInApp(page);
  await backHome(page);
  await expect(startNow(page)).toHaveCount(0);
  await page.clock.fastForward('50:00');
  const card = page.getByRole('region', { name: 'Plan due now' });
  await expect(card).toContainText('9:00 · at my desk');
  await expect(card).toContainText('Open the essay doc');
  await startNow(page).click();
  await expect(page).toHaveURL(/\/started\//);
  await expect(page.getByRole('button', { name: 'Work', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  const types = (await allEvents(page)).map((e) => e.type);
  expect(types).toEqual(expect.arrayContaining(['attempt.opened', 'start.made', 'start.tagged']));
  await page.getByRole('button', { name: 'Done for now' }).click();
  await expect(startNow(page)).toHaveCount(0);
});

test('scenario 6: past the grace time the repair sheet opens, and repairing updates the plan', async ({
  page,
}) => {
  await createPlanInApp(page);
  await backHome(page);
  await page.clock.fastForward('03:00:00');
  await expect(sheet(page)).toBeVisible();
  await expect(sheet(page)).toContainText("This one didn't happen: 9:00 · open the essay doc.");
  await expect(sheet(page)).toContainText(
    "That's part of learning anything. It's information, not a verdict.",
  );
  await sheet(page).getByRole('button', { name: 'Not this time' }).click();
  await expect(sheet(page)).toContainText('What got in the way?');
  await sheet(page).getByRole('button', { name: 'Low energy' }).click();
  await expect(sheet(page)).toContainText('What would help next time?');
  await sheet(page).getByRole('button', { name: 'Make the first step smaller' }).click();
  await sheet(page).getByLabel('New first action').fill('open the doc');
  await sheet(page).getByRole('button', { name: 'Save', exact: true }).click();
  await expect(sheet(page)).toContainText('Plan updated.');
  await expect(sheet(page).getByRole('button', { name: 'Two minutes now?' })).toBeVisible();
  const repaired = (await allEvents(page)).filter((e) => e.type === 'lapse.repaired');
  expect(repaired).toHaveLength(1);
  await sheet(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(sheet(page)).toBeHidden();
  const outcomes = (await allEvents(page)).filter((e) => e.type === 'occurrence.resolved');
  expect(outcomes).toHaveLength(0);
  await page.getByRole('link', { name: 'Plans' }).click();
  await expect(
    page.getByRole('link', {
      name: "If it's 9:00 on weekdays at my desk, then I will open the doc.",
    }),
  ).toBeVisible();
});

test('Two minutes now? starts the first step, off cue', async ({ page }) => {
  await homeWithPlans(page, [plan()]);
  await page.clock.fastForward('03:00:00');
  await sheet(page).getByRole('button', { name: 'Not this time' }).click();
  await sheet(page).getByRole('button', { name: 'Skip' }).click();
  await sheet(page).getByRole('button', { name: 'Keep the plan' }).click();
  await sheet(page).getByRole('button', { name: 'Two minutes now?' }).click();
  await expect(page).toHaveURL(/\/started\//);
  const opened = (await allEvents(page)).filter((e) => e.type === 'attempt.opened');
  expect(opened).toHaveLength(1);
  expect(opened[0]).not.toHaveProperty('occurrence');
});

test('closing the sheet records slipped, and it does not come back', async ({ page }) => {
  await homeWithPlans(page, [plan()]);
  await page.clock.fastForward('03:00:00');
  await expect(sheet(page)).toBeVisible();
  await sheet(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(sheet(page)).toBeHidden();
  await expect
    .poll(
      async () =>
        (await allEvents(page)).filter(
          (e) => e.type === 'occurrence.resolved' && e.outcome === 'slipped',
        ).length,
    )
    .toBe(1);
  await page.clock.fastForward('01:00');
  await expect(sheet(page)).toBeHidden();
});

test('scenario 7: several slipped occurrences give one prompt, and the rest expire', async ({
  page,
}) => {
  // Friday 2026-11-13, noon: eight weekday occurrences have slipped since the plan began.
  const friday = Date.UTC(2026, 10, 13, 12, 0);
  await homeWithPlans(page, [plan({ createdAt: friday - 10 * DAY })], friday);
  await expect(sheet(page)).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(1);
  await expect
    .poll(
      async () => (await allEvents(page)).filter((e) => e.type === 'occurrence.resolved').length,
    )
    .toBe(7);
  await sheet(page).getByRole('button', { name: 'Close', exact: true }).click();
  await expect(sheet(page)).toBeHidden();
  await expect
    .poll(async () => {
      const resolved = (await allEvents(page)).filter((e) => e.type === 'occurrence.resolved');
      return [resolved.filter((e) => e.outcome === 'slipped').length, resolved.length];
    })
    .toEqual([1, 8]);
  await page.clock.fastForward('01:00');
  await expect(sheet(page)).toBeHidden();
});

test('I am stuck on this runs the stuck flow with the plan linked', async ({ page }) => {
  await homeWithPlans(page, [plan()]);
  await page.clock.fastForward('50:00');
  await page.getByRole('button', { name: "I'm stuck on this" }).click();
  await page.getByRole('button', { name: 'Anxious' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page).toHaveURL(/\/started\//);
  const events = await allEvents(page);
  const opened = events.find((e) => e.type === 'attempt.opened');
  expect(opened).toMatchObject({ source: 'plan', planId: 'plan-1', occurrence: '2026-11-09' });
  expect(events.find((e) => e.type === 'start.made')).toMatchObject({ planId: 'plan-1' });
  await expect(page.getByRole('button', { name: 'Work', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test('an on-cue start brightens its plan line, and an off-cue start leaves a start line', async ({
  page,
}) => {
  await homeWithPlans(page, [plan()]);
  const work = region(page).getByText(/^Work:/);
  await expect(work).toHaveText('Work: 0 starts. Plan lines: Waiting, 0 starts on cue.');

  // Off cue: a plain stuck start, tagged Work.
  await page.getByRole('button', { name: "I'm stuck", exact: true }).click();
  await page.getByRole('button', { name: 'Anxious' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Work', exact: true }).click();
  await page.getByRole('button', { name: 'Done for now' }).click();
  await expect(work).toHaveText(
    'Work: 1 start. Plan lines: Waiting, 0 starts on cue. 1 start line.',
  );

  // On cue: Start now while the occurrence is open.
  await page.clock.fastForward('50:00');
  await startNow(page).click();
  await page.getByRole('button', { name: 'Done for now' }).click();
  await expect(work).toHaveText('Work: 2 starts. Plan lines: New, 1 start on cue. 1 start line.');
});

test('the part card lists its plans: Next while waiting, Start now while open', async ({
  page,
}) => {
  await homeWithPlans(page, [plan()]);
  await page.getByRole('button', { name: 'Work', exact: true }).click();
  await expect(sheet(page)).toContainText(SENTENCE);
  await expect(sheet(page)).toContainText('Next: 9:00 today');
  await expect(sheet(page).getByRole('button', { name: 'Start now' })).toHaveCount(0);
  await expect(sheet(page)).toContainText('Make the plan');
  await sheet(page).getByRole('button', { name: 'Close', exact: true }).click();
  await page.clock.fastForward('50:00');
  await page.getByRole('button', { name: 'Work', exact: true }).click();
  await sheet(page).getByRole('button', { name: 'Start now' }).click();
  await expect(page).toHaveURL(/\/started\//);
});

test.describe('layout at 375x667', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('Home with the due card does not scroll and keeps I am stuck in view', async ({ page }) => {
    await homeWithPlans(page, [plan()]);
    await page.clock.fastForward('50:00');
    const card = page.getByRole('region', { name: 'Plan due now' });
    await expect(card).toBeVisible();
    const box = await card.boundingBox();
    expect(box?.height).toBeLessThanOrEqual(180);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
    ).toBe(true);
    await expect(page.getByRole('button', { name: "I'm stuck", exact: true })).toBeInViewport({
      ratio: 1,
    });
    for (const name of ['Start now', "I'm stuck on this"]) {
      const b = await page.getByRole('button', { name }).boundingBox();
      expect(b?.height).toBeGreaterThanOrEqual(48);
    }
  });

  test('the stuck flow from Home to the timer is still three taps with a plan due', async ({
    page,
  }) => {
    await homeWithPlans(page, [plan()]);
    await page.clock.fastForward('50:00');
    await page.getByRole('button', { name: "I'm stuck", exact: true }).click();
    await page.getByRole('button', { name: 'Anxious' }).click();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(page).toHaveURL(/\/started\//);
  });
});

for (const scheme of ['light', 'dark'] as const) {
  test(`the due card, the repair sheet and the part card are accessible in ${scheme}`, async ({
    page,
  }) => {
    await setTheme(page, scheme);
    await homeWithPlans(page, [plan()]);
    await page.clock.fastForward('50:00');
    await expect(startNow(page).first()).toBeVisible();
    await expectAccessible(page);

    await page.getByRole('button', { name: 'Work', exact: true }).click();
    await expect(sheet(page)).toContainText(SENTENCE);
    await expectAccessible(page);
    await sheet(page).getByRole('button', { name: 'Close', exact: true }).click();

    await page.clock.fastForward('03:00:00');
    await expect(sheet(page)).toBeVisible();
    await expectAccessible(page);
    await sheet(page).getByRole('button', { name: 'Not this time' }).click();
    await expectAccessible(page);
    await sheet(page).getByRole('button', { name: 'Low energy' }).click();
    await sheet(page).getByRole('button', { name: 'Move the time' }).click();
    await expectAccessible(page);
  });
}
