import { expect, test } from '@playwright/test';

test('manifest declares an installable standalone app', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the manifest is checked once');
  const response = await page.request.get('/manifest.webmanifest');
  expect(response.ok()).toBe(true);
  const manifest = (await response.json()) as {
    name: string;
    short_name: string;
    start_url: string;
    scope: string;
    display: string;
    background_color: string;
    theme_color: string;
    icons: { src: string; sizes: string; type: string; purpose?: string }[];
  };
  expect(manifest).toMatchObject({
    name: 'Arohexis',
    short_name: 'Arohexis',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F5F5F2',
    theme_color: '#F5F5F2',
  });
  const has = (sizes: string, purpose?: string) =>
    manifest.icons.some((i) => i.sizes === sizes && i.purpose === purpose);
  expect(has('192x192')).toBe(true);
  expect(has('512x512')).toBe(true);
  expect(has('512x512', 'maskable')).toBe(true);
});

test('page links the manifest and an apple-touch-icon without inline script', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'the markup is checked once');
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute(
    'href',
    /manifest\.webmanifest/,
  );
  const touch = page.locator('link[rel="apple-touch-icon"]');
  await expect(touch).toHaveAttribute('href', /apple-touch-icon/);
  const html = await (await page.request.get('/')).text();
  const inline = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)].filter(
    ([, attrs, body]) => !/\bsrc=/.test(attrs ?? '') && (body ?? '').trim() !== '',
  );
  expect(inline).toEqual([]);
});
