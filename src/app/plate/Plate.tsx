import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
  type KeyboardEvent,
} from 'react';
import type { SheetsProps } from './Sheets';
import { brain } from '../../copy/brain';
import { summaryLines, type BrainSpace } from '../../domain/brainSpace';
import type { Part } from '../../domain/config';
import { Chip } from '../components/Chip';
import { useData } from '../data/DataProvider';
import { useBrainSpace } from '../hooks/useBrainSpace';
import { useConfig } from '../hooks/useConfig';
import { useStill } from '../hooks/useStill';
import { shownParts } from './describe';
import { landFor } from './landing';
import { PartsRow } from './PartsRow';
import { TurnControls, ZoomControls } from './PlateControls';
import { TextEquivalent } from './TextEquivalent';
import { useRenderer } from './useRenderer';
import styles from './Plate.module.css';

/** If the sheets' chunk cannot load (offline, or a stale cache after an update), say so and close. */
function SheetsFailed({ cardFor, lineFor, onFailed }: SheetsProps) {
  const open = cardFor !== null || lineFor !== null;
  useEffect(() => {
    if (open) onFailed();
  }, [open, onFailed]);
  return null;
}

const Sheets = lazy<ComponentType<SheetsProps>>(() =>
  import('./Sheets').catch(() => ({ default: SheetsFailed })),
);

/** Under this many counted starts the summary also says what a start does. */
const QUIET_BELOW = 5;

type Props = {
  selected: string | null;
  onSelect(partId: string | null): void;
  /** A line shown on the plate's bottom edge, such as "Start removed." */
  notice?: string | undefined;
  /** A picture to show in place of the live one, such as a Replay frame. */
  data?: { space: BrainSpace; parts: readonly Part[] } | undefined;
  /** Home only: land the newest start's line once, and remember it (spec §16.8). */
  lands?: boolean | undefined;
};

export function Plate({ selected, onSelect, notice, data: frame, lands }: Props) {
  const { clock, config: store } = useData();
  const config = useConfig();
  const live = useBrainSpace();
  const data = frame ?? live;
  const { still, toggle } = useStill();
  const canvas = useRef<HTMLCanvasElement>(null);
  const root = useRef<HTMLElement>(null);
  const [opener, setOpener] = useState<HTMLElement | null>(null);
  // The card opens on a tap; closing it keeps the part selected until All clears it.
  const [cardFor, setCardFor] = useState<string | null>(null);
  // Hovering or focusing a chip previews its part. It opens no card.
  const [lineFor, setLineFor] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [land, setLand] = useState<string | undefined>();
  const newest = live?.space.newest;
  const seen = config?.settings.lastSeenStart;
  const [armed, setArmed] = useState(false);
  const [sheetsFailed, setSheetsFailed] = useState(false);
  const onSheetsFailed = useCallback(() => {
    setCardFor(null);
    setLineFor(null);
    setSheetsFailed(true);
  }, []);
  const state = useMemo(
    () =>
      data && {
        space: data.space,
        parts: data.parts,
        selected,
        still,
        ...(preview !== null && { preview }),
        ...(land !== undefined && { land }),
      },
    [data, selected, still, preview, land],
  );
  // Tapping a part, on the plate or its chip, opens its card. Focus returns to that part's chip.
  function select(partId: string | null) {
    setCardFor(partId);
    if (partId !== null) {
      setSheetsFailed(false);
      setArmed(true);
      const chips = root.current?.querySelectorAll<HTMLElement>('[data-part-id]');
      setOpener([...(chips ?? [])].find((c) => c.dataset['partId'] === partId) ?? null);
    }
    onSelect(partId);
  }

  // A line opens from the text list's button; a tap on the canvas hands focus back to that line's button.
  function openLine(lineId: string, from: HTMLElement | null) {
    const button = [...(root.current?.querySelectorAll<HTMLElement>('[data-line-id]') ?? [])].find(
      (b) => b.dataset['lineId'] === lineId,
    );
    setOpener(from ?? button ?? canvas.current);
    setSheetsFailed(false);
    setArmed(true);
    setLineFor(lineId);
  }

  const renderer = useRenderer(
    canvas,
    {
      variant: 'plate',
      now: () => clock.now(),
      onPartTap: select,
      onLineTap: (id) => openLine(id, null),
    },
    state,
  );
  const { ready } = renderer;
  useEffect(() => {
    if (!lands || !newest || !config || !ready) return;
    const lineId = landFor(newest, seen, clock.now());
    if (lineId === undefined) return;
    setLand(lineId);
    // Remembered only once the renderer can show it, and the page is in view.
    const remember = () =>
      void store.applyConfigPatch({ settings: { lastSeenStart: newest.at } }).catch(console.error);
    if (!document.hidden) {
      remember();
      return;
    }
    const onVisible = () => {
      if (document.hidden) return;
      document.removeEventListener('visibilitychange', onVisible);
      remember();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [lands, newest, seen, config, clock, store, ready]);

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
        className={`plate ${styles['plate']}`}
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
                {data.space.totalStarts > 0 && data.space.totalStarts < QUIET_BELOW && (
                  <> {brain.firstLines}</>
                )}
              </p>
              <Chip pressed={still} className={styles['still']} onClick={toggle}>
                {brain.controls.still}
              </Chip>
              <TurnControls onTurn={renderer.turn} />
              <ZoomControls onZoom={renderer.zoom} />
              {(notice || sheetsFailed) && (
                <p role="status" className={styles['notice']}>
                  {notice ?? (sheetsFailed ? brain.cardUnavailable : undefined)}
                </p>
              )}
              <TextEquivalent space={data.space} parts={data.parts} onOpenLine={openLine} />
            </>
          )}
        </div>
        {data ? (
          <PartsRow
            parts={shownParts(data.space, data.parts)}
            selected={selected}
            onSelect={select}
            onPreview={setPreview}
          />
        ) : (
          // Holds the row's height until data loads, so the plate doesn't jump.
          <div aria-hidden="true" className={styles['partsRow']} />
        )}
      </section>
      {armed && (
        <Suspense fallback={null}>
          <Sheets
            cardFor={cardFor}
            lineFor={lineFor}
            opener={opener}
            onCloseCard={() => setCardFor(null)}
            onCloseLine={() => setLineFor(null)}
            onFailed={onSheetsFailed}
          />
        </Suspense>
      )}
    </>
  );
}
