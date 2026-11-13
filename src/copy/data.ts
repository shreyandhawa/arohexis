export const data = {
  title: 'Back up your data',
  exportButton: 'Export backup',
  explainer: 'Your data lives only on this device. Save a backup to Files now and then.',
  exportFailed: "The backup didn't save. Try again.",
  noBackup: 'No backup yet',
  demoNote: 'You are in the demo. A backup saved from here holds demo data only.',
  persisted: 'Storage: kept. The browser will not clear it on its own.',
  notPersisted: 'Storage: the browser may clear it if space runs low. Back up now and then.',
  importButton: 'Import backup',
  importTitle: 'Replace with this backup?',
  importReplaces: 'Importing replaces everything on this device with the contents of this file.',
  importConfirm: 'Replace with this backup',
  importDone: 'Imported. Your data is now the backup.',
  importFailed: "The import didn't finish, and nothing changed. Try again.",
  exportFirst: 'Export current data first',
  exportedFirst: 'Backup saved.',
  cancel: 'Cancel',
  deleteButton: 'Delete everything on this device',
  deleteTitle: 'Delete everything?',
  deleteBody:
    'This removes every start, plan, part, feeling, response and setting from this device. It cannot be undone.',
  deleteConfirm: 'Delete everything',
  deleteDone: 'Everything is deleted. The defaults are back.',
  deleteFailed: "That didn't delete. Nothing changed. Try again.",
  exploreDemo: 'Explore the demo',
  exitDemo: 'Exit demo',
} as const;

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/** The import preview line, such as "312 events, 4 plans, 6 feelings, 5 parts". */
export function importPreview(c: {
  events: number;
  plans: number;
  feelings: number;
  parts: number;
}): string {
  return [
    plural(c.events, 'event', 'events'),
    plural(c.plans, 'plan', 'plans'),
    plural(c.feelings, 'feeling', 'feelings'),
    plural(c.parts, 'part', 'parts'),
  ].join(', ');
}

/** `days` is undefined when there is no backup yet. */
export function lastBackup(days: number | undefined): string {
  if (days === undefined) return data.noBackup;
  if (days === 0) return 'Last backup: today';
  return days === 1 ? 'Last backup: 1 day ago' : `Last backup: ${days} days ago`;
}
