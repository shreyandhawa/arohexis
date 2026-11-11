export const data = {
  title: 'Back up your data',
  exportButton: 'Export backup',
  explainer: 'Your data lives only on this device. Save a backup to Files now and then.',
  exportFailed: "The backup didn't save. Try again.",
  noBackup: 'No backup yet',
} as const;

/** `days` is undefined when there is no backup yet. */
export function lastBackup(days: number | undefined): string {
  if (days === undefined) return data.noBackup;
  if (days === 0) return 'Last backup: today';
  return days === 1 ? 'Last backup: 1 day ago' : `Last backup: ${days} days ago`;
}
