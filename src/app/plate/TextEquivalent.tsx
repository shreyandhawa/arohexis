import { brain } from '../../copy/brain';
import type { BrainSpace } from '../../domain/brainSpace';
import type { Part } from '../../domain/config';
import { describeParts } from './describe';

/** Start lines listed as buttons; the newest ones, so the list stays short. */
const LISTED_STARTS = 12;

type Props = {
  space: BrainSpace;
  parts: readonly Part[];
  onOpenLine(lineId: string, opener: HTMLElement): void;
};

/** Visually hidden. It follows the projection and is not announced live (spec §16.10). */
export function TextEquivalent({ space, parts, onOpenLine }: Props) {
  const lit = space.lines.filter((l) =>
    l.kind === 'plan' ? !l.hidden && l.strength !== 'waiting' : l.partId !== null && !l.undone,
  );
  const starts = lit.filter((l) => l.kind === 'start').slice(-LISTED_STARTS);
  const shown = [...lit.filter((l) => l.kind === 'plan'), ...starts];
  return (
    <>
      <ul className="visually-hidden">
        {describeParts(space, parts).map((entry) => (
          <li key={entry.partId ?? 'core'}>{entry.text}</li>
        ))}
        <li>{space.motion === 'moving' ? brain.moving : brain.resting}</li>
      </ul>
      <ul className="visually-hidden" aria-label={brain.line.listLabel}>
        {shown.map((l, i) => (
          <li key={l.id}>
            <button type="button" onClick={(e) => onOpenLine(l.id, e.currentTarget)}>
              {brain.line.open(
                i + 1,
                l.kind === 'plan' ? brain.strength[l.strength] : brain.startLines(1),
              )}
            </button>
          </li>
        ))}
      </ul>
    </>
  );
}
