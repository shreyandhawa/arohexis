import { brain } from '../../copy/brain';
import type { Part } from '../../domain/config';
import { Chip } from '../components/Chip';
import styles from './Plate.module.css';

export function PartsRow({
  parts,
  selected,
  onSelect,
  onPreview,
}: {
  parts: readonly Part[];
  selected: string | null;
  onSelect(partId: string | null): void;
  onPreview(partId: string | null): void;
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
          data-part-id={part.id}
          data-colour={part.colour}
          onPointerEnter={() => onPreview(part.id)}
          onPointerLeave={() => onPreview(null)}
          onFocus={() => onPreview(part.id)}
          onBlur={() => onPreview(null)}
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
