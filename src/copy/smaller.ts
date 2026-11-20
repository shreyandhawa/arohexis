/**
 * "Smaller still": two steps per built-in feeling, each smaller than the last,
 * then one floor shared by every feeling (user-added ones included).
 */
export const smallerSteps: Readonly<Record<string, readonly [string, string]>> = {
  anxious: [
    'Sit where you would do this. Put one hand on the thing you need, and rest it there for three breaths.',
    'Look at it. Just look, for ten seconds. You can feel anxious and look.',
  ],
  bored: [
    'Put on one song you like and set the thing in front of you. You are only setting up.',
    'Touch it. Pick it up or tap it awake, then put it down again if you like.',
  ],
  overwhelmed: [
    'Pick one corner of it, the smallest one you can see. Put a finger on it. Ignore the rest for now.',
    'Write one word for that corner on a scrap of paper. One word is plenty.',
  ],
  unsure: [
    'Say out loud, "I don\'t know yet, and I\'m going to open it anyway." Then reach for it.',
    'Put your hand on it and leave it there while you take one slow breath.',
  ],
  perfectionistic: [
    'Make one ugly mark on purpose: a scribble, a typo, a wrong first line. It is only a draft.',
    'Type or write a single letter, any letter. It does not have to be the right one.',
  ],
  other: [
    'Stand up, roll your shoulders once, and sit back down facing the thing.',
    'Rest your hand next to it. Hand there, nothing else.',
  ],
};

/** The last step, the same for every feeling. */
export const smallestStep = "Just open it. You don't have to do anything yet.";

/** The steps for a feeling, smaller each time, ending at the floor. */
export function smallerLadder(feelingId: string | undefined): readonly string[] {
  const own = (feelingId && smallerSteps[feelingId]) || [];
  return [...own, smallestStep];
}
