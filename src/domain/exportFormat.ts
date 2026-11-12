import * as v from 'valibot';
import type { Config } from './config';
import type { AppEvent } from './events';
import { localDate } from './week';

export const EXPORT_FORMAT = 'arohexis-export';
export const EXPORT_VERSION = 1;

/** User-facing import messages. They live here because the domain cannot import src/copy. */
export const EXPORT_MESSAGES = {
  newerVersion: 'This backup is from a newer version of Arohexis. Update the app, then try again.',
  notABackup: "This file isn't an Arohexis backup.",
} as const;

export type ExportData = Config & { events: AppEvent[] };
export type ExportFile = {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  app: { name: 'Arohexis'; build: string };
  data: ExportData;
};

const weekDay = v.picklist([0, 1, 2, 3, 4, 5, 6]);
const basis = v.picklist([
  'name-the-feeling',
  'shrink-the-step',
  'self-kindness',
  'reframe',
  'pair-a-reward',
]);

const listItem = v.strictObject({
  id: v.string(),
  label: v.string(),
  order: v.number(),
  enabled: v.boolean(),
});

const envelope = <T extends string>(type: T) => ({
  id: v.string(),
  type: v.literal(type),
  at: v.number(),
  tz: v.string(),
  v: v.literal(1),
});

const eventSchema = v.variant('type', [
  v.strictObject({
    ...envelope('attempt.opened'),
    attemptId: v.string(),
    source: v.picklist(['stuck', 'plan']),
    planId: v.exactOptional(v.string()),
    occurrence: v.exactOptional(v.string()),
  }),
  v.strictObject({
    ...envelope('feeling.named'),
    attemptId: v.string(),
    feelingId: v.string(),
    label: v.string(),
  }),
  v.strictObject({
    ...envelope('response.shown'),
    attemptId: v.string(),
    feelingId: v.string(),
    responseId: v.string(),
    basis,
  }),
  v.strictObject({
    ...envelope('start.made'),
    attemptId: v.string(),
    planId: v.exactOptional(v.string()),
    occurrence: v.exactOptional(v.string()),
    backfilled: v.boolean(),
  }),
  v.strictObject({ ...envelope('start.undone'), attemptId: v.string() }),
  v.strictObject({
    ...envelope('start.tagged'),
    attemptId: v.string(),
    taskTypeId: v.string(),
    label: v.string(),
  }),
  v.strictObject({
    ...envelope('timer.closed'),
    attemptId: v.string(),
    elapsedSec: v.number(),
    outcome: v.picklist(['kept-going', 'stopped']),
  }),
  v.strictObject({ ...envelope('attempt.dismissed'), attemptId: v.string() }),
  v.strictObject({
    ...envelope('occurrence.resolved'),
    planId: v.string(),
    occurrence: v.string(),
    outcome: v.picklist(['slipped', 'expired']),
  }),
  v.strictObject({
    ...envelope('lapse.repaired'),
    planId: v.string(),
    occurrence: v.string(),
    startedAnyway: v.boolean(),
    obstacleId: v.exactOptional(v.string()),
    obstacleLabel: v.exactOptional(v.string()),
    choice: v.picklist(['keep', 'smaller', 'move', 'pause']),
  }),
  v.strictObject({
    ...envelope('checkin.submitted'),
    weekOf: v.string(),
    answers: v.tuple([v.number(), v.number(), v.number(), v.number()]),
  }),
]);

const exportSchema = v.strictObject({
  format: v.literal(EXPORT_FORMAT),
  version: v.pipe(v.number(), v.integer(), v.minValue(1)),
  exportedAt: v.string(),
  app: v.strictObject({ name: v.literal('Arohexis'), build: v.string() }),
  data: v.strictObject({
    feelings: v.array(v.strictObject({ ...listItem.entries, builtIn: v.boolean() })),
    responses: v.array(
      v.strictObject({
        id: v.string(),
        feelingId: v.string(),
        body: v.string(),
        basis,
        enabled: v.boolean(),
        order: v.number(),
        builtIn: v.boolean(),
      }),
    ),
    taskTypes: v.array(listItem),
    obstacles: v.array(listItem),
    plans: v.array(
      v.strictObject({
        id: v.string(),
        place: v.string(),
        cueDetail: v.exactOptional(v.string()),
        firstAction: v.string(),
        time: v.string(),
        days: v.array(weekDay),
        graceMin: v.number(),
        active: v.boolean(),
        createdAt: v.number(),
        editCount: v.number(),
      }),
    ),
    settings: v.strictObject({
      theme: v.picklist(['system', 'light', 'dark']),
      weekStartsOn: weekDay,
      checkinDay: weekDay,
      checkinDismissedWeek: v.exactOptional(v.string()),
      lastExportAt: v.exactOptional(v.number()),
      persistRequested: v.boolean(),
      onboarded: v.boolean(),
    }),
    events: v.array(eventSchema),
  }),
});

export function buildExport(
  data: ExportData,
  meta: { exportedAt: string; build: string },
): ExportFile {
  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: meta.exportedAt,
    app: { name: 'Arohexis', build: meta.build },
    data,
  };
}

export type ParseResult = { ok: true; file: ExportFile } | { ok: false; message: string };

function isNewerVersion(input: unknown): boolean {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return false;
  const { format, version } = input as { format?: unknown; version?: unknown };
  return (
    format === EXPORT_FORMAT && Number.isInteger(version) && (version as number) > EXPORT_VERSION
  );
}

/** Validates untrusted JSON. Never throws. */
export function parseExport(input: unknown): ParseResult {
  if (isNewerVersion(input)) return { ok: false, message: EXPORT_MESSAGES.newerVersion };
  const result = v.safeParse(exportSchema, input);
  if (!result.success) return { ok: false, message: EXPORT_MESSAGES.notABackup };
  return { ok: true, file: result.output };
}

export function exportFileName(at: number, tz: string): string {
  return `arohexis-export-${localDate(at, tz)}.json`;
}
