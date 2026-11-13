import { about, evidence } from '../../copy/about';
import { basisLabels } from '../../copy/lists';
import { BASIS_SOURCES, CHECKIN_ATTRIBUTION } from '../../domain/defaults';
import styles from '../layout/Shell.module.css';

export function About() {
  return (
    <>
      <h1 className={styles['title']}>{about.title}</h1>
      <p>{about.intro}</p>
      <p className={styles['note']}>{about.notMedicalAdvice}</p>
      <h2 id="brain-space" className={styles['subtitle']}>
        {about.brainSpaceTitle}
      </h2>
      <p>{about.brainSpace}</p>
      <h2 className={styles['subtitle']}>{about.evidenceTitle}</h2>
      <p className={styles['muted']}>{about.evidenceIntro}</p>
      <ul className={styles['evidence']}>
        {evidence.map((item) => (
          <li key={item.id} className={styles['evidenceItem']}>
            <p>{item.claim}</p>
            {item.sources.map((source) => (
              <p key={source.text} className={styles['muted']}>
                {source.href ? (
                  <a href={source.href} className={styles['link']}>
                    {source.text}
                  </a>
                ) : (
                  source.text
                )}
              </p>
            ))}
            <p className={styles['muted']}>
              {about.caveatLabel}: {item.caveat}
            </p>
          </li>
        ))}
      </ul>
      <h2 className={styles['subtitle']}>{about.basisTitle}</h2>
      <p className={styles['muted']}>{about.basisIntro}</p>
      <ul className={styles['evidence']}>
        {Object.entries(BASIS_SOURCES).map(([basis, source]) => (
          <li key={basis} className={styles['evidenceItem']}>
            <p>{basisLabels[basis as keyof typeof basisLabels]}</p>
            <p className={styles['muted']}>{source}</p>
          </li>
        ))}
      </ul>
      <h2 className={styles['subtitle']}>{about.checkinTitle}</h2>
      <p className={styles['muted']}>{CHECKIN_ATTRIBUTION}</p>
      <p className={styles['muted']}>{about.version(__APP_VERSION__, __BUILD_SHA__)}</p>
    </>
  );
}
