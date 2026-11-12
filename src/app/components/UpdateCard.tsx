import { useLocation } from 'react-router';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { updateReady } from '../../copy/home';
import { Button } from './Button';
import styles from './UpdateCard.module.css';

/** Never interrupt the stuck flow or the Started screen; the card waits until they end. */
function inFlow(pathname: string): boolean {
  return pathname.startsWith('/stuck') || pathname.startsWith('/started');
}

export function UpdateCard() {
  const { pathname } = useLocation();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh || inFlow(pathname)) return null;
  return (
    <div role="status" className={styles['card']}>
      <p className={styles['message']}>{updateReady.message}</p>
      <Button
        variant="quiet"
        className={styles['action']}
        onClick={() => void updateServiceWorker(true)}
      >
        {updateReady.action}
      </Button>
    </div>
  );
}
