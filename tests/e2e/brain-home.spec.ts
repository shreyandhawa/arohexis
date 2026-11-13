import { expect, test, type Locator, type Page } from '@playwright/test';
import { knownEvents, startEvents } from './fixtures/brain';
import { expectAccessible, seedEvents, setTheme } from './helpers';

const stuck = "I'm stuck";
const region = (page: Page) => page.getByRole('region', { name: 'Brain space' });
const canvas = (page: Page) => page.locator('canvas');
const still = (page: Page) => page.getByRole('button', { name: 'Still', exact: true });

/** The app has created its database once it has rendered Home's heading. */
async function home(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
  await expect(region(page)).toBeVisible();
}

async function seeded(page: Page, events: readonly object[]): Promise<void> {
  await home(page);
  await seedEvents(page, events);
  await expect(region(page)).toBeVisible();
}

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error('no box');
  return b;
}

test.describe('layout at 375x667', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('the plate is at least 200 px tall with the card, the ribbon and the week line showing', async ({
    page,
  }) => {
    await seeded(page, knownEvents(Date.now()));
    await expect(page.getByText(/starts this week/)).toBeVisible();
    await page.evaluate(() => {
      const fill = (selector: string, height: number) => {
        const slot = document.querySelector(selector);
        if (!slot) throw new Error(`missing ${selector}`);
        const block = document.createElement('div');
        block.style.height = `${height}px`;
        slot.appendChild(block);
      };
      fill('[data-slot="card"]', 180);
      fill('[data-slot="ribbon"]', 40);
    });
    const plate = await box(region(page));
    console.log(`plate height at 375x667: ${plate.height}`);
    expect(plate.height).toBeGreaterThanOrEqual(200);
    expect(
      await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight),
    ).toBe(true);
    await expect(page.getByRole('button', { name: stuck })).toBeInViewport({ ratio: 1 });
  });

  test('the stuck flow is still three taps', async ({ page }) => {
    await seeded(page, knownEvents(Date.now()));
    await page.evaluate(() => {
      for (const [selector, height] of [
        ['[data-slot="card"]', 180],
        ['[data-slot="ribbon"]', 40],
      ] as const) {
        const block = document.createElement('div');
        block.style.height = `${height}px`;
        document.querySelector(selector)?.appendChild(block);
      }
    });
    const fits = () =>
      page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight);
    expect(await fits()).toBe(true);
    await page.getByRole('button', { name: stuck }).click();
    await page.getByRole('button', { name: 'Anxious' }).click();
    await page.getByRole('button', { name: 'Start', exact: true }).click();
    await expect(page.getByText('Started.', { exact: true })).toBeVisible();
    expect(await fits()).toBe(true);
  });

  test('every plate control is at least 48 px square', async ({ page }) => {
    await home(page);
    const names = ['Still', 'Zoom in', 'Zoom out', 'Turn left', 'Turn right', 'All'];
    for (const name of names) {
      const b = await box(region(page).getByRole('button', { name, exact: true }));
      expect(b.width, name).toBeGreaterThanOrEqual(48);
      expect(b.height, name).toBeGreaterThanOrEqual(48);
    }
  });
});

test('the text equivalent matches known events', async ({ page }) => {
  await seeded(page, knownEvents(Date.now()));
  const plate = region(page);
  await expect(plate.getByText('6 starts · 5 lines')).toBeVisible();
  await expect(plate).toContainText('Work: 3 starts. 3 start lines.');
  await expect(plate).toContainText('Study: 2 starts. 2 start lines.');
  await expect(plate).toContainText('No part: 1 start.');
  await expect(plate).toContainText('Signals are moving.');
  await expect(plate).not.toContainText('No part: 1 start. 1 start line');
});

test('a new user sees the empty line', async ({ page }) => {
  await home(page);
  await expect(region(page).getByText('Your starts will light up here.')).toBeVisible();
  await expect(region(page)).not.toContainText(' · ');
});

test('the canvas is hidden from assistive technology and never focusable', async ({ page }) => {
  await home(page);
  await expect(canvas(page)).toHaveAttribute('aria-hidden', 'true');
  expect(await canvas(page).evaluate((c) => (c as HTMLCanvasElement).tabIndex)).toBe(-1);
});

test('Still toggles, survives a reload and stops the loop', async ({ page }) => {
  await home(page);
  await expect(still(page)).toHaveAttribute('aria-pressed', 'false');
  await still(page).click();
  await expect(still(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(region(page)).toHaveAttribute('data-motion', 'still');
  // Renderer-dependent: the canvas reports its loop (7A).
  await expect(canvas(page)).toHaveAttribute('data-loop', 'idle', { timeout: 1000 });
  await page.reload();
  await expect(still(page)).toHaveAttribute('aria-pressed', 'true');
  await expect(region(page)).toHaveAttribute('data-motion', 'still');
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('reduced motion with nothing set starts Still', async ({ page }) => {
    await home(page);
    await expect(still(page)).toHaveAttribute('aria-pressed', 'true');
    await expect(region(page)).toHaveAttribute('data-motion', 'still');
    await expect(canvas(page)).toHaveAttribute('data-loop', 'idle', { timeout: 1000 });
  });

  test('turning Still off is kept', async ({ page }) => {
    await seeded(page, knownEvents(Date.now()));
    await still(page).click();
    await expect(still(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(region(page)).toHaveAttribute('data-motion', 'moving');
    await page.reload();
    await expect(still(page)).toHaveAttribute('aria-pressed', 'false');
    await expect(region(page)).toHaveAttribute('data-motion', 'moving');
  });
});

test('old starts leave the signals resting', async ({ page }) => {
  const week = 7 * 24 * 60 * 60 * 1000;
  await seeded(
    page,
    startEvents({ now: Date.now() - week, tagged: [['work', 'Work', 1]], untagged: 0, undone: 0 }),
  );
  await expect(region(page)).toContainText(
    'Signals are resting. One start sets them moving again.',
  );
  await expect(region(page)).toHaveAttribute('data-motion', 'resting');
});

test('turn and zoom buttons work without a drag', async ({ page }) => {
  await home(page);
  const read = async (name: string) => Number(await canvas(page).getAttribute(name));
  const yaw = await read('data-yaw');
  await region(page).getByRole('button', { name: 'Turn right' }).click();
  await expect.poll(() => read('data-yaw')).not.toBe(yaw);
  const zoom = await read('data-zoom');
  await region(page).getByRole('button', { name: 'Zoom in' }).click();
  await expect.poll(() => read('data-zoom')).toBeGreaterThan(zoom);
  await region(page).getByRole('button', { name: 'Zoom out' }).click();
  await region(page).getByRole('button', { name: 'Turn left' }).click();
});

test('while a plate control has focus, arrows turn and plus and minus zoom', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'keyboard only');
  await home(page);
  const read = async (name: string) => Number(await canvas(page).getAttribute(name));
  await region(page).getByRole('button', { name: 'Turn right' }).focus();
  const yaw = await read('data-yaw');
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => read('data-yaw')).not.toBe(yaw);
  const turned = await read('data-yaw');
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => read('data-yaw')).not.toBe(turned);
  const zoom = await read('data-zoom');
  await page.keyboard.press('+');
  await expect.poll(() => read('data-zoom')).toBeGreaterThan(zoom);
  const zoomed = await read('data-zoom');
  await page.keyboard.press('-');
  await expect.poll(() => read('data-zoom')).toBeLessThan(zoomed);
  // The keys do nothing while focus is outside the plate.
  await page.locator('body').click({ position: { x: 1, y: 1 } });
  const before = await read('data-yaw');
  await page.keyboard.press('ArrowRight');
  expect(await read('data-yaw')).toBe(before);
});

test('a part chip selects its part, and All clears it', async ({ page }) => {
  await seeded(page, knownEvents(Date.now()));
  const plate = region(page);
  const work = plate.getByRole('button', { name: 'Work' });
  const all = plate.getByRole('button', { name: 'All', exact: true });
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(work).toHaveAttribute('aria-pressed', 'false');
  await work.click();
  await expect(work).toHaveAttribute('aria-pressed', 'true');
  await expect(all).toHaveAttribute('aria-pressed', 'false');
  await plate.getByRole('button', { name: 'Study' }).click();
  await expect(work).toHaveAttribute('aria-pressed', 'false');
  await all.click();
  await expect(all).toHaveAttribute('aria-pressed', 'true');
  await expect(plate.getByRole('button', { name: 'Study' })).toHaveAttribute(
    'aria-pressed',
    'false',
  );
});

test('the parts row lists the enabled parts in order', async ({ page }) => {
  await home(page);
  const names = await region(page)
    .getByRole('button')
    .evaluateAll((buttons) =>
      buttons.map((b) => b.getAttribute('aria-label') ?? b.textContent ?? ''),
    );
  const chips = names.filter(
    (n) => !['Still', 'Zoom in', 'Zoom out', 'Turn left', 'Turn right'].includes(n),
  );
  expect(chips.map((n) => n.trim())).toEqual(['All', 'Work', 'Study', 'Health', 'Home', 'Money']);
});

test('the stuck flow is still three taps', async ({ page }) => {
  await home(page);
  await page.getByRole('button', { name: stuck }).click();
  await page.getByRole('button', { name: 'Anxious' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Started.', { exact: true })).toBeVisible();
});

test('a removed start shows its notice on the plate', async ({ page }) => {
  await home(page);
  await page.getByRole('button', { name: stuck }).click();
  await page.getByRole('button', { name: 'Anxious' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(region(page).getByText('Start removed.')).toBeVisible();
});

test.describe('with the renderer chunk blocked', () => {
  test.use({ serviceWorkers: 'block' });

  test('with the chunk blocked, the plate shows its text and Still works', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/assets/brain-*.js', (r) => r.abort());
    await seeded(page, knownEvents(Date.now()));
    await expect(region(page).getByText('6 starts · 5 lines')).toBeVisible();
    await expect(region(page)).toContainText('Work: 3 starts. 3 start lines.');
    await still(page).click();
    await expect(still(page)).toHaveAttribute('aria-pressed', 'true');
    await page.getByRole('button', { name: stuck }).click();
    await expect(page).toHaveURL(/\/stuck$/);
    expect(errors).toEqual([]);
  });
});

for (const scheme of ['light', 'dark'] as const) {
  test(`Home is accessible with the plate in ${scheme}`, async ({ page }) => {
    await setTheme(page, scheme);
    await seeded(page, knownEvents(Date.now()));
    await expectAccessible(page);
    await region(page).getByRole('button', { name: 'Work' }).click();
    // Let the chip's colour transition finish; axe would read the colours mid-way.
    await page.evaluate(() => Promise.all(document.getAnimations().map((a) => a.finished)));
    await expectAccessible(page);
  });
}
