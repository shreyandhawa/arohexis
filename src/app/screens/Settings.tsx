import { Link } from 'react-router';
import { settings } from '../../copy/settings';
import styles from '../layout/Shell.module.css';

export function Settings() {
  return (
    <>
      <h1 className={styles['title']}>{settings.title}</h1>
      <ul className={styles['list']}>
        <li className={styles['listItem']}>
          <Link to="/settings/data" className={styles['listLink']}>
            {settings.data}
          </Link>
        </li>
        <li className={styles['listItem']}>
          <Link to="/about" className={styles['listLink']}>
            {settings.about}
          </Link>
        </li>
      </ul>
    </>
  );
}
