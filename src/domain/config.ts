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
/** Task types and obstacles. */
export type ListItem = { id: string; label: string; order: number; enabled: boolean };
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
};
export type Settings = {
  theme: 'system' | 'light' | 'dark';
  weekStartsOn: WeekDay;
  checkinDay: WeekDay;
  checkinDismissedWeek?: string;
  lastExportAt?: number;
  persistRequested: boolean;
  onboarded: boolean;
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
  taskTypes: ListItem[];
  obstacles: ListItem[];
  plans: Plan[];
  settings: Settings;
};
/** Extended in M2 and M5. */
export type ConfigPatch = { settings?: Partial<Settings> };
