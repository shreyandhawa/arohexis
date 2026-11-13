import { expect, test, type Page } from '@playwright/test';
import { expectAccessible, setTheme } from './helpers';

/** The app has created its database once it has rendered Home's heading. */
async function home(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
}

async function open(page: Page, path: string, title: string): Promise<void> {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1, name: title })).toBeVisible();
}

test('a renamed feeling appears in What is it?', async ({ page }) => {
  await home(page);
  await open(page, '/settings/feelings', 'Feelings and responses');
  await page.getByLabel('Name', { exact: true }).first().fill('Tense');
  await page.getByRole('button', { name: 'Save' }).first().click();
  await expect(page.getByRole('group', { name: 'Tense', exact: true })).toBeVisible();
  await page.goto('/');
  await page.getByRole('button', { name: "I'm stuck" }).click();
  await expect(page.getByRole('button', { name: 'Tense', exact: true })).toBeVisible();
});

test('a response is capped at 40 words', async ({ page }) => {
  await home(page);
  await open(page, '/settings/feelings', 'Feelings and responses');
  const anxious = page.getByRole('group', { name: 'Anxious', exact: true });
  await anxious.getByText('Responses (3)').click();
  const body = anxious.getByLabel('Response', { exact: true }).first();
  const save = anxious.getByRole('button', { name: 'Save' }).nth(1);
  await body.fill(Array.from({ length: 41 }, () => 'word').join(' '));
  await expect(anxious.getByText('41 of 40 words')).toBeVisible();
  await expect(save).toBeDisabled();
  await body.fill(Array.from({ length: 40 }, () => 'word').join(' '));
  await expect(anxious.getByText('40 of 40 words')).toBeVisible();
  await expect(save).toBeEnabled();
});

test('Something else cannot be turned off', async ({ page }) => {
  await home(page);
  await open(page, '/settings/feelings', 'Feelings and responses');
  const other = page.getByRole('group', { name: 'Something else', exact: true });
  await expect(other.getByRole('checkbox')).toBeChecked();
  await expect(other.getByRole('checkbox')).toBeDisabled();
});

test('the theme switch sets data-theme', async ({ page }) => {
  await home(page);
  await open(page, '/settings', 'Settings');
  const html = page.locator('html');
  await page.getByLabel('Theme').selectOption('dark');
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.reload();
  await expect(html).toHaveAttribute('data-theme', 'dark');
  await page.getByLabel('Theme').selectOption('system');
  await expect(html).not.toHaveAttribute('data-theme', /.*/);
});

test('About shows the version and build', async ({ page }) => {
  await home(page);
  await open(page, '/about', 'About');
  await expect(page.getByText(/^Version \S+, build (dev|[0-9a-f]{7,})$/)).toBeVisible();
  await expect(
    page.getByText('Self-Report Behavioural Automaticity Index', { exact: false }).first(),
  ).toBeVisible();
});

for (const scheme of ['light', 'dark'] as const) {
  test(`the new screens have no axe violations in ${scheme}`, async ({ page }) => {
    await setTheme(page, scheme);
    await home(page);
    for (const [path, title] of [
      ['/settings', 'Settings'],
      ['/settings/feelings', 'Feelings and responses'],
      ['/settings/obstacles', 'Obstacles'],
      ['/about', 'About'],
    ] as const) {
      await open(page, path, title);
      await expectAccessible(page);
    }
    await open(page, '/settings/feelings', 'Feelings and responses');
    await page.getByText('Responses (3)').first().click();
    await expectAccessible(page);
  });
}
