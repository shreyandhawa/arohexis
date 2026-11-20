/**
 * "Smaller still": two steps per built-in feeling, each smaller than the last,
 * then one floor shared by every feeling (user-added ones included).
 */
export const smallerSteps: Readonly<Record<string, readonly [string, string]>> = {
  anxious: [
    'Open it and read only the first line. You can feel anxious and read one line.',
    'Just open it. You can close it again straight away.',
  ],
  bored: [
    'Put on one song you like and work on it only until the song ends.',
    'Put the song on and open it. Nothing else while it plays.',
  ],
  overwhelmed: [
    'Do only the smallest piece, for one minute. Leave the rest where it is.',
    "Open it and find the smallest piece. Don't do it yet. Just find it.",
  ],
  unsure: [
    "Write the one question you're stuck on, in a single line.",
    "Just open it and look. You don't have to know where to begin.",
  ],
  perfectionistic: [
    "Write one rough line on purpose. It's a draft, so it can be rough.",
    "Open it and type one word, any word. It doesn't have to be the right one.",
  ],
  other: [
    'Open it and give it one minute. You can leave it after that.',
    'Just open it. Nothing else yet.',
  ],
};

/** The last step, the same for every feeling: smaller than opening it. */
export const smallestStep =
  'Put it where you can see it: the book on the desk, the tab on your screen. That counts.';

/** The steps for a feeling, smaller each time, ending at the floor. */
export function smallerLadder(feelingId: string | undefined): readonly string[] {
  const own = (feelingId && smallerSteps[feelingId]) || [];
  return [...own, smallestStep];
}
