import { Link } from 'react-router';
import { checkin as copy } from '../../copy/checkin';
import shell from '../layout/Shell.module.css';
import styles from './CheckinCard.module.css';

/** Home's weekly check-in card (spec §8.1, §7.5). It never blocks anything. */
export function CheckinCard({ nudgeBackup }: { nudgeBackup: boolean }) {
  return (
    <section aria-labelledby="checkin-card-title" className={styles['card']}>
      <h2 id="checkin-card-title" className="visually-hidden">
        {copy.card.region}
      </h2>
      <p className={styles['text']}>{copy.card.text}</p>
      <div className={styles['actions']}>
        <Link to="/checkin" className={styles['action']}>
          {copy.card.action}
        </Link>
        {nudgeBackup && (
          <Link to="/settings/data" className={shell['link']}>
            {copy.backUp}
          </Link>
        )}
      </div>
    </section>
  );
}
