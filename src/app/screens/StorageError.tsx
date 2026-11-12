import { storageError } from '../../copy/common';
import styles from '../layout/Shell.module.css';

export function StorageError() {
  return (
    <div className={styles['page']}>
      <main className={styles['main']}>
        <h1 className={styles['title']}>{storageError.title}</h1>
        <p>{storageError.body}</p>
      </main>
    </div>
  );
}
