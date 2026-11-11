export const stuckButton = "I'm stuck";

export function startsThisWeek(n: number): string {
  return n === 1 ? '1 start this week' : `${n} starts this week`;
}

export const nav = {
  label: 'Main',
  // Plans arrives in M2 and Insights in M3; both stay hidden until then.
  plans: 'Plans',
  insights: 'Insights',
  settings: 'Settings',
} as const;
