import { useState } from 'react';
import { Link, useNavigate, useOutletContext, useParams, useSearchParams } from 'react-router';
import { ArrowLeft, EyeOff, Pencil, Play, Trash2 } from '@/components/ui/icons';
import { useEntityList } from '@/api/queries';
import { useScene, useSceneMutations } from '@/api/roleplay';
import { useAuth, usePermissions } from '@/auth/auth';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { RpMessage } from '@/components/roleplay/RpMessage';
import { RpVisualNovel } from '@/components/roleplay/RpVisualNovel';
import { continuesMessage, formatRpDate } from '@/components/roleplay/rpMarkup';
import styles from '@/components/roleplay/Roleplay.module.scss';
import { plural, universePath } from '@/utils/universe';
import page from '../Page.module.scss';

/**
 * Lecture d'une scène (/roleplay/scenes/:sceneId), rattachement aux épisodes, modification.
 * `?vue=vn` : lecture en visual novel, en plein écran (voir RpVisualNovel).
 */
export default function RpScenePage() {
  const { universe } = useOutletContext();
  const { sceneId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const { canCreate, isAdmin } = usePermissions();
  const storiesOn = isModuleEnabled(getModulesState(universe), 'stories');
  const soundOn = isModuleEnabled(getModulesState(universe), 'sound');
  const [searchParams, setSearchParams] = useSearchParams();
  const visualNovel = searchParams.get('vue') === 'vn';
  const setVisualNovel = (on) =>
    setSearchParams((params) => {
      if (on) params.set('vue', 'vn');
      else params.delete('vue');
      return params;
    });
  const { data: scene, isPending, error } = useScene(sceneId);
  const { data: places = [] } = useEntityList('places', universe.id);
  const { data: characters = [] } = useEntityList('characters', universe.id);
  const { data: episodes = [] } = useEntityList('episodes', universe.id, { enabled: storiesOn });
  const mutations = useSceneMutations();
  const [hideHrp, setHideHrp] = useState(true);
  const [editing, setEditing] = useState(false);

  if (isPending) return <Spinner label="Chargement de la scène…" />;
  if (error) {
    return (
      <main className={page.narrow}>
        <EmptyState title="Scène introuvable" action={<Button as={Link} to={universePath(universe, 'roleplay')}>Retour au roleplay</Button>}>
          {error.message}
        </EmptyState>
      </main>
    );
  }

  const place = places.find((p) => p.id === scene.placeId);
  const visible = hideHrp ? scene.messages.filter((m) => !m.isHrp) : scene.messages;
  const charactersById = new Map(characters.map((c) => [c.id, c]));
  const placesById = new Map(places.map((p) => [p.id, p]));
  const episodeLabel = (e) => [e.stories?.[0]?.name, e.title].filter(Boolean).join(' — ');
  const episodeOptions = episodes.map((e) => ({ value: e.id, label: episodeLabel(e) }));
  const canDelete = isAdmin || scene.createdBy === user?.id;

  const save = (data, success) =>
    mutations.update.mutateAsync({ id: scene.id, data }).then(() => toast.success(success), (err) => toast.error(err.message));

  const remove = () => {
    if (!window.confirm(`Supprimer la scène « ${scene.title} » ? Ses messages restent dans le fil du lieu.`)) return;
    mutations.remove.mutate(scene.id, {
      onSuccess: () => {
        toast.success('Scène supprimée.');
        navigate(universePath(universe, 'roleplay'), { replace: true });
      },
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <main className={`${page.main} ${page.mainSpaced}`}>
      <Link to={universePath(universe, 'roleplay')} className={page.backLink}>
        <ArrowLeft aria-hidden /> Roleplay
      </Link>
      <div className={styles.sceneHeader}>
        <div className={styles.sceneHeaderText}>
          <h1 className={page.title}>{scene.title}</h1>
          <p className={styles.meta}>
            {place && (
              <Link to={universePath(universe, `roleplay/lieux/${place.id}`)}>{place.name}</Link>
            )}
            {' · '}
            {plural(scene.messageCount, 'message')}
            {scene.firstAt && ` · du ${formatRpDate(scene.firstAt)} au ${formatRpDate(scene.lastAt)}`}
          </p>
          {scene.description && <p className={page.lead}>{scene.description}</p>}
        </div>
        <Button size="sm" variant={hideHrp ? 'primary' : 'secondary'} icon={EyeOff} aria-pressed={hideHrp} onClick={() => setHideHrp((v) => !v)}>
          {hideHrp ? 'HRP masqué' : 'Masquer le HRP'}
        </Button>
        <Button size="sm" variant="primary" icon={Play} disabled={!scene.messages.some((m) => !m.isHrp)} onClick={() => setVisualNovel(true)}>
          Visual novel
        </Button>
        {canCreate && <Button size="sm" icon={Pencil} onClick={() => setEditing(true)}>Modifier</Button>}
        {canDelete && <Button size="sm" variant="danger-ghost" icon={Trash2} onClick={remove}>Supprimer</Button>}
      </div>

      {storiesOn && scene.episodeIds.length > 0 && (
        <p className={styles.sceneEpisodes}>
          <span className={styles.meta}>Épisodes :</span>
          {scene.episodeIds.map((id) => {
            const e = episodes.find((x) => x.id === id);
            if (!e) return null;
            return (
              <Link key={id} to={universePath(universe, `histoires/${e.stories?.[0]?.id}/episodes/${e.id}`)}>
                {episodeLabel(e)}
              </Link>
            );
          })}
        </p>
      )}

      <div className={styles.reading}>
        {scene.messages.length === 0 ? (
          <p className={styles.empty}>Cette scène ne contient plus aucun message.</p>
        ) : (
          visible.map((m, i) => (
            <RpMessage key={m.id} universe={universe} message={m} charactersById={charactersById} placesById={placesById} hideHrp={hideHrp} continued={continuesMessage(visible[i - 1], m) && !m.travels?.arrivals.length && !visible[i - 1].travels?.departures.length} />
          ))
        )}
      </div>

      {visualNovel && scene.messages.some((m) => !m.isHrp) && (
        <RpVisualNovel scene={scene} place={place} charactersById={charactersById} soundOn={soundOn} onClose={() => setVisualNovel(false)} />
      )}

      {editing && (
        <EditSceneDialog
          scene={scene}
          episodeOptions={storiesOn ? episodeOptions : null}
          pending={mutations.update.isPending}
          onClose={() => setEditing(false)}
          onSave={(data) => save(data, 'Scène enregistrée.').then(() => setEditing(false))}
        />
      )}
    </main>
  );
}

/** Titre, résumé et épisodes de la scène (`episodeOptions` : null si le module Histoires est inactif). */
function EditSceneDialog({ scene, episodeOptions, onClose, onSave, pending }) {
  const [title, setTitle] = useState(scene.title);
  const [description, setDescription] = useState(scene.description || '');
  const [episodeIds, setEpisodeIds] = useState(scene.episodeIds);
  return (
    <Dialog
      open
      onClose={onClose}
      size="sm"
      title="Modifier la scène"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button variant="primary" loading={pending} disabled={!title.trim()} onClick={() => onSave({ title: title.trim(), description, ...(episodeOptions && { episodeIds }) })}>
            Enregistrer
          </Button>
        </>
      }
    >
      <Field label="Titre" required>
        {(props) => <Input {...props} value={title} autoFocus maxLength={255} onChange={(e) => setTitle(e.target.value)} />}
      </Field>
      <Field label="Résumé">
        {(props) => <Input {...props} value={description} onChange={(e) => setDescription(e.target.value)} />}
      </Field>
      {episodeOptions && (
        <Field label="Épisodes" hint="La scène apparaîtra sur la fiche de ces épisodes.">
          {(props) => (
            <Combobox
              {...props}
              multiple
              options={episodeOptions}
              value={episodeIds}
              onChange={setEpisodeIds}
              placeholder="Rattacher à un épisode…"
              emptyText="Aucun épisode"
            />
          )}
        </Field>
      )}
    </Dialog>
  );
}
