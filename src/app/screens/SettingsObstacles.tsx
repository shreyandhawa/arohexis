import { obstaclesEditor as copy } from '../../copy/lists';
import { addObstacle, moveObstacle, renameObstacle, setObstacleEnabled } from '../actions/lists';
import { useData } from '../data/DataProvider';
import { useConfig } from '../hooks/useConfig';
import shell from '../layout/Shell.module.css';
import styles from './SettingsParts.module.css';
import { ListEditor } from './ListEditor';

export function SettingsObstacles() {
  const deps = useData();
  const config = useConfig();
  const items = [...(config?.obstacles ?? [])].sort((a, b) => a.order - b.order);
  return (
    <div className={styles['screen']}>
      <h1 className={shell['title']}>{copy.title}</h1>
      <p className={shell['muted']}>{copy.intro}</p>
      {config && (
        <ListEditor
          items={items}
          enabledLabel={copy.enabled}
          addLabel={copy.add}
          onRename={(id, label) => renameObstacle(deps, id, label)}
          onEnabled={(id, on) => setObstacleEnabled(deps, id, on)}
          onMove={(id, by) => moveObstacle(deps, id, by)}
          onAdd={(label) => addObstacle(deps, label)}
        />
      )}
    </div>
  );
}
