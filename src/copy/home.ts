export const stuckButton = "I'm stuck";

export function startsThisWeek(n: number): string {
  return n === 1 ? '1 start this week' : `${n} starts this week`;
}

export const nav = {
  label: 'Main',
  // Plans arrives in M3 and Insights in M4; both stay hidden until then.
  plans: 'Plans',
  insights: 'Insights',
  settings: 'Settings',
} as const;

export const installNote =
  'For the best experience, add Arohexis to your Home Screen: tap Share, then Add to Home Screen. Safari and the Home Screen app keep separate data.';

export const updateReady = {
  message: 'A new version is ready.',
  action: 'Reload',
} as const;
