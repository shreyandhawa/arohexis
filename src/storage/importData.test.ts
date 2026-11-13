import 'fake-indexeddb/auto';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from '../domain/config';
import {
  DEFAULT_FEELINGS,
  DEFAULT_OBSTACLES,
  DEFAULT_PARTS,
  DEFAULT_RESPONSES,
} from '../domain/defaults';
import { DEMO_SEED, generateDemoData } from '../domain/demo';
import {
  buildExport,
  parseExport,
  parseExportText,
  summarizeExport,
  type ExportData,
} from '../domain/exportFormat';
import { ArohexisDB } from './db';
import { readExportData } from './exportData';
import { replaceAllData } from './importData';
import { openStorage } from './open';

const opened: ArohexisDB[] = [];
afterEach(async () => {
  for (const db of opened.splice(0)) {
    db.close();
    await db.delete();
  }
});
async function freshDb(): Promise<ArohexisDB> {
  const result = await openStorage(`test-${crypto.randomUUID()}`);
  if (!result.ok) throw result.error;
  opened.push(result.db);
  return result.db;
}

const META = { exportedAt: '2026-11-13T00:00:00.000Z', build: 'test' };
const demo = generateDemoData(DEMO_SEED, '2026-11-12', 'America/New_York');

describe('import', () => {
  it('parses text, and refuses text that is not JSON', () => {
    const text = JSON.stringify(buildExport(demo, META));
    expect(parseExportText(text).ok).toBe(true);
    expect(parseExportText('{nope')).toMatchObject({ ok: false });
  });

  it('summarizes counts for the preview', () => {
    const result = parseExport(buildExport(demo, META));
    if (!result.ok) throw new Error(result.message);
    expect(summarizeExport(result.file)).toEqual({
      events: demo.events.length,
      plans: 3,
      feelings: 6,
      parts: 5,
      responses: DEFAULT_RESPONSES.length,
      obstacles: DEFAULT_OBSTACLES.length,
    });
  });

  it('migrates a version 1 file on parse', () => {
    const rest: Partial<ExportData> = { ...demo };
    delete rest.parts;
    const v1 = {
      ...buildExport(demo, META),
      version: 1,
      data: {
        ...rest,
        taskTypes: [{ id: 'writing', label: 'Writing', order: 1, enabled: true }],
        settings: { ...DEFAULT_SETTINGS },
      },
    };
    const result = parseExport(v1);
    expect(result.ok && result.file.version).toBe(2);
    expect(result.ok && result.file.data.parts.map((p) => p.id)).toEqual(['writing']);
  });

  it('replaces everything and round-trips through export', async () => {
    const db = await freshDb();
    await replaceAllData(db, demo);
    const back = await readExportData(db);
    const byId = <T extends { id: string }>(rows: T[]) =>
      [...rows].sort((a, b) => (a.id < b.id ? -1 : 1));
    expect(byId(back.events)).toEqual(byId(demo.events));
    expect(byId(back.responses)).toEqual(byId(demo.responses));
    expect(byId(back.plans)).toEqual(byId(demo.plans));
    expect(back.parts).toEqual(demo.parts);
    expect(back.settings).toEqual(demo.settings);
    expect(await db.kv.get('seeded')).toBeTruthy();
  });

  it('keeps optional settings, and replaces what was there', async () => {
    const db = await freshDb();
    const data: ExportData = {
      feelings: [...DEFAULT_FEELINGS],
      responses: [...DEFAULT_RESPONSES],
      parts: [...DEFAULT_PARTS],
      obstacles: [],
      plans: [],
      events: [],
      settings: { ...DEFAULT_SETTINGS, lastExportAt: 5, brainStill: 'still' },
    };
    await replaceAllData(db, demo);
    await replaceAllData(db, data);
    expect(await db.events.count()).toBe(0);
    expect(await db.plans.count()).toBe(0);
    expect((await readExportData(db)).settings).toEqual(data.settings);
  });

  it('rolls back and changes nothing when a write fails', async () => {
    const db = await freshDb();
    await replaceAllData(db, demo);
    const before = await readExportData(db);
    const dupe = demo.events[0];
    if (!dupe) throw new Error('no events');
    const bad: ExportData = { ...demo, parts: [], events: [...demo.events, dupe] };
    await expect(replaceAllData(db, bad)).rejects.toThrow();
    expect(await readExportData(db)).toEqual(before);
  });
});
