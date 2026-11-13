import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import { brain } from '../../copy/brain';
import { Button } from '../components/Button';
import styles from './Sheet.module.css';

type Props = {
  open: boolean;
  onClose(): void;
  labelledBy: string;
  /** Focus returns here on close. Safari doesn't focus a tapped button, so the opener is passed. */
  opener: HTMLElement | null;
  children: ReactNode;
};

/** A modal sheet on a native <dialog>: Esc and the Close button close it (spec §16.10). */
export function Sheet({ open, onClose, labelledBy, opener, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();
  }, [open]);

  // Closing for any reason, Esc included, hands focus back to the opener.
  function onDialogClose() {
    opener?.focus();
    onClose();
  }

  // Tab wraps inside the sheet, so focus never leaves it for the browser's own controls.
  function onKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const stops = event.currentTarget.querySelectorAll<HTMLElement>('a[href], button');
    const first = stops[0];
    const last = stops[stops.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <dialog
      ref={dialog}
      aria-labelledby={labelledBy}
      className={styles['sheet']}
      onClose={onDialogClose}
      onKeyDown={onKeyDown}
    >
      {open && (
        <div className={styles['body']}>
          {children}
          <Button variant="quiet" onClick={onClose}>
            {brain.card.close}
          </Button>
        </div>
      )}
    </dialog>
  );
}
