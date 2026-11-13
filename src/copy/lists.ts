import type { Basis } from '../domain/events';

export const basisLabels: Readonly<Record<Basis, string>> = {
  'name-the-feeling': 'Name the feeling',
  'shrink-the-step': 'Shrink the step',
  'self-kindness': 'Self-kindness',
  reframe: 'Reframe',
  'pair-a-reward': 'Pair with a reward',
};

export const lists = {
  name: 'Name',
  save: 'Save',
  labelHint: '1 to 40 characters',
  moveUp: (label: string): string => `Move ${label} up`,
  moveDown: (label: string): string => `Move ${label} down`,
  position: 'Order',
} as const;

export const feelingsEditor = {
  title: 'Feelings and responses',
  intro:
    'Rename, reorder, turn off or add feelings. Built-in feelings and responses can be turned off, never deleted.',
  enabled: 'Show in the feeling list',
  alwaysOn: 'Always shown last, and it stays on.',
  add: 'Add a feeling',
  responses: (n: number): string => `Responses (${n})`,
  otherResponses: 'This feeling always uses one general response.',
  responseText: 'Response',
  responseEnabled: 'Use this response',
  basis: 'Basis',
  source: (text: string): string => `Source: ${text}`,
  wordCount: (n: number): string => `${n} of 40 words`,
  overCap: 'Shorten this to 40 words or fewer.',
  addResponse: 'Add a response',
  newResponse: 'New response',
  none: 'No responses yet. This feeling uses the general response.',
} as const;

export const obstaclesEditor = {
  title: 'Obstacles',
  intro: 'What gets in the way of a plan, in your words. Rename, reorder, turn off or add.',
  enabled: 'Offer this obstacle',
  add: 'Add an obstacle',
} as const;
