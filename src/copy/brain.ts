import type { Strength } from '../domain/brainSpace';

const plural = (n: number, one: string, many: string): string => `${n} ${n === 1 ? one : many}`;

/** Brain space copy (spec §16.9). */
export const brain = {
  regionLabel: 'Brain space',
  empty: 'Your starts will light up here.',
  noPart: 'No part',
  moving: 'Signals are moving.',
  resting: 'Signals are resting. One start sets them moving again.',
  summary: (starts: number, lines: number): string =>
    `${plural(starts, 'start', 'starts')} · ${plural(lines, 'line', 'lines')}`,
  strength: {
    waiting: 'Waiting',
    1: 'New',
    2: 'Repeated',
    3: 'Steady',
    4: 'Well-worn',
  } satisfies Record<Strength, string>,
  starts: (n: number): string => plural(n, 'start', 'starts'),
  onCue: (n: number): string => `${plural(n, 'start', 'starts')} on cue`,
  startLines: (n: number): string => plural(n, 'start line', 'start lines'),
  planLines: 'Plan lines',
  partsLabel: 'Parts',
  controls: {
    still: 'Still',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    turnLeft: 'Turn left',
    turnRight: 'Turn right',
    all: 'All',
  },
} as const;
