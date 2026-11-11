import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, setTheme } from './helpers';

const stuck = "I'm stuck";
const startBtn = (page: Page) => page.getByRole('button', { name: 'Start', exact: true });

/** Waits for every running CSS animation (the reward settle, fades) to finish. */
async function settled(page: Page): Promise<void> {
  await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
}

async function fits(page: Page): Promise<boolean> {
  await settled(page);
  return page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight);
}

async function toResponse(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: stuck }).click();
  await page.getByRole('button', { name: 'Anxious' }).click();
  await expect(startBtn(page)).toBeVisible();
}

async function toStarted(page: Page): Promise<void> {
  await toResponse(page);
  await startBtn(page).click();
  await expect(page.getByText('Started.', { exact: true })).toBeVisible();
}

test.describe('at 375x667', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('reaches the timer in three taps without scrolling', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: stuck }).click();
    await expect(page.getByRole('heading', { name: "What's in the way?" })).toBeVisible();
    expect(await fits(page)).toBe(true);
    await page.getByRole('button', { name: 'Anxious' }).click();
    await expect(startBtn(page)).toBeVisible();
    expect(await fits(page)).toBe(true);
    await startBtn(page).click();
    await expect(page.getByText('Started.', { exact: true })).toBeVisible();
    await expect(page.getByText(/^(2:00|1:5\d)$/)).toBeVisible();
    expect(await fits(page)).toBe(true);
  });
});

test('rewards immediately and counts the start', async ({ page }) => {
  await toStarted(page);
  await expect(page.getByText("That's the hard part.")).toBeVisible();
  await expect(page.getByText('1 start this week')).toBeVisible();
});

test('undo removes the start', async ({ page }) => {
  await toStarted(page);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Start removed.')).toBeVisible();
  await expect(page.getByText(/starts? this week/)).toHaveCount(0);
});

test('remove this start after ten seconds', async ({ page }) => {
  await page.clock.install();
  await toStarted(page);
  await page.clock.fastForward('00:11');
  await expect(page.getByRole('button', { name: 'Remove this start' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Undo' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Remove this start' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('Start removed.')).toBeVisible();
});

test('tags the task', async ({ page }) => {
  await toStarted(page);
  const writing = page.getByRole('button', { name: 'Writing' });
  const study = page.getByRole('button', { name: 'Study' });
  await writing.click();
  await expect(writing).toHaveAttribute('aria-pressed', 'true');
  await study.click();
  await expect(study).toHaveAttribute('aria-pressed', 'true');
  await expect(writing).toHaveAttribute('aria-pressed', 'false');
});

test('timer end offers two equal choices', async ({ page }) => {
  await page.clock.install();
  await toStarted(page);
  await page.clock.fastForward('02:00');
  const keep = page.getByRole('button', { name: 'Keep going' });
  const done = page.getByRole('button', { name: 'Done for now' });
  await expect(keep).toBeVisible();
  await expect(done).toBeVisible();
  await expect(page.getByText('Either is good.')).toBeVisible();
  expect((await keep.boundingBox())?.height).toBe((await done.boundingBox())?.height);
  await keep.click();
  await expect(page).toHaveURL(/\/$/);
});

test('done for now is available before the timer ends', async ({ page }) => {
  await toStarted(page);
  await page.getByRole('button', { name: 'Done for now' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('1 start this week')).toBeVisible();
});

test('returning after the phone locks shows two minutes done', async ({ page }) => {
  await page.clock.install();
  await toStarted(page);
  await page.clock.fastForward('10:00');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByText('Two minutes done.')).toBeVisible();
  await expect(page.getByTestId('timer')).toHaveText('0:00');
});

test('double tap on Start counts once', async ({ page }) => {
  await toResponse(page);
  await startBtn(page).dblclick();
  await expect(page.getByText('1 start this week')).toBeVisible();
});

test('reload keeps one start and Back goes Home', async ({ page }) => {
  await toStarted(page);
  await page.reload();
  await expect(page.getByText('Started.', { exact: true })).toBeVisible();
  await expect(page.getByText('1 start this week')).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText('1 start this week')).toBeVisible();
});

test('not now returns Home with a calm line', async ({ page }) => {
  await toResponse(page);
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText("That's fine. The button's here when you need it.")).toBeVisible();
});

test('back from the feeling screen returns Home', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: stuck }).click();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: stuck })).toBeVisible();
});

test('the persistent stuck button is absent on Started', async ({ page }) => {
  await toStarted(page);
  await expect(page.getByRole('button', { name: stuck })).toHaveCount(0);
});

test('keyboard-only flow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'keyboard shortcuts are desktop only');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('s');
  await expect(page.getByRole('button', { name: 'Anxious' })).toBeEnabled();
  await page.keyboard.press('1');
  await expect(startBtn(page)).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/\/started\//);
  await expect(page.getByText('Started.', { exact: true })).toBeVisible();
});

test('reduced motion has no transforms', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await toStarted(page);
  const keyframes = await page.getByTestId('reward').evaluate((el) =>
    el.getAnimations().flatMap((a) => {
      const effect = a.effect as KeyframeEffect;
      return effect.getKeyframes().map((k) => Object.keys(k));
    }),
  );
  expect(keyframes.length).toBeGreaterThan(0);
  for (const props of keyframes) {
    expect(props.join(',')).not.toMatch(/transform|filter/);
  }
});

for (const scheme of ['light', 'dark'] as const) {
  test(`stuck screens are accessible in ${scheme}`, async ({ page }) => {
    await setTheme(page, scheme);
    await page.goto('/');
    await page.getByRole('button', { name: stuck }).click();
    await expect(page.getByRole('button', { name: 'Anxious' })).toBeEnabled();
    await settled(page);
    await expectAccessible(page);
    await page.getByRole('button', { name: 'Anxious' }).click();
    await expect(startBtn(page)).toBeVisible();
    await settled(page);
    await expectAccessible(page);
    await startBtn(page).click();
    await expect(page.getByText('Started.', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Writing' }).click();
    await settled(page);
    await expectAccessible(page);
  });
}
