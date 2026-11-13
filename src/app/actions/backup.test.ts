import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseExport } from '../../domain/exportFormat';
import { testDeps } from '../../domain/testing/fixtures';
import { createConfigStore } from '../../storage/configStore';
import type { ArohexisDB } from '../../storage/db';
import { createEventStore } from '../../storage/eventStore';
import { openStorage } from '../../storage/open';
import type { AppDeps } from '../data/DataProvider';
import { browserSharer, daysSinceBackup, exportBackup, loadBackupData } from './backup';

const opened: ArohexisDB[] = [];

async function setup() {
  const result = await openStorage(`test-${crypto.randomUUID()}`);
  if (!result.ok) throw result.error;
  opened.push(result.db);
  const { clock, ids } = testDeps();
  const d: AppDeps = {
    db: result.db,
    events: createEventStore(result.db),
    config: createConfigStore(result.db),
    clock,
    ids,
    persist: vi.fn().mockResolvedValue(true),
    mode: 'main',
  };
  return { d, clock };
}

function sharer(canShareFiles: boolean, share = vi.fn().mockResolvedValue(undefined)) {
  return { canShareFiles, share, download: vi.fn() };
}

async function lastExportAt(d: AppDeps) {
  return (await d.config.getConfig()).settings.lastExportAt;
}

afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close();
    await db.delete();
  }
});

describe('exportBackup', () => {
  it('shares a valid backup file and records the time', async () => {
    const { d, clock } = await setup();
    const s = sharer(true);
    await exportBackup(d, s, await loadBackupData(d));
    expect(s.download).not.toHaveBeenCalled();
    const file = s.share.mock.calls[0]?.[0] as File;
    expect(file.name).toBe('arohexis-export-2026-11-16.json');
    expect(file.type).toBe('application/json');
    expect(parseExport(JSON.parse(await file.text())).ok).toBe(true);
    expect(await lastExportAt(d)).toBe(clock.now());
  });

  it('downloads when sharing files is not available', async () => {
    const { d, clock } = await setup();
    const s = sharer(false);
    await exportBackup(d, s, await loadBackupData(d));
    expect(s.share).not.toHaveBeenCalled();
    expect(s.download).toHaveBeenCalledOnce();
    expect(await lastExportAt(d)).toBe(clock.now());
  });

  it('does nothing when the user cancels the share sheet', async () => {
    const { d } = await setup();
    const s = sharer(true, vi.fn().mockRejectedValue(new DOMException('x', 'AbortError')));
    await exportBackup(d, s, await loadBackupData(d));
    expect(s.download).not.toHaveBeenCalled();
    expect(await lastExportAt(d)).toBeUndefined();
  });

  it('falls back to download on any other share error', async () => {
    const { d, clock } = await setup();
    const s = sharer(true, vi.fn().mockRejectedValue(new Error('nope')));
    await exportBackup(d, s, await loadBackupData(d));
    expect(s.download).toHaveBeenCalledOnce();
    expect(await lastExportAt(d)).toBe(clock.now());
  });

  it('calls share before any await, so the tap activation is still live', async () => {
    const { d } = await setup();
    const data = await loadBackupData(d);
    const s = sharer(true);
    const done = exportBackup(d, s, data);
    // No await between the call and this check: only synchronous work has run.
    expect(s.share).toHaveBeenCalledOnce();
    await done;
  });

  it('rejects, without calling download twice, when recording the time fails', async () => {
    const { d } = await setup();
    const data = await loadBackupData(d);
    const s = sharer(false);
    vi.spyOn(d.config, 'applyConfigPatch').mockRejectedValue(new Error('write failed'));
    await expect(exportBackup(d, s, data)).rejects.toThrow('write failed');
    expect(s.download).toHaveBeenCalledOnce();
  });
});

describe('browserSharer', () => {
  const iphone = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15';
  const macSafari = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15';
  const stub = (userAgent: string, maxTouchPoints: number) => {
    vi.stubGlobal('navigator', { userAgent, maxTouchPoints, canShare: () => true });
    vi.stubGlobal('window', { matchMedia: () => ({ matches: false }) });
  };
  afterEach(() => vi.unstubAllGlobals());

  it('shares files on iOS', () => {
    stub(iphone, 5);
    expect(browserSharer().canShareFiles).toBe(true);
  });

  it('downloads on macOS Safari even though canShare says yes', () => {
    stub(macSafari, 0);
    expect(browserSharer().canShareFiles).toBe(false);
  });
});

describe('daysSinceBackup', () => {
  const tz = 'America/New_York';
  const at = (y: number, m: number, day: number, h: number) => Date.UTC(y, m, day, h);
  it('is undefined with no backup', () => {
    expect(daysSinceBackup(undefined, Date.now(), tz)).toBeUndefined();
  });
  it('counts local calendar days, not 24-hour periods', () => {
    // 23:00 local Nov 15 -> 01:00 local Nov 16 is two hours but one calendar day.
    expect(daysSinceBackup(at(2026, 10, 16, 4), at(2026, 10, 16, 6), tz)).toBe(1);
    expect(daysSinceBackup(at(2026, 10, 16, 14), at(2026, 10, 16, 20), tz)).toBe(0);
    expect(daysSinceBackup(at(2026, 10, 10, 14), at(2026, 10, 16, 14), tz)).toBe(6);
  });
});
