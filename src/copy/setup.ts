export const setup = {
  title: 'What do you want to start more often?',
  hint: 'Name up to six parts of your life. Each gets its own region of the picture, and every start you tag with it lights a line there. You can rename or recolour them later in Settings.',
  field: (n: number) => `Part ${n}`,
  ideas: 'Ideas',
  suggestions: ['Work', 'Study', 'Health', 'Home', 'Money', 'Creative'],
  next: 'Continue',
  needOne: 'Name at least one part to continue.',
  unsaved: "That didn't save. Try again.",
} as const;
