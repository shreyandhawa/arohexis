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
