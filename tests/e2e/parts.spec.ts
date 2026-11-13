import { expect, test, type Page } from '@playwright/test';
import { knownEvents } from './fixtures/brain';
import { expectAccessible, seedEvents, setTheme } from './helpers';

const plate = (page: Page) => page.getByRole('region', { name: 'Brain space' });
const partGroup = (page: Page, name: string) => page.getByRole('group', { name, exact: true });

/** The app has created its database once it has rendered Home's heading. */
async function home(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
  await expect(plate(page)).toBeVisible();
}

async function seeded(page: Page): Promise<void> {
  await home(page);
  await seedEvents(page, knownEvents(Date.now()));
  await expect(plate(page)).toContainText('Work: 3 starts');
}

async function openParts(page: Page): Promise<void> {
  await page.goto('/settings/parts');
  await expect(page.getByRole('heading', { level: 1, name: 'Parts' })).toBeVisible();
}

async function startFlow(page: Page): Promise<void> {
  await page.goto('/');
  await page.getByRole('button', { name: "I'm stuck" }).click();
  await page.getByRole('button', { name: 'Anxious' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'What is it?' })).toBeVisible();
}

async function addPart(page: Page, label: string): Promise<void> {
  await page.getByLabel('Name', { exact: true }).last().fill(label);
  await page.getByRole('button', { name: 'Add a part' }).click();
  await expect(partGroup(page, label)).toBeVisible();
}

test('a new part appears in What is it? and on Home', async ({ page }) => {
  await home(page);
  await openParts(page);
  await addPart(page, 'Art');
  await startFlow(page);
  await expect(page.getByRole('button', { name: 'Art', exact: true })).toBeVisible();
  await page.goto('/');
  await expect(plate(page).getByRole('button', { name: 'Art' })).toBeVisible();
});

test('the sixth part is the last, and the limit is stated', async ({ page }) => {
  await home(page);
  await openParts(page);
  await addPart(page, 'Art');
  await expect(page.getByText('You have six parts, the most there can be.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add a part' })).toHaveCount(0);
});

test('renaming changes the chip and card, and the light count stays', async ({ page }) => {
  await seeded(page);
  const summary = await plate(page)
    .getByText(/starts · /)
    .textContent();
  await openParts(page);
  await partGroup(page, 'Work').getByLabel('Name').fill('Job');
  await partGroup(page, 'Work').getByRole('button', { name: 'Save' }).click();
  await expect(partGroup(page, 'Job')).toBeVisible();
  await page.goto('/');
  await expect(plate(page).getByRole('button', { name: 'Job' })).toBeVisible();
  await expect(plate(page).getByRole('button', { name: 'Work' })).toHaveCount(0);
  await expect(plate(page).getByText(/starts · /)).toHaveText(summary ?? '');
  await plate(page).getByRole('button', { name: 'Job' }).click();
  await expect(plate(page)).toContainText('Job: 3 starts.');
});

test('a disabled part leaves What is it?, and its chip and light stay on Home', async ({
  page,
}) => {
  await seeded(page);
  await openParts(page);
  await partGroup(page, 'Work').getByRole('checkbox', { name: 'Show after a start' }).click();
  await expect(
    partGroup(page, 'Work').getByRole('checkbox', { name: 'Show after a start' }),
  ).not.toBeChecked();
  await startFlow(page);
  await expect(page.getByRole('button', { name: 'Work', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Study', exact: true })).toBeVisible();
  await page.goto('/');
  await expect(plate(page).getByRole('button', { name: 'Work' })).toBeVisible();
  await expect(plate(page)).toContainText('Work: 3 starts.');
});

test('recoloring swaps with the part that held the color', async ({ page }) => {
  await home(page);
  await openParts(page);
  await partGroup(page, 'Work').getByRole('button', { name: 'Color 2' }).click();
  await expect(partGroup(page, 'Work').getByRole('button', { name: 'Color 2' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(partGroup(page, 'Study').getByRole('button', { name: 'Color 1' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
});

test.describe('at 320 px', () => {
  test.use({ viewport: { width: 320, height: 640 } });

  test('a 24-character name causes no sideways scroll at 320 px', async ({ page }) => {
    const long = 'WWWWWWWWWWWWWWWWWWWWWWWW';
    const fits = () =>
      page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    await seeded(page);
    await openParts(page);
    await partGroup(page, 'Work').getByLabel('Name').fill(long);
    await partGroup(page, 'Work').getByRole('button', { name: 'Save' }).click();
    await expect(partGroup(page, long)).toBeVisible();
    expect(await fits()).toBe(true);
    await page.goto('/');
    await expect(plate(page).getByRole('button', { name: long })).toBeVisible();
    expect(await fits()).toBe(true);
    await plate(page).getByRole('button', { name: long }).click();
    expect(await fits()).toBe(true);
    await startFlow(page);
    await expect(page.getByRole('button', { name: long, exact: true })).toBeVisible();
    expect(await fits()).toBe(true);
  });
});

test('Still in Preferences matches the plate', async ({ page }) => {
  await home(page);
  const plateStill = plate(page).getByRole('button', { name: 'Still', exact: true });
  const before = await plateStill.getAttribute('aria-pressed');
  await page.goto('/settings');
  await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible();
  await expect(page.getByText('Stops all motion in Brain space.')).toBeVisible();
  const prefStill = page.getByRole('button', { name: 'Still', exact: true });
  await expect(prefStill).toHaveAttribute('aria-pressed', before ?? 'false');
  await prefStill.click();
  const flipped = before === 'true' ? 'false' : 'true';
  await expect(prefStill).toHaveAttribute('aria-pressed', flipped);
  await page.goto('/');
  await expect(plate(page).getByRole('button', { name: 'Still', exact: true })).toHaveAttribute(
    'aria-pressed',
    flipped,
  );
});

test('About shows the Brain space paragraph', async ({ page }) => {
  await page.goto('/about');
  const heading = page.getByRole('heading', { name: 'Brain space' });
  await expect(heading).toHaveAttribute('id', 'brain-space');
  await expect(
    page.getByText(
      "Brain space draws your starts as lines of light in the shape of a brain. It's a picture of your starts, not a scan, and the shape is the same for everyone. Arohexis makes no claim that your brain changes.",
    ),
  ).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`Settings and Parts are accessible in ${scheme}`, async ({ page }) => {
    await setTheme(page, scheme);
    await home(page);
    await page.goto('/settings');
    await expect(page.getByRole('heading', { name: 'Preferences' })).toBeVisible();
    await expectAccessible(page);
    await openParts(page);
    await expect(partGroup(page, 'Work')).toBeVisible();
    await expectAccessible(page);
  });
}
