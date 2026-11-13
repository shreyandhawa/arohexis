import AxeBuilder from '@axe-core/playwright';
import { expect, type Page } from '@playwright/test';

export async function expectAccessible(page: Page): Promise<void> {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  expect(results.violations).toEqual([]);
}

export async function setTheme(page: Page, colorScheme: 'light' | 'dark'): Promise<void> {
  await page.emulateMedia({ colorScheme });
}

type Table = 'events' | 'parts' | 'plans';

/** Writes rows into the app's own database, which must already exist, then reloads. */
async function seedTable(page: Page, table: Table, rows: readonly object[]): Promise<void> {
  await page.evaluate(
    ([name, data]) =>
      new Promise<void>((resolve, reject) => {
        const open = indexedDB.open('arohexis');
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const db = open.result;
          const tx = db.transaction(name as string, 'readwrite');
          const store = tx.objectStore(name as string);
          for (const row of data as object[]) store.put(row);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [table, rows] as const,
  );
  await page.reload();
}

export function seedEvents(page: Page, events: readonly object[]): Promise<void> {
  return seedTable(page, 'events', events);
}

export function seedParts(page: Page, parts: readonly object[]): Promise<void> {
  return seedTable(page, 'parts', parts);
}

export function seedPlans(page: Page, plans: readonly object[]): Promise<void> {
  return seedTable(page, 'plans', plans);
}
