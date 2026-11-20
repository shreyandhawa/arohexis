/** Shown inline when saving an action fails; the person can try again. */
export const actionFailed = "That didn't save. Try again.";

export const feeling = {
  heading: "What's in the way?",
  back: 'Back',
} as const;

export const response = {
  firstStep: 'First step: say it out loud.',
  start: 'Start',
  notNow: 'Not now',
  smallerStill: 'Smaller still',
  /** One quiet line, shown once a response has been tried a few times and has led to a start. */
  ledToStart: (starts: number, shown: number) =>
    `This one has led to a start ${starts} of ${shown} times.`,
} as const;

export const started = {
  title: 'Started.',
  encouragement: "That's the hard part.",
  undo: 'Undo',
  remove: 'Remove this start',
  tagsTitle: 'What is it?',
  oneMinuteLeft: 'One minute left.',
  timerDone: 'Two minutes done.',
  keepGoing: 'Keep going',
  doneForNow: 'Done for now',
  either: 'Either is good.',
} as const;

/** Lines Home shows once after the flow sends someone back. */
export const homeNotices = {
  'start-removed': 'Start removed.',
  'start-gone': 'That start was removed.',
  'not-now': "That's fine. The button's here when you need it.",
} as const;
