import { buildExport, exportFileName } from '../../domain/exportFormat';
import { localDate } from '../../domain/week';
import { readExportData } from '../../storage/exportData';
import type { AppDeps } from '../data/DataProvider';

export type Sharer = {
  canShareFiles: boolean;
  share(file: File): Promise<void>;
  download(file: File): void;
};

const BUILD = import.meta.env.VITE_BUILD_SHA ?? 'dev';
const DAY_MS = 86_400_000;

/** Local calendar days since the last backup, or undefined when there is none. */
export function daysSinceBackup(
  lastExportAt: number | undefined,
  now: number,
  tz: string,
): number | undefined {
  if (lastExportAt === undefined) return undefined;
  const day = (at: number) => Date.parse(`${localDate(at, tz)}T00:00:00Z`);
  return Math.max(0, Math.round((day(now) - day(lastExportAt)) / DAY_MS));
}

/**
 * Saves a backup through the share sheet when files can be shared, otherwise
 * as a download. `lastExportAt` is set only once the file has been handed off.
 * A cancelled share sheet changes nothing.
 */
export async function exportBackup(d: AppDeps, sharer: Sharer): Promise<void> {
  const data = await readExportData(d.db);
  const now = d.clock.now();
  const file = new File(
    [
      JSON.stringify(
        buildExport(data, { exportedAt: new Date(now).toISOString(), build: BUILD }),
        null,
        2,
      ),
    ],
    exportFileName(now, d.clock.timeZone()),
    { type: 'application/json' },
  );

  let handedOff = false;
  if (sharer.canShareFiles) {
    try {
      await sharer.share(file);
      handedOff = true;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  }
  if (!handedOff) sharer.download(file);
  await d.config.applyConfigPatch({ settings: { lastExportAt: d.clock.now() } });
}

/** The browser's share sheet or, failing that, a download through an object URL. */
export function browserSharer(): Sharer {
  const probe = new File([], 'probe.json', { type: 'application/json' });
  return {
    canShareFiles: navigator.canShare?.({ files: [probe] }) ?? false,
    share: (file) => navigator.share({ files: [file] }),
    download(file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 30_000);
    },
  };
}
