import { expect, test, type Page } from '@playwright/test';
import { knownEvents } from './fixtures/brain';
import { expectAccessible, seedEvents, setTheme } from './helpers';

const region = (page: Page) => page.getByRole('region', { name: 'Brain space' });
const slider = (page: Page) => page.getByRole('slider', { name: 'Moment' });
const play = (page: Page) => page.getByRole('button', { name: 'Play', exact: true });

/** Seeds six counted starts (and one undone), then opens Replay from Home's nav. */
async function replay(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
  await seedEvents(page, knownEvents(Date.now()));
  await page.getByRole('link', { name: 'Replay' }).click();
  await expect(slider(page)).toBeVisible();
}

test('Replay opens on the whole picture', async ({ page }) => {
  await replay(page);
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^Start 6 of 6, /);
  await expect(region(page).getByText('6 starts · 5 lines')).toBeVisible();
});

test('the keyboard scrubs back to the first start and forward again', async ({ page }) => {
  await replay(page);
  await slider(page).focus();
  await page.keyboard.press('Home');
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^Start 1 of 6, /);
  await expect(region(page).getByText(/^1 start · /)).toBeVisible();
  await page.keyboard.press('ArrowRight');
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^Start 2 of 6, /);
  await expect(region(page).getByText(/^2 starts · /)).toBeVisible();
});

test('Play runs once to the end and stops', async ({ page }) => {
  await replay(page);
  await play(page).click();
  await expect(page.getByRole('button', { name: 'Pause', exact: true })).toBeVisible();
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^Start 6 of 6, /, {
    timeout: 15_000,
  });
  await expect(play(page)).toBeVisible();
});

test('under reduced motion there is no Play, and scrubbing still works', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await replay(page);
  await expect(play(page)).toHaveCount(0);
  await slider(page).focus();
  await page.keyboard.press('Home');
  await expect(slider(page)).toHaveAttribute('aria-valuetext', /^Start 1 of 6, /);
});

test.describe('with the renderer chunk blocked', () => {
  // page.route can't see requests the service worker answers.
  test.use({ serviceWorkers: 'block' });

  test('Replay still scrubs', async ({ page }) => {
    await page.route('**/assets/brain-*.js', (r) => r.abort());
    await replay(page);
    await slider(page).focus();
    await page.keyboard.press('Home');
    await expect(region(page).getByText(/^1 start · /)).toBeVisible();
  });
});

for (const scheme of ['light', 'dark'] as const) {
  test(`Replay is accessible in ${scheme}`, async ({ page }) => {
    await setTheme(page, scheme);
    await replay(page);
    await expectAccessible(page);
  });
}

test.describe('at 375x667', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('the slider sits above the footer without scrolling', async ({ page }) => {
    await replay(page);
    const slide = await slider(page).boundingBox();
    const foot = await page.locator('footer').boundingBox();
    expect(slide && foot && slide.y + slide.height <= foot.y).toBe(true);
  });
});
