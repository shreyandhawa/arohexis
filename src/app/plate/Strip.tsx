import { useMemo, useRef } from 'react';
import { brain } from '../../copy/brain';
import type { Attempt } from '../../domain/attempts';
import { summaryLines } from '../../domain/brainSpace';
import { Chip } from '../components/Chip';
import { useData } from '../data/DataProvider';
import { useBrainSpace } from '../hooks/useBrainSpace';
import { useStill } from '../hooks/useStill';
import { useRenderer } from './useRenderer';
import styles from './Strip.module.css';

const noop = (): void => {};

/** The Started strip: the new start's light arrives over the two minutes (spec §16.10). */
export function Strip({ attempt }: { attempt: Attempt }) {
  const { clock } = useData();
  const data = useBrainSpace();
  const { still, toggle } = useStill();
  const canvas = useRef<HTMLCanvasElement>(null);
  const startAt = attempt.start?.at;
  const partId = attempt.part?.id;

  const state = useMemo(() => {
    if (!data || startAt === undefined) return undefined;
    const known = partId !== undefined && data.parts.some((p) => p.id === partId);
    const part = known ? partId : null;
    // A start line is named for its attempt; an on-cue start lights its plan's line.
    const lineId = data.space.lines.some((l) => l.id === attempt.id)
      ? attempt.id
      : `${attempt.planId ?? ''}:${part ?? 'core'}`;
    return {
      space: data.space,
      parts: data.parts,
      selected: null,
      still,
      reveal: { lineId, startAt },
      burstAt: startAt,
    };
  }, [data, attempt.id, attempt.planId, partId, startAt, still]);

  useRenderer(canvas, { variant: 'strip', now: () => clock.now(), onPartTap: noop }, state);

  const motion = still ? 'still' : (data?.space.motion ?? 'moving');
  return (
    <div className={`plate plate-scope ${styles['strip']}`} data-motion={motion}>
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
        </>
      )}
    </div>
  );
}
