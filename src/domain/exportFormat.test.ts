import * as fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DEFAULT_SETTINGS } from './config';
import { DEFAULT_PARTS } from './defaults';
import { migrateTaskTypes, validateParts } from './parts';
import {
  EXPORT_FORMAT,
  EXPORT_MESSAGES,
  EXPORT_VERSION,
  buildExport,
  exportFileName,
  parseExport,
  type ExportData,
} from './exportFormat';
import type { AppEvent } from './events';
import { arbAttemptEvents, arbConfig } from './testing/arbitraries';

const META = { exportedAt: '2026-11-11T09:00:00.000Z', build: 'abc123' };

const EVERY_EVENT: AppEvent[] = [
  {
    id: '1',
    type: 'attempt.opened',
    at: 1,
    tz: 'UTC',
    v: 1,
    attemptId: 'a',
    source: 'plan',
    planId: 'p',
    occurrence: '2026-11-11',
  },
  {
    id: '2',
    type: 'feeling.named',
    at: 1,
    tz: 'UTC',
    v: 1,
    attemptId: 'a',
    feelingId: 'f',
    label: 'L',
  },
  {
    id: '3',
    type: 'response.shown',
    at: 1,
    tz: 'UTC',
    v: 1,
    attemptId: 'a',
    feelingId: 'f',
    responseId: 'r',
    basis: 'reframe',
  },
  {
    id: '4',
    type: 'start.made',
    at: 1,
    tz: 'UTC',
    v: 1,
    attemptId: 'a',
    planId: 'p',
    occurrence: 'o',
    backfilled: true,
  },
  { id: '5', type: 'start.undone', at: 1, tz: 'UTC', v: 1, attemptId: 'a' },
  {
    id: '6',
    type: 'start.tagged',
    at: 1,
    tz: 'UTC',
    v: 1,
    attemptId: 'a',
    taskTypeId: 't',
    label: 'L',
  },
  {
    id: '7',
    type: 'timer.closed',
    at: 1,
    tz: 'UTC',
    v: 1,
    attemptId: 'a',
    elapsedSec: 5,
    outcome: 'stopped',
  },
  { id: '8', type: 'attempt.dismissed', at: 1, tz: 'UTC', v: 1, attemptId: 'a' },
  {
    id: '9',
    type: 'occurrence.resolved',
    at: 1,
    tz: 'UTC',
    v: 1,
    planId: 'p',
    occurrence: 'o',
    outcome: 'slipped',
  },
  {
    id: '10',
    type: 'lapse.repaired',
    at: 1,
    tz: 'UTC',
    v: 1,
    planId: 'p',
    occurrence: 'o',
    startedAnyway: false,
    obstacleId: 'x',
    obstacleLabel: 'X',
    choice: 'pause',
  },
  {
    id: '11',
    type: 'checkin.submitted',
    at: 1,
    tz: 'UTC',
    v: 1,
    weekOf: '2026-11-09',
    answers: [1, 2, 3, 4],
  },
];

const BASE: ExportData = {
  feelings: [],
  responses: [],
  parts: [],
  obstacles: [],
  plans: [],
  settings: { ...DEFAULT_SETTINGS },
  events: [],
};

function file(overrides: Record<string, unknown> = {}, data: Record<string, unknown> = {}) {
  return JSON.parse(
    JSON.stringify({ ...buildExport(BASE, META), ...overrides, data: { ...BASE, ...data } }),
  ) as unknown;
}

describe('export format', () => {
  it('builds the envelope', () => {
    expect(buildExport(BASE, META)).toEqual({
      format: EXPORT_FORMAT,
      version: EXPORT_VERSION,
      exportedAt: META.exportedAt,
      app: { name: 'Arohexis', build: 'abc123' },
      data: BASE,
    });
  });

  it('parseExport accepts what buildExport produces, covering all 11 event types', () => {
    const data: ExportData = {
      ...BASE,
      plans: [
        {
          id: 'p',
          place: 'desk',
          firstAction: 'open',
          time: '09:00',
          days: [1, 2],
          graceMin: 10,
          active: true,
          createdAt: 1,
          editCount: 0,
        },
      ],
      events: EVERY_EVENT,
    };
    const r = parseExport(JSON.parse(JSON.stringify(buildExport(data, META))));
    expect(r).toEqual({ ok: true, file: buildExport(data, META) });
  });

  it('rejects imported feelings and responses that break the label and word limits', () => {
    const feeling = { id: 'f', label: 'ok', order: 1, enabled: true, builtIn: false };
    const response = {
      id: 'r',
      feelingId: 'f',
      body: 'One small step',
      basis: 'shrink-the-step',
      enabled: true,
      order: 1,
      builtIn: false,
    };
    const bad = { ok: false, message: EXPORT_MESSAGES.notABackup };
    expect(parseExport(file({}, { feelings: [feeling], responses: [response] })).ok).toBe(true);
    expect(parseExport(file({}, { feelings: [{ ...feeling, label: 'x'.repeat(41) }] }))).toEqual(
      bad,
    );
    expect(parseExport(file({}, { feelings: [{ ...feeling, label: '  ' }] }))).toEqual(bad);
    const long = Array.from({ length: 41 }, () => 'word').join(' ');
    expect(parseExport(file({}, { responses: [{ ...response, body: long }] }))).toEqual(bad);
    expect(parseExport(file({}, { responses: [{ ...response, body: ' ' }] }))).toEqual(bad);
  });

  it('rejects a newer version', () => {
    const r = parseExport(file({ version: EXPORT_VERSION + 1 }));
    expect(r).toEqual({ ok: false, message: EXPORT_MESSAGES.newerVersion });
    expect(EXPORT_MESSAGES.newerVersion).toBe(
      'This backup is from a newer version of Arohexis. Update the app, then try again.',
    );
  });

  it('rejects version 3 with the newer-version message', () => {
    expect(parseExport(file({ version: 3 }))).toEqual({
      ok: false,
      message: EXPORT_MESSAGES.newerVersion,
    });
  });

  it('parseExport migrates a version 1 backup', () => {
    const taskTypes = [
      { id: 'writing', label: 'Writing', order: 1, enabled: true },
      { id: 'study', label: 'Study', order: 2, enabled: true },
      { id: 'admin', label: 'Admin & email', order: 3, enabled: true },
      { id: 'chores', label: 'Chores', order: 4, enabled: true },
      { id: 'creative', label: 'Creative', order: 5, enabled: true },
      { id: 'other-task', label: 'Other', order: 6, enabled: true },
    ];
    const v1Base: Partial<ExportData> = { ...BASE };
    delete v1Base.parts;
    const v1 = JSON.parse(
      JSON.stringify({
        ...buildExport(BASE, META),
        version: 1,
        data: { ...v1Base, taskTypes, events: EVERY_EVENT },
      }),
    ) as unknown;
    const r = parseExport(v1);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.file.version).toBe(2);
    expect(r.file.data.parts).toEqual(migrateTaskTypes(taskTypes));
    expect(r.file.data).not.toHaveProperty('taskTypes');
    expect(r.file.data.events).toEqual(EVERY_EVENT);
    expect(r.file.data.settings).not.toHaveProperty('brainStill');
    const broken = JSON.parse(
      JSON.stringify({ ...(v1 as object), data: { events: [] } }),
    ) as unknown;
    expect(parseExport(broken)).toEqual({ ok: false, message: EXPORT_MESSAGES.notABackup });
  });

  it.each([
    ['an empty label', [{ id: 'a', label: '', order: 1, enabled: true }]],
    ['a 30-character label', [{ id: 'a', label: 'x'.repeat(30), order: 1, enabled: true }]],
    [
      'a duplicate id',
      [
        { id: 'a', label: 'A', order: 1, enabled: true },
        { id: 'a', label: 'B', order: 2, enabled: true },
      ],
    ],
  ])('a version 1 backup with %s imports with valid parts', (_name, taskTypes) => {
    const v1Base: Partial<ExportData> = { ...BASE };
    delete v1Base.parts;
    const r = parseExport(
      JSON.parse(
        JSON.stringify({
          ...buildExport(BASE, META),
          version: 1,
          data: { ...v1Base, taskTypes },
        }),
      ),
    );
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(validateParts(r.file.data.parts)).toEqual([]);
      expect(r.file.data.parts.length).toBeLessThanOrEqual(1);
    }
  });

  it('rejects invalid parts and a bad brainStill', () => {
    const dup = DEFAULT_PARTS.map((p) => ({ ...p, colour: 1 }));
    expect(parseExport(file({}, { parts: dup })).ok).toBe(false);
    expect(parseExport(file({}, { parts: [{ ...DEFAULT_PARTS[0], colour: 9 }] })).ok).toBe(false);
    expect(parseExport(file({}, { settings: { ...DEFAULT_SETTINGS, brainStill: 'x' } })).ok).toBe(
      false,
    );
    expect(parseExport(file({}, { parts: DEFAULT_PARTS })).ok).toBe(true);
  });

  it('rejects a file that is not an Arohexis backup', () => {
    expect(EXPORT_MESSAGES.notABackup).toBe("This file isn't an Arohexis backup.");
    const bad = [
      null,
      undefined,
      'x',
      3,
      [],
      {},
      file({ format: 'other' }),
      file({ format: 'other', version: 99 }),
      file({ version: 0 }),
      file({ version: 1.5 }),
      file({ version: '2' }),
      file({ exportedAt: 5 }),
      file({ app: { name: 'Other', build: 'x' } }),
      file({}, { settings: { theme: 'neon' } }),
      file({}, { plans: [{ id: 1 }] }),
    ];
    for (const b of bad)
      expect(parseExport(b)).toEqual({ ok: false, message: EXPORT_MESSAGES.notABackup });
  });

  it('rejects malformed events without throwing', () => {
    const bad = [
      [{ id: '1', type: 'nope', at: 1, tz: 'UTC', v: 1 }],
      [{ ...EVERY_EVENT[0], v: 2 }],
      [{ ...EVERY_EVENT[6], outcome: 'weird' }],
      [{ ...EVERY_EVENT[10], answers: [1, 2, 3] }],
      ['str'],
    ];
    for (const events of bad)
      expect(parseExport(file({}, { events }))).toEqual({
        ok: false,
        message: EXPORT_MESSAGES.notABackup,
      });
  });

  it('exportFileName uses the local date', () => {
    expect(exportFileName(Date.UTC(2026, 10, 12, 2, 0), 'America/New_York')).toBe(
      'arohexis-export-2026-11-11.json',
    );
  });

  it('property: parse(build(data)) round-trips through JSON', () => {
    fc.assert(
      fc.property(arbConfig(), arbAttemptEvents(), (config, events) => {
        const data: ExportData = { ...config, events };
        const r = parseExport(JSON.parse(JSON.stringify(buildExport(data, META))));
        expect(r.ok).toBe(true);
        if (r.ok) expect(r.file.data).toEqual(data);
      }),
    );
  });

  it('property: parseExport never throws on arbitrary JSON', () => {
    fc.assert(
      fc.property(fc.jsonValue(), (v) => {
        parseExport(v);
      }),
    );
  });
});
