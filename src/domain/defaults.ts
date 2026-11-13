import type { Feeling, FeelingResponse, ListItem, Part } from './config';
import type { Basis } from './events';

export const OTHER_FEELING_ID = 'other';
export const GENERIC_RESPONSE_ID = 'generic.any';

export const DEFAULT_FEELINGS: readonly Feeling[] = [
  { id: 'anxious', label: 'Anxious', order: 1, enabled: true, builtIn: true },
  { id: 'bored', label: 'Bored', order: 2, enabled: true, builtIn: true },
  { id: 'overwhelmed', label: 'Overwhelmed', order: 3, enabled: true, builtIn: true },
  { id: 'unsure', label: 'Unsure where to begin', order: 4, enabled: true, builtIn: true },
  { id: 'perfectionistic', label: 'Perfectionistic', order: 5, enabled: true, builtIn: true },
  { id: OTHER_FEELING_ID, label: 'Something else', order: 99, enabled: true, builtIn: true },
];

export const DEFAULT_RESPONSES: readonly FeelingResponse[] = [
  {
    id: 'anxious.name',
    feelingId: 'anxious',
    body: "That's anxiety. You can feel it and still start. You don't have to feel ready first. What would your hands do in the first ten seconds?",
    basis: 'name-the-feeling',
    enabled: true,
    order: 1,
    builtIn: true,
  },
  {
    id: 'anxious.shrink',
    feelingId: 'anxious',
    body: 'Make the step so small it feels almost silly: open the file, write the date, pick up the pen. Only that. Two minutes, then you can stop.',
    basis: 'shrink-the-step',
    enabled: true,
    order: 2,
    builtIn: true,
  },
  {
    id: 'anxious.kind',
    feelingId: 'anxious',
    body: "Feeling anxious about this makes sense. Talk to yourself the way you'd talk to a friend who's stuck. Then give the very first step two minutes.",
    basis: 'self-kindness',
    enabled: true,
    order: 3,
    builtIn: true,
  },
  {
    id: 'bored.reward',
    feelingId: 'bored',
    body: 'Pair it with something you like: a song, a warm drink, a better chair. Set it up, then start before the song ends.',
    basis: 'pair-a-reward',
    enabled: true,
    order: 1,
    builtIn: true,
  },
  {
    id: 'bored.sprint',
    feelingId: 'bored',
    body: "Turn it into a two-minute sprint. How far can you get before the timer runs out? It doesn't have to be good.",
    basis: 'reframe',
    enabled: true,
    order: 2,
    builtIn: true,
  },
  {
    id: 'bored.shrink',
    feelingId: 'bored',
    body: "Pick the least boring piece and do that first. The order doesn't matter yet.",
    basis: 'shrink-the-step',
    enabled: true,
    order: 3,
    builtIn: true,
  },
  {
    id: 'overwhelmed.shrink',
    feelingId: 'overwhelmed',
    body: "You only need the first step, not the whole plan. What's one thing you can physically do in two minutes?",
    basis: 'shrink-the-step',
    enabled: true,
    order: 1,
    builtIn: true,
  },
  {
    id: 'overwhelmed.unload',
    feelingId: 'overwhelmed',
    body: "Write what's in your head as three short lines. Then pick the easiest one. That's your first step.",
    basis: 'shrink-the-step',
    enabled: true,
    order: 2,
    builtIn: true,
  },
  {
    id: 'overwhelmed.kind',
    feelingId: 'overwhelmed',
    body: "It's a lot, and it's fine to feel that. You don't have to sort all of it now. Two minutes on one corner is enough.",
    basis: 'self-kindness',
    enabled: true,
    order: 3,
    builtIn: true,
  },
  {
    id: 'unsure.open',
    feelingId: 'unsure',
    body: 'Open the thing: the document, the email, the book. Opening it counts as starting.',
    basis: 'shrink-the-step',
    enabled: true,
    order: 1,
    builtIn: true,
  },
  {
    id: 'unsure.obvious',
    feelingId: 'unsure',
    body: 'Begin with the obvious part: a title, a date, a file name. Clarity can come later.',
    basis: 'shrink-the-step',
    enabled: true,
    order: 2,
    builtIn: true,
  },
  {
    id: 'unsure.question',
    feelingId: 'unsure',
    body: "Write down the question you're stuck on, as a note to yourself. Naming what's unclear is real work.",
    basis: 'reframe',
    enabled: true,
    order: 3,
    builtIn: true,
  },
  {
    id: 'perfectionistic.rough',
    feelingId: 'perfectionistic',
    body: "Make a deliberately rough version. It's a draft. You'll improve it later.",
    basis: 'reframe',
    enabled: true,
    order: 1,
    builtIn: true,
  },
  {
    id: 'perfectionistic.enough',
    feelingId: 'perfectionistic',
    body: 'Aim for "good enough to fix": three bullet points, a sketch, a messy first line.',
    basis: 'reframe',
    enabled: true,
    order: 2,
    builtIn: true,
  },
  {
    id: 'perfectionistic.kind',
    feelingId: 'perfectionistic',
    body: 'High standards are fine, and they can wait for the second pass. For now, two minutes of imperfect work.',
    basis: 'self-kindness',
    enabled: true,
    order: 3,
    builtIn: true,
  },
  {
    id: 'generic.any',
    feelingId: 'other',
    body: "Whatever the feeling is, you can have it and still start. What's the very first physical step? Two minutes on just that.",
    basis: 'name-the-feeling',
    enabled: true,
    order: 1,
    builtIn: true,
  },
];

export const DEFAULT_PARTS: readonly Part[] = [
  { id: 'work', label: 'Work', order: 1, enabled: true, colour: 1, region: 1 },
  { id: 'study', label: 'Study', order: 2, enabled: true, colour: 2, region: 2 },
  { id: 'health', label: 'Health', order: 3, enabled: true, colour: 3, region: 3 },
  { id: 'home', label: 'Home', order: 4, enabled: true, colour: 4, region: 4 },
  { id: 'money', label: 'Money', order: 5, enabled: true, colour: 5, region: 5 },
];

export const DEFAULT_OBSTACLES: readonly ListItem[] = [
  { id: 'timing', label: "Timing didn't fit", order: 1, enabled: true },
  { id: 'energy', label: 'Low energy', order: 2, enabled: true },
  { id: 'too-big', label: 'First step felt too big', order: 3, enabled: true },
  { id: 'came-up', label: 'Something came up', order: 4, enabled: true },
  { id: 'forgot', label: 'Forgot', order: 5, enabled: true },
];

export const BASIS_SOURCES: Readonly<Record<Basis, string>> = {
  'name-the-feeling': 'Garg et al. 2025',
  'shrink-the-step': 'Garg et al. 2025',
  'self-kindness': 'Wohl et al. 2010',
  reframe: 'Rozental et al. 2018 (cognitive techniques used in CBT)',
  'pair-a-reward': 'Garg et al. 2025',
};

export const FROM_A_PLAN_ID = 'from-plan';
export const FROM_A_PLAN_LABEL = 'From a plan';
export const NO_PART_LABEL = 'No part';

export const CHECKIN_STEM = "Starting a task I've been putting off is something…";
export const CHECKIN_ITEMS: readonly [string, string, string, string] = [
  'I do automatically.',
  'I do without having to consciously remember.',
  'I do without thinking.',
  "I start doing before I realize I'm doing it.",
];
export const CHECKIN_SCALE_LABELS = { low: 'Strongly disagree', high: 'Strongly agree' } as const;
export const CHECKIN_ATTRIBUTION =
  'Adapted from the Self-Report Behavioural Automaticity Index (Gardner et al., 2012), CC BY.';
