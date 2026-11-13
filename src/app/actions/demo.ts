import { localDate } from '../../domain/week';
import { openStorage } from '../../storage/open';
import { replaceAllData } from '../../storage/importData';
import type { ArohexisDB } from '../../storage/db';
import { writeDbChoice } from '../data/dbChoice';
import type { AppDeps } from '../data/DataProvider';

const DAY_MS = 86_400_000;

/** Ten weeks of demo data ending yesterday. The generator loads only when the demo is used. */
async function freshDemo(d: Pick<AppDeps, 'clock'>) {
  const { generateDemoData, DEMO_SEED } = await import('../../domain/demo');
  const tz = d.clock.timeZone();
  return generateDemoData(DEMO_SEED, localDate(d.clock.now() - DAY_MS, tz), tz);
}

/** Fills `arohexis-demo` and points at it. The caller reloads so the app opens that database. */
export async function enterDemo(d: Pick<AppDeps, 'clock'>): Promise<void> {
  const opened = await openStorage('arohexis-demo');
  if (!opened.ok) throw opened.error;
  try {
    await replaceAllData(opened.db, await freshDemo(d));
  } finally {
    opened.db.close();
  }
  writeDbChoice('demo');
}

/** Starts the demo over, inside the open demo database only. */
export async function resetDemo(d: Pick<AppDeps, 'clock'> & { db: ArohexisDB }): Promise<void> {
  await replaceAllData(d.db, await freshDemo(d));
}

export function exitDemo(): void {
  writeDbChoice('main');
}
