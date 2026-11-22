export const tour = {
  steps: [
    {
      target: 'start',
      title: 'Light a line',
      body: "When you're stuck on something, tap here. Name the feeling, take a two-minute first step, and a new line lights up in the picture.",
    },
    {
      target: 'parts',
      title: 'Your parts',
      body: 'Tap a part to zoom into its region and see its starts, plans and what to focus on. All shows everything again.',
    },
    {
      target: 'turn',
      title: 'Look around',
      body: 'Turn the picture with the arrows, and zoom with minus and plus on the other side. Arrow keys and + and - work too.',
    },
    {
      target: 'still',
      title: 'Still',
      body: 'Stops all movement in the picture. Tap it again to let it move.',
    },
    {
      target: 'nav',
      title: 'Everything else',
      body: 'Plans give a start a time and place. Insights shows your patterns, Replay plays your weeks back, and Settings holds your parts and data.',
    },
  ],
  label: 'Walkthrough',
  skip: 'Skip',
  back: 'Back',
  next: 'Next',
  done: 'Done',
  again: 'Show the walkthrough again',
} as const;
