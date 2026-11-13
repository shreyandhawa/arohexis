import type { ReactNode } from 'react';
import { brain } from '../../copy/brain';
import styles from './Plate.module.css';

function Control({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick(): void;
  children: ReactNode;
}) {
  return (
    <button type="button" aria-label={label} className={styles['control']} onClick={onClick}>
      <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" focusable="false">
        {children}
      </svg>
    </button>
  );
}

const stroke = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
} as const;

export function TurnControls({ onTurn }: { onTurn(step: -1 | 1): void }) {
  return (
    <div className={`${styles['pair']} ${styles['pairStart']}`}>
      <Control label={brain.controls.turnLeft} onClick={() => onTurn(-1)}>
        <polyline points="14,6 8,12 14,18" {...stroke} strokeLinejoin="round" />
      </Control>
      <Control label={brain.controls.turnRight} onClick={() => onTurn(1)}>
        <polyline points="10,6 16,12 10,18" {...stroke} strokeLinejoin="round" />
      </Control>
    </div>
  );
}

export function ZoomControls({ onZoom }: { onZoom(step: -1 | 1): void }) {
  return (
    <div className={`${styles['pair']} ${styles['pairEnd']}`}>
      <Control label={brain.controls.zoomOut} onClick={() => onZoom(-1)}>
        <line x1="6" y1="12" x2="18" y2="12" {...stroke} />
      </Control>
      <Control label={brain.controls.zoomIn} onClick={() => onZoom(1)}>
        <line x1="6" y1="12" x2="18" y2="12" {...stroke} />
        <line x1="12" y1="6" x2="12" y2="18" {...stroke} />
      </Control>
    </div>
  );
}
