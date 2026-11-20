import { useNavigate } from 'react-router';
import { stuckButton } from '../../copy/home';
import styles from './StuckButton.module.css';

/** "Light a line" (ADR-039): a dark capsule and a glowing ring, the point where every line begins. */
export function StuckButton({ variant = 'quiet' }: { variant?: 'primary' | 'quiet' }) {
  const navigate = useNavigate();
  return (
    <button
      type="button"
      className={`${styles['stuck']} ${styles[variant]}`}
      onClick={() => void navigate('/stuck')}
    >
      <svg className={styles['ring']} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" />
      </svg>
      {stuckButton}
    </button>
  );
}
