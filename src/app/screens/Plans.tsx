import { Link } from 'react-router';
import { plans as copy, planWords } from '../../copy/plans';
import { planSentence } from '../../domain/plans';
import { useConfig } from '../hooks/useConfig';
import shell from '../layout/Shell.module.css';
import styles from './Plans.module.css';

export function Plans() {
  const config = useConfig();
  const list = [...(config?.plans ?? [])].sort((a, b) => a.createdAt - b.createdAt);
  return (
    <div className={styles['screen']}>
      <h1 className={shell['title']}>{copy.title}</h1>
      <p className={shell['muted']}>{copy.intro}</p>
      {config && list.length === 0 && <p className={shell['muted']}>{copy.empty}</p>}
      {list.length > 0 && (
        <ul className={styles['list']}>
          {list.map((p) => (
            <li key={p.id} className={styles['item']}>
              <Link to={`/plans/${p.id}`} className={styles['itemLink']}>
                <span>{planSentence(p, 'full', planWords)}</span>
                <span className={styles['state']}>{p.active ? copy.active : copy.paused}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
      {config && (
        <Link to="/plans/new" className={styles['action']}>
          {copy.new}
        </Link>
      )}
    </div>
  );
}
