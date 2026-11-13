import type { DbName } from '../../storage/db';

export type DbChoice = 'main' | 'demo';
const DB_KEY = 'arohexis:db';
const WELCOMED_KEY = 'arohexis:welcomed';

/** The pointer is advisory: any failure or unknown value falls back to the main database. */
export function readDbChoice(): DbChoice {
  try {
    return localStorage.getItem(DB_KEY) === 'demo' ? 'demo' : 'main';
  } catch {
    return 'main';
  }
}

export function writeDbChoice(choice: DbChoice): void {
  try {
    localStorage.setItem(DB_KEY, choice);
  } catch {
    // The pointer is lost, so the next load opens the main database.
  }
}

export function dbNameFor(choice: DbChoice): DbName {
  return choice === 'demo' ? 'arohexis-demo' : 'arohexis';
}

export function hasWelcomed(): boolean {
  try {
    return localStorage.getItem(WELCOMED_KEY) === '1';
  } catch {
    return true;
  }
}

export function markWelcomed(): void {
  try {
    localStorage.setItem(WELCOMED_KEY, '1');
  } catch {
    // Onboarding may show again; harmless.
  }
}
