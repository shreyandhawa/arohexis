import { brain } from '../../copy/brain';
import type { BrainSpace } from '../../domain/brainSpace';
import type { Part } from '../../domain/config';
import { describeParts } from './describe';

/** Visually hidden. It follows the projection and is not announced live (spec §16.10). */
export function TextEquivalent({ space, parts }: { space: BrainSpace; parts: readonly Part[] }) {
  return (
    <ul className="visually-hidden">
      {describeParts(space, parts).map((entry) => (
        <li key={entry.partId ?? 'core'}>{entry.text}</li>
      ))}
      <li>{space.motion === 'moving' ? brain.moving : brain.resting}</li>
    </ul>
  );
}
