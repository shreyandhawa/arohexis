import { storageError } from '../../copy/common';
import { Button } from '../components/Button';
import styles from '../layout/Shell.module.css';

export function StorageError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className={styles['page']}>
      <main className={styles['main']}>
        <h1 className={styles['title']}>{storageError.title}</h1>
        <p>{storageError.body}</p>
        <Button onClick={onRetry}>{storageError.retry}</Button>
      </main>
    </div>
  );
}
