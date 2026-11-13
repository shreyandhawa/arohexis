import type { Strength } from '../domain/brainSpace';
import type { FocusRule } from '../domain/focus';

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
  /** One part's sentence in the text equivalent. `items` are plan-line items; `startLines` is null when there is no clause. */
  partLine: (
    label: string,
    starts: number,
    items: readonly string[],
    startLines: number | null,
  ): string => {
    let text = `${label}: ${plural(starts, 'start', 'starts')}.`;
    if (items.length > 0) text += ` Plan lines: ${items.join('; ')}.`;
    if (startLines !== null) text += ` ${plural(startLines, 'start line', 'start lines')}.`;
    return text;
  },
  partsLabel: 'Parts',
  card: {
    close: 'Close',
    focusTitle: 'What to focus on',
    aboutLink: 'About',
    /** The five lines of spec §16.9, verbatim. */
    focus: {
      lapse:
        "Go easy on the one that didn't happen. In one study, forgiving yourself was associated with less procrastination later.",
      waiting: "Make the plan's first step small enough to do in two minutes.",
      'stable-cue':
        'Keep the same time and place. A stable cue may help. In one review, habits took a median of about two months to form, and the range was wide.',
      'add-plan':
        'An if-then plan, with a set time, place and first step, may help these starts happen.',
      'name-feeling':
        "When you're stuck here, name the feeling, then pick a first step your hands can do.",
    } satisfies Record<FocusRule, string>,
  },
  controls: {
    still: 'Still',
    zoomIn: 'Zoom in',
    zoomOut: 'Zoom out',
    turnLeft: 'Turn left',
    turnRight: 'Turn right',
    all: 'All',
  },
} as const;
