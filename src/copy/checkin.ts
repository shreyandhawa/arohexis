export const checkin = {
  title: 'Weekly check-in',
  intro: 'Four quick questions about how starting feels lately. There are no right answers.',
  submit: 'Submit',
  skip: 'Skip this week',
  backUp: 'Back up now',
  saveFailed: "That didn't save. Try again.",
  scale: (n: number) => `${n} of 7`,
  card: {
    region: 'Weekly check-in',
    text: 'How does starting feel lately?',
    action: 'Check in',
  },
} as const;
