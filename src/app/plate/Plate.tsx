import { useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { brain } from '../../copy/brain';
import { summaryLines } from '../../domain/brainSpace';
import { Chip } from '../components/Chip';
import { useData } from '../data/DataProvider';
import { useBrainSpace } from '../hooks/useBrainSpace';
import { useStill } from '../hooks/useStill';
import { shownParts } from './describe';
import { PART_CARD_TITLE_ID, PartCard } from './PartCard';
import { PartsRow } from './PartsRow';
import { Sheet } from './Sheet';
import { TurnControls, ZoomControls } from './PlateControls';
import { TextEquivalent } from './TextEquivalent';
import { useRenderer } from './useRenderer';
import styles from './Plate.module.css';

type Props = {
  selected: string | null;
  onSelect(partId: string | null): void;
  /** A line shown on the plate's bottom edge, such as "Start removed." */
  notice?: string | undefined;
};

export function Plate({ selected, onSelect, notice }: Props) {
  const { clock } = useData();
  const data = useBrainSpace();
  const { still, toggle } = useStill();
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLElement>(null);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  // The card opens on a tap; closing it keeps the part selected until All clears it.
  const [cardFor, setCardFor] = useState<string | null>(null);
  const state = useMemo(
    () => data && { space: data.space, parts: data.parts, selected, still },
    [data, selected, still],
  );
  // Tapping a part, on the plate or its chip, opens its card. Focus returns to that part's chip.
  function select(partId: string | null) {
    setCardFor(partId);
    if (partId !== null) {
      const chips = root.current?.querySelectorAll<HTMLElement>('[data-part-id]');
      setOpener([...(chips ?? [])].find((c) => c.dataset['partId'] === partId) ?? null);
    }
    onSelect(partId);
  }

  const renderer = useRenderer(
    canvas,
    { variant: 'plate', now: () => clock.now(), onPartTap: select },
    state,
  );

  // While a plate control has focus: arrows turn and plus and minus zoom (spec §16.10).
  function onKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (!(event.target instanceof HTMLButtonElement)) return;
    const moves: Record<string, () => void> = {
      ArrowLeft: () => renderer.turn(-1),
      ArrowRight: () => renderer.turn(1),
      '+': () => renderer.zoom(1),
      '=': () => renderer.zoom(1),
      '-': () => renderer.zoom(-1),
      _: () => renderer.zoom(-1),
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    move();
  }

  const motion = still ? 'still' : (data?.space.motion ?? 'moving');
  return (
    <>
      <section
        role="region"
        aria-label={brain.regionLabel}
        ref={root}
        className={`plate plate-scope ${styles['plate']}`}
        data-motion={motion}
        onKeyDown={onKeyDown}
      >
        <div className={styles['stage']}>
          <canvas ref={canvas} aria-hidden="true" className={styles['canvas']} />
          {data && (
            <>
              <p className={styles['summary']}>
                {data.space.totalStarts === 0
                  ? brain.empty
                  : brain.summary(data.space.totalStarts, summaryLines(data.space))}
              </p>
              <Chip pressed={still} className={styles['still']} onClick={toggle}>
                {brain.controls.still}
              </Chip>
              <TurnControls onTurn={renderer.turn} />
              <ZoomControls onZoom={renderer.zoom} />
              {notice && (
                <p role="status" className={styles['notice']}>
                  {notice}
                </p>
              )}
              <TextEquivalent space={data.space} parts={data.parts} />
            </>
          )}
        </div>
        {data ? (
          <PartsRow
            parts={shownParts(data.space, data.parts)}
            selected={selected}
            onSelect={select}
          />
        ) : (
          // Holds the row's height until data loads, so the plate doesn't jump.
          <div aria-hidden="true" className={styles['partsRow']} />
        )}
      </section>
      <Sheet
        open={cardFor !== null}
        onClose={() => setCardFor(null)}
        labelledBy={PART_CARD_TITLE_ID}
        opener={opener}
      >
        {cardFor !== null && <PartCard partId={cardFor} onClose={() => setCardFor(null)} />}
      </Sheet>
    </>
  );
}
