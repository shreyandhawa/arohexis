import { updateReady } from '../../copy/home';
import { Button } from './Button';
import styles from './UpdateCard.module.css';

/** The "Update ready" card. Shell owns the service worker state and decides where it shows. */
export function UpdateCard({ onReload }: { onReload(): void }) {
  return (
    <div role="status" className={styles['card']}>
      <p className={styles['message']}>{updateReady.message}</p>
      <Button variant="quiet" className={styles['action']} onClick={onReload}>
        {updateReady.action}
      </Button>
    </div>
  );
}
