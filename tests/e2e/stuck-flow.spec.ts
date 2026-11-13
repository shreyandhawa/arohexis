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

function attemptIdFromUrl(page: Page): string {
  return page.url().split('/').pop() ?? '';
}

/** Reads events of one type straight from IndexedDB. */
async function eventsOf(page: Page, type: string): Promise<{ attemptId?: string }[]> {
  return page.evaluate(
    (t) =>
      new Promise<{ attemptId?: string; type: string }[]>((resolve, reject) => {
        const open = indexedDB.open('arohexis');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const req = db.transaction('events').objectStore('events').getAll();
          req.onerror = () => reject(req.error);
          req.onsuccess = () => {
            db.close();
            resolve(
              (req.result as { attemptId?: string; type: string }[]).filter((e) => e.type === t),
            );
          };
        };
      }),
    type,
  );
}

/** Makes every IndexedDB write throw, as a full or broken store would. Reads still work. */
async function breakStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __add?: IDBObjectStore['add'] };
    w.__add = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = () => {
      throw new Error('storage unavailable');
    };
  });
}

async function fixStorage(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as unknown as { __add?: IDBObjectStore['add'] };
    if (w.__add) IDBObjectStore.prototype.add = w.__add;
  });
}

const failedCopy = "That didn't save. Try again.";

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

test.describe('parts row at 375px', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('the parts row is one line', async ({ page }) => {
    await toStarted(page);
    const tops = await page
      .getByRole('heading', { name: 'What is it?' })
      .locator('xpath=following-sibling::div[1]/button')
      .evaluateAll((chips) => chips.map((c) => (c as HTMLElement).offsetTop));
    expect(tops.length).toBe(5);
    expect(new Set(tops).size).toBe(1);
  });
});

test('tags the task', async ({ page }) => {
  await toStarted(page);
  const work = page.getByRole('button', { name: 'Work' });
  const study = page.getByRole('button', { name: 'Study' });
  await work.click();
  await expect(work).toHaveAttribute('aria-pressed', 'true');
  await study.click();
  await expect(study).toHaveAttribute('aria-pressed', 'true');
  await expect(work).toHaveAttribute('aria-pressed', 'false');
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
  const attemptId = attemptIdFromUrl(page);
  // Pause so no interval runs; only the visibilitychange handler may refresh.
  const before = await page.evaluate(() => Date.now());
  await page.clock.pauseAt(before + 1000);
  await page.clock.setSystemTime(before + 10 * 60 * 1000);
  await expect(page.getByTestId('timer')).not.toHaveText('0:00');
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
  await expect(page.getByText('Two minutes done.')).toBeVisible();
  await expect(page.getByTestId('timer')).toHaveText('0:00');
  await page.getByRole('button', { name: 'Done for now' }).click();
  await expect(page).toHaveURL(/\/$/);
  const closed = await eventsOf(page, 'timer.closed');
  expect(closed.filter((e) => e.attemptId === attemptId)).toHaveLength(1);
});

test('one minute left is announced but not shown', async ({ page }) => {
  await page.clock.install();
  await toStarted(page);
  await page.clock.fastForward('01:05');
  const live = page.locator('[aria-live="polite"]');
  await expect(live).toHaveText('One minute left.');
  const box = await live.getByText('One minute left.').boundingBox();
  expect(box?.width).toBeLessThanOrEqual(1);
});

test('double tap on Start counts once', async ({ page }) => {
  await toResponse(page);
  await startBtn(page).dblclick();
  await expect(page).toHaveURL(/\/started\//);
  const attemptId = attemptIdFromUrl(page);
  await expect(page.getByText('1 start this week')).toBeVisible();
  const made = await eventsOf(page, 'start.made');
  expect(made.filter((e) => e.attemptId === attemptId)).toHaveLength(1);
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

test('Esc goes back from Feeling and runs Not now on Response', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'keyboard shortcuts are desktop only');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('s');
  await expect(page.getByRole('button', { name: 'Anxious' })).toBeEnabled();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('button', { name: stuck })).toBeVisible();

  await page.keyboard.press('s');
  await expect(page.getByRole('button', { name: 'Anxious' })).toBeEnabled();
  await page.keyboard.press('1');
  await expect(startBtn(page)).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByText(/That's fine/)).toBeVisible();
  expect(await eventsOf(page, 'start.made')).toHaveLength(0);
  expect(await eventsOf(page, 'attempt.dismissed')).toHaveLength(2);
});

test('Esc is ignored while an input is focused', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'keyboard shortcuts are desktop only');
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
  await page.keyboard.press('s');
  await expect(page.getByRole('button', { name: 'Anxious' })).toBeEnabled();
  await page.evaluate(() => {
    const input = document.createElement('input');
    input.setAttribute('aria-label', 'scratch');
    document.body.append(input);
    input.focus();
  });
  await page.keyboard.press('Escape');
  await expect(page).toHaveURL(/\/stuck$/);
  await page.getByRole('button', { name: 'Anxious' }).click();
  await expect(startBtn(page)).toBeVisible();
  await page.evaluate(() => {
    const input = document.createElement('textarea');
    input.setAttribute('aria-label', 'scratch');
    document.body.append(input);
    input.focus();
  });
  await page.keyboard.press('Escape');
  await expect(startBtn(page)).toBeVisible();
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
    await page.getByRole('button', { name: 'Work' }).click();
    await settled(page);
    await expectAccessible(page);
  });
}

test('a failed Done for now shows a message and can be retried', async ({ page }) => {
  await toStarted(page);
  await breakStorage(page);
  await page.getByRole('button', { name: 'Done for now' }).click();
  await expect(page.getByText(failedCopy)).toBeVisible();
  await expect(page).toHaveURL(/\/started\//);
  await fixStorage(page);
  await page.getByRole('button', { name: 'Done for now' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('a failed undo and tag show a message', async ({ page }) => {
  await toStarted(page);
  await breakStorage(page);
  await page.getByRole('button', { name: 'Work' }).click();
  await expect(page.getByText(failedCopy)).toBeVisible();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText(failedCopy)).toBeVisible();
  await expect(page).toHaveURL(/\/started\//);
  await fixStorage(page);
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Start removed.')).toBeVisible();
});

test('a failed Not now shows a message and can be retried', async ({ page }) => {
  await toResponse(page);
  await breakStorage(page);
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page.getByText(failedCopy)).toBeVisible();
  await fixStorage(page);
  await page.getByRole('button', { name: 'Not now' }).click();
  await expect(page).toHaveURL(/\/$/);
});

test('a failed start and feeling choice can be retried', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: stuck }).click();
  await expect(page.getByRole('button', { name: 'Anxious' })).toBeEnabled();
  await breakStorage(page);
  await page.getByRole('button', { name: 'Anxious' }).click();
  await expect(page.getByText(failedCopy)).toBeVisible();
  await fixStorage(page);
  await page.getByRole('button', { name: 'Anxious' }).click();
  await expect(startBtn(page)).toBeVisible();
  await breakStorage(page);
  await startBtn(page).click();
  await expect(page.getByText(failedCopy)).toBeVisible();
  await fixStorage(page);
  await startBtn(page).click();
  await expect(page.getByText('Started.', { exact: true })).toBeVisible();
});

test('when the attempt cannot open, a message shows and Back still works', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: stuck })).toBeVisible();
  await breakStorage(page);
  await page.getByRole('button', { name: stuck }).click();
  await expect(page.getByText(failedCopy)).toBeVisible();
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});
