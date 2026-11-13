import { brain } from '../../copy/brain';
import type { Part } from '../../domain/config';
import { Chip } from '../components/Chip';
import styles from './Plate.module.css';

export function PartsRow({
  parts,
  selected,
  onSelect,
}: {
  parts: readonly Part[];
  selected: string | null;
  onSelect(partId: string | null): void;
}) {
  return (
    <div role="group" aria-label={brain.partsLabel} className={styles['partsRow']}>
      <Chip pressed={selected === null} className={styles['chip']} onClick={() => onSelect(null)}>
        {brain.controls.all}
      </Chip>
      {parts.map((part) => (
        <Chip
          key={part.id}
          pressed={selected === part.id}
          className={styles['chip']}
          onClick={() => onSelect(part.id)}
        >
          <span aria-hidden="true" className={styles['swatch']} data-colour={part.colour} />
          {part.label}
        </Chip>
      ))}
    </div>
  );
}
