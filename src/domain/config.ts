import type { Basis } from './events';

export type WeekDay = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export type Feeling = {
  id: string;
  label: string;
  order: number;
  enabled: boolean;
  builtIn: boolean;
};
export type FeelingResponse = {
  id: string;
  feelingId: string;
  body: string;
  basis: Basis;
  enabled: boolean;
  order: number;
  builtIn: boolean;
};
/** Obstacles (and M1's task types, which only the migration reads). */
export type ListItem = { id: string; label: string; order: number; enabled: boolean };
export type ColourId = 1 | 2 | 3 | 4 | 5 | 6;
export type RegionId = 1 | 2 | 3 | 4 | 5 | 6;
export type Part = {
  id: string;
  label: string;
  order: number;
  enabled: boolean;
  colour: ColourId;
  region: RegionId;
};
export type Plan = {
  id: string;
  place: string;
  cueDetail?: string;
  firstAction: string;
  time: string;
  days: WeekDay[];
  graceMin: number;
  active: boolean;
  createdAt: number;
  editCount: number;
  /** Epoch ms of the last resume or schedule change; a missing value means `createdAt`. */
  activeSince?: number;
  /** Set from M3. */
  partId?: string;
};
export type Settings = {
  /** Unused since v2.1 (ADR-038, dark only); kept so older backups still import. */
  theme: 'system' | 'light' | 'dark';
  weekStartsOn: WeekDay;
  checkinDay: WeekDay;
  checkinDismissedWeek?: string;
  lastExportAt?: number;
  persistRequested: boolean;
  onboarded: boolean;
  /** Unset follows the system's reduced-motion setting. */
  brainStill?: 'still' | 'moving';
  /** The `start.at` of the newest start Home has shown landing. */
  lastSeenStart?: number;
  /** The owner chose Not now on Home's make-a-plan card. */
  planNudgeDismissed?: boolean;
};
export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  weekStartsOn: 1,
  checkinDay: 0,
  persistRequested: false,
  onboarded: false,
};
export type Config = {
  feelings: Feeling[];
  responses: FeelingResponse[];
  parts: Part[];
  obstacles: ListItem[];
  plans: Plan[];
  settings: Settings;
};
/** Plan changes. `update` takes whole plans; storage keeps the stored id and createdAt and raises editCount. */
export type PlanPatch = {
  add?: readonly Plan[];
  update?: readonly Plan[];
  /** Sets `active: false` without counting as an edit. */
  pause?: readonly string[];
  /** Sets `active: true` and `activeSince` without counting as an edit. */
  resume?: readonly string[];
};
/** Parts are upserted by id. Extended by later milestones: import (M5). */
export type ConfigPatch = {
  settings?: Partial<Settings>;
  parts?: readonly Part[];
  plans?: PlanPatch;
};
