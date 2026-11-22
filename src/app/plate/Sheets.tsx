import LineCard, { LINE_CARD_TITLE_ID } from './LineCard';
import { Sheet } from './Sheet';

export type SheetsProps = {
  lineFor: string | null;
  opener: HTMLElement | null;
  onCloseLine(): void;
  /** Called when the sheets' chunk could not load. */
  onFailed(): void;
};

/** The plate's line sheet in a lazy chunk, loaded when it first opens. */
export default function Sheets({ lineFor, opener, onCloseLine }: SheetsProps) {
  return (
    <>
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
