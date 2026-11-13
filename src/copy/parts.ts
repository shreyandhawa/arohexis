export const parts = {
  title: 'Parts',
  intro: 'Up to six. Renaming or recoloring a part never moves its light.',
  add: 'Add a part',
  name: 'Name',
  color: 'Color',
  save: 'Save',
  enabled: 'Show after a start',
  limit: 'You have six parts, the most there can be.',
  labelHint: '1 to 24 characters',
  colorName: (n: number): string => `Color ${n}`,
} as const;
