import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { parseHeaders } from '../../config/parseHeaders.ts';
import { full } from './fixtures/brain';
import { seedEvents, seedParts, seedPlans } from './helpers';

const csp = parseHeaders(readFileSync('public/_headers', 'utf8'))['/*']?.[
  'Content-Security-Policy'
];

test('serves the CSP and the app runs without a single violation', async ({ page }) => {
  expect(csp).toBeTruthy();
  const violations: string[] = [];
  await page.exposeFunction('reportViolation', (v: string) => violations.push(v));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', (e) => {
      void (window as unknown as { reportViolation: (v: string) => void }).reportViolation(
        `${e.violatedDirective} ${e.blockedURI}`,
      );
    });
  });

  const response = await page.goto('/');
  expect(response?.headers()['content-security-policy']).toBe(csp);

  // Home with the canvas running, zoom, and a part card.
  await expect(page.getByRole('heading', { level: 1 })).toBeAttached();
  const seed = full(Date.now());
  await seedParts(page, seed.parts);
  await seedPlans(page, seed.plans);
  await seedEvents(page, seed.events);
  const plate = page.getByRole('region', { name: 'Brain space' });
  await expect(page.locator('canvas')).toHaveAttribute('data-loop', 'running');
  await plate.getByRole('button', { name: 'Zoom in', exact: true }).click();
  await plate.getByRole('button', { name: 'Work', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.goto('/');

  await page.getByRole('button', { name: "I'm stuck" }).click();
  await page.getByRole('button', { name: 'Anxious' }).click();
  await page.getByRole('button', { name: 'Start', exact: true }).click();
  await expect(page.getByText('Started.', { exact: true })).toBeVisible();
  await expect(page.getByText(/^(2:00|1:5\d)$/)).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible();

  await page.goto('/settings/data');
  await expect(page.getByRole('heading', { name: 'Back up your data' })).toBeVisible();

  expect(violations).toEqual([]);
});
