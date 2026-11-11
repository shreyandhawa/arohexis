import { ArohexisDB, type DbName } from './db';
import { seedDefaults } from './seed';

export class StorageUnavailableError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'StorageUnavailableError';
  }
}

export type OpenResult =
  { ok: true; db: ArohexisDB } | { ok: false; error: StorageUnavailableError };

/** Opens and seeds the database. Never throws. */
export async function openStorage(name: DbName): Promise<OpenResult> {
  let db: ArohexisDB | undefined;
  try {
    db = new ArohexisDB(name);
    await db.open();
    await seedDefaults(db);
    return { ok: true, db };
  } catch (cause) {
    try {
      db?.close();
    } catch {
      // already unusable
    }
    const message = cause instanceof Error ? cause.message : 'Storage is unavailable';
    return { ok: false, error: new StorageUnavailableError(message, { cause }) };
  }
}

/** A stuck open (a blocked upgrade, or a WebKit hang) must not leave a blank page. */
export const OPEN_TIMEOUT_MS = 5000;

/** `openStorage`, but gives up after `ms`. A late success is closed again. */
export async function openStorageWithin(
  name: DbName,
  ms: number = OPEN_TIMEOUT_MS,
): Promise<OpenResult> {
  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const opening = openStorage(name);
  const timeout = new Promise<OpenResult>((resolve) => {
    timer = setTimeout(() => {
      timedOut = true;
      resolve({
        ok: false,
        error: new StorageUnavailableError('Opening storage timed out'),
      });
    }, ms);
  });
  const result = await Promise.race([opening, timeout]);
  clearTimeout(timer);
  void opening.then((late) => {
    if (timedOut && late.ok) late.db.close();
  });
  return result;
}
