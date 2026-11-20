import LineCard, { LINE_CARD_TITLE_ID } from './LineCard';
import { PART_CARD_TITLE_ID, PartCard } from './PartCard';
import { Sheet } from './Sheet';

export type SheetsProps = {
  cardFor: string | null;
  lineFor: string | null;
  opener: HTMLElement | null;
  onCloseCard(): void;
  onCloseLine(): void;
  /** Called when the sheets' chunk could not load. */
  onFailed(): void;
};

/** The plate's two sheets in one lazy chunk, loaded when the first one opens. */
export default function Sheets({
  cardFor,
  lineFor,
  opener,
  onCloseCard,
  onCloseLine,
}: SheetsProps) {
  return (
    <>
      <Sheet
        open={cardFor !== null}
        onClose={onCloseCard}
        labelledBy={PART_CARD_TITLE_ID}
        opener={opener}
      >
        {cardFor !== null && <PartCard partId={cardFor} onClose={onCloseCard} />}
      </Sheet>
      <Sheet
        open={lineFor !== null}
        onClose={onCloseLine}
        labelledBy={LINE_CARD_TITLE_ID}
        opener={opener}
      >
        {lineFor !== null && <LineCard lineId={lineFor} />}
      </Sheet>
    </>
  );
}
