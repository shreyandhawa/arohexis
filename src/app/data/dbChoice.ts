import type { DbName } from '../../storage/db';

export type DbChoice = 'main' | 'demo';
const DB_KEY = 'arohexis:db';
const WELCOMED_KEY = 'arohexis:welcomed';
const TOURED_KEY = 'arohexis:toured';

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

/** The Home walkthrough (ADR-045). If storage fails it is skipped, as onboarding is. */
export function hasToured(): boolean {
  try {
    return localStorage.getItem(TOURED_KEY) === '1';
  } catch {
    return true;
  }
}

export function markToured(toured = true): void {
  try {
    if (toured) localStorage.setItem(TOURED_KEY, '1');
    else localStorage.removeItem(TOURED_KEY);
  } catch {
    // The walkthrough may show again, or not; harmless.
  }
}
