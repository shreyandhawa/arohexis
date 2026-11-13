import { about } from './about';

export const welcome = {
  title: 'Welcome',
  intro: about.intro,
  notMedicalAdvice: about.notMedicalAdvice,
  ios: 'Add Arohexis to your Home Screen: tap Share, then Add to Home Screen. Your data stays on this device. Safari and the Home Screen app keep separate copies, so use the Home Screen app.',
  next: 'Next',
  choose: 'How would you like to begin?',
  startFresh: 'Start fresh',
  startFreshHint: 'Begin with an empty record.',
  exploreDemo: 'Explore the demo',
  exploreDemoHint: 'Ten weeks of sample data. Nothing touches your own.',
} as const;

export function stepOf(step: number, total: number): string {
  return `Step ${step} of ${total}`;
}
