import { Link } from 'react-router';
import { ExternalLink } from 'lucide-react';
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { universePath } from '@/utils/universe';
import { newEpisodeKey } from './useStoryForm';
import styles from './EpisodesField.module.scss';

/**
 * Épisodes d'une histoire, dans l'ordre : [{ key, id?, title }].
 * On y règle les titres et l'ordre ; le contenu de chaque épisode se modifie sur sa propre page.
 */
export function EpisodesField({ universe, storyId, value, onChange, error }) {
  const update = (key, patch) => onChange(value.map((e) => (e.key === key ? { ...e, ...patch } : e)));
  const remove = (key) => onChange(value.filter((e) => e.key !== key));
  const move = (index, delta) => {
    const next = [...value];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    onChange(next);
  };
  const removedSaved = (e) => e.id;

  return (
    <div className={styles.root}>
      {error && <p className={styles.error} role="alert">{error}</p>}
      <ol className={styles.list}>
        {value.map((ep, i) => (
          <li key={ep.key} className={styles.row}>
            <span className={styles.number}>{i + 1}</span>
            <Input
              value={ep.title}
              onChange={(e) => update(ep.key, { title: e.target.value })}
              placeholder={`Titre de l’épisode ${i + 1}`}
              maxLength={255}
              aria-label={`Titre de l’épisode ${i + 1}`}
              aria-invalid={error && !ep.title.trim() ? true : undefined}
              className={styles.title}
            />
            <span className={styles.tools}>
              <Button variant="ghost" size="sm" iconOnly icon={ArrowUp} aria-label={`Monter l’épisode ${i + 1}`} disabled={i === 0} onClick={() => move(i, -1)} />
              <Button
                variant="ghost"
                size="sm"
                iconOnly
                icon={ArrowDown}
                aria-label={`Descendre l’épisode ${i + 1}`}
                disabled={i === value.length - 1}
                onClick={() => move(i, 1)}
              />
              {ep.id && storyId && (
                <Button
                  as={Link}
                  to={universePath(universe, `histoires/${storyId}/episodes/${ep.id}/modifier`)}
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={ExternalLink}
                  aria-label={`Modifier le contenu de l’épisode ${i + 1}`}
                  title="Modifier le contenu (récit, personnages, lieux…)"
                />
              )}
              <Button
                variant="danger-ghost"
                size="sm"
                iconOnly
                icon={Trash2}
                aria-label={`Retirer l’épisode ${i + 1}`}
                title={removedSaved(ep) ? 'Retirer (l’épisode sera supprimé à l’enregistrement)' : 'Retirer'}
                disabled={value.length === 1}
                onClick={() => remove(ep.key)}
              />
            </span>
          </li>
        ))}
      </ol>
      <Button icon={Plus} size="sm" onClick={() => onChange([...value, { key: newEpisodeKey(), id: null, title: '' }])} className={styles.add}>
        Ajouter un épisode
      </Button>
      <p className={styles.note}>
        Le récit, les personnages, les lieux et les événements de chaque épisode se renseignent sur sa page. Un épisode retiré est supprimé à l’enregistrement.
      </p>
    </div>
  );
}
