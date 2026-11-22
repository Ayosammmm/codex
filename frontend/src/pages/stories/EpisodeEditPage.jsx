import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { ArrowLeft, Trash2 } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { useDeleteEntity, useSaveEntity } from '@/api/queries';
import { useEpisodeScenes, useRoleplayOverview, useSetEpisodeScenes } from '@/api/roleplay';
import { sortedEpisodes } from '@/config/stories';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';
import { AppearanceSection } from '@/components/entity/AppearanceSection';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { useImagePreview } from '@/components/entity/useImagePreview';
import form from '@/components/entity/EntityForm.module.scss';
import { CastField } from '@/components/stories/CastField';
import { useEpisodeForm } from '@/components/stories/useEpisodeForm';
import { EpisodeNarrativeEditor } from '@/components/stories/EpisodeNarrative';
import { FormActionBar } from '@/components/universe/FormActionBar';
import { FormSection } from '@/components/universe/UniverseForm';
import { useUnsavedChangesGuard } from '@/components/universe/useUnsavedChangesGuard';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { EpisodeLoader } from './EpisodeLoader';
import { useNarrativeReferences } from './useNarrativeReferences';
import { usePermissions } from '@/auth/auth';
import { Forbidden } from '@/auth/RequireAuth';

/** Création (/histoires/:storyId/episodes/nouveau) et édition (…/episodes/:episodeId/modifier) d'un épisode. */
export default function EpisodeEditPage() {
  const { episodeId } = useParams();
  const { canEdit } = usePermissions();
  return (
    <EpisodeLoader withEpisode={Boolean(episodeId)}>
      {({ story, episode, universe }) =>
        // Les épisodes suivent les droits de leur histoire
        canEdit('story', story.id) ? (
          <EpisodeEditor key={episode?.id ?? 'new'} universe={universe} story={story} episode={episode} />
        ) : (
          <Forbidden backTo={universePath(universe, `histoires/${story.id}`)} />
        )
      }
    </EpisodeLoader>
  );
}

function EpisodeEditor({ universe, story, episode }) {
  const isNew = !episode;
  const storyPath = universePath(universe, `histoires/${story.id}`);
  const episodePath = (id) => `${storyPath}/episodes/${id}`;
  const navigate = useNavigate();
  const toast = useToast();
  const state = useEpisodeForm(episode);
  const { form: f, update } = state;
  const { options, characters, modules } = useNarrativeReferences(universe);
  const save = useSaveEntity('episodes');
  const remove = useDeleteEntity('episodes');
  const [errors, setErrors] = useState({});
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Scènes de roleplay liées : enregistrées avec le formulaire (`sceneDraft` : null tant qu'on n'y touche pas)
  const { data: linkedScenes = [] } = useEpisodeScenes(episode?.id, { enabled: modules.roleplay });
  const { data: roleplay } = useRoleplayOverview(universe.id, { enabled: modules.roleplay });
  const setScenes = useSetEpisodeScenes();
  const [sceneDraft, setSceneDraft] = useState(null);
  const savedSceneIds = linkedScenes.map((s) => s.id);
  const sceneIds = sceneDraft ?? savedSceneIds;
  const scenesDirty = sceneDraft !== null && [...sceneDraft].sort().join() !== [...savedSceneIds].sort().join();
  const isDirty = state.isDirty || scenesDirty;
  const pending = save.isPending || setScenes.isPending;
  const guard = useUnsavedChangesGuard(isDirty && !pending);

  const episodes = sortedEpisodes(story);
  const index = episode ? episodes.findIndex((e) => e.id === episode.id) : episodes.length;
  // Une histoire garde au moins un épisode (notes Obsidian)
  const isLastEpisode = !isNew && episodes.length <= 1;
  // Fond suivi en direct : celui de l'épisode, sinon celui de l'histoire
  const backgroundImage = useImagePreview(episode?.background, state.images.background);
  const backdrop =
    f.backgroundMode === 'image' && backgroundImage
      ? { background: backgroundImage }
      : f.backgroundMode === 'color'
        ? { backgroundColor: f.backgroundColor }
        : { background: uploadUrl(story.background), backgroundColor: story.backgroundColor };
  const charactersById = useMemo(() => new Map((characters.data || []).map((c) => [c.id, c])), [characters.data]);
  const placeNames = new Map(options.places.map((o) => [o.value, o.label]));
  // Personnages de l'épisode : proposés en premier pour écrire le récit
  const castIds = useMemo(() => f.characters.map((c) => c.characterId), [f.characters]);

  const submit = (e) => {
    e.preventDefault();
    const found = state.validate();
    setErrors(found);
    if (Object.keys(found).length) return;
    const { values, images } = state.toSubmit({ universeId: universe.id, storyId: isNew ? story.id : null, modules });
    save.mutate(
      { id: episode?.id, values, images },
      {
        onSuccess: async (saved) => {
          if (scenesDirty) {
            try {
              await setScenes.mutateAsync({ episodeId: saved.id, sceneIds: sceneDraft });
              setSceneDraft(null);
            } catch (err) {
              toast.error(`Scènes de roleplay non enregistrées : ${err.message}`);
            }
          }
          toast.success(isNew ? `« ${saved.title} » a été ajouté à l’histoire.` : 'Épisode enregistré.');
          if (isNew) {
            guard.allowNextNavigation();
            navigate(`${episodePath(saved.id)}/modifier`, { replace: true });
          }
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const onDelete = () =>
    remove.mutate(episode.id, {
      onSuccess: () => {
        toast.success(`« ${episode.title} » a été supprimé.`);
        guard.allowNextNavigation();
        navigate(storyPath, { replace: true });
      },
      onError: (err) => toast.error(err.message),
    });

  return (
    <EntityThemeZone universe={universe} colors={story.colors} background={backdrop.background} backgroundColor={backdrop.backgroundColor}>
      <main className={page.main}>
        <Link to={isNew ? storyPath : episodePath(episode.id)} className={page.backLink}>
          <ArrowLeft aria-hidden /> {isNew ? story.name : 'Retour à l’épisode'}
        </Link>
        <h1 className={page.title}>{isNew ? 'Nouvel épisode' : episode.title}</h1>
        <p className={page.lead}>
          Épisode {index + 1} de « {story.name} »
        </p>

        <form onSubmit={submit} noValidate>
          <div className={form.sections}>
            <FormSection id="episode" title="Épisode">
              <Field label="Titre" required error={errors.title}>
                {(props) => <Input {...props} value={f.title} onChange={(e) => update({ title: e.target.value })} maxLength={255} placeholder="Ex. L’embuscade du col" />}
              </Field>
            </FormSection>

            {/* Récit en messages : enregistré à l'envoi de chaque message, pas avec le formulaire */}
            {isNew ? (
              <FormSection id="recit" title="Récit" description="Le récit s’écrit en messages, au nom des personnages : ajoutez d’abord l’épisode pour pouvoir l’écrire." />
            ) : (
              <FormSection
                id="recit"
                title="Récit"
                description="L’épisode raconté en messages, au nom des personnages ou en narration. Il se lit sur la fiche, en fil ou en visual novel. Chaque message est enregistré dès son envoi."
              >
                <EpisodeNarrativeEditor universe={universe} episode={episode} castIds={castIds} soundOn={modules.sound} />
              </FormSection>
            )}

            <FormSection id="personnages" title="Personnages" description="Qui joue un rôle principal, secondaire, ou assiste simplement à la scène.">
              <CastField value={f.characters} onChange={(characters) => update({ characters })} characterOptions={options.characters} charactersById={charactersById} />
            </FormSection>

            <FormSection id="lieux" title={modules.events ? 'Lieux et événements' : 'Lieux'} description="Où se déroule l’épisode, et les moments clés qu’il contient.">
              <Field label="Lieux concernés">
                {(props) => <Combobox {...props} multiple options={options.places} value={f.placeIds} onChange={(placeIds) => update({ placeIds })} placeholder="Ajouter un lieu…" />}
              </Field>
              {modules.events && (
                <Field
                  label="Événements"
                  hint={
                    <>
                      Un événement peut apparaître dans plusieurs épisodes, même d’histoires différentes.{' '}
                      <Link to={universePath(universe, 'evenements/nouveau')} className={form.hintLink}>
                        Créer un événement
                      </Link>
                    </>
                  }
                >
                  {(props) => <Combobox {...props} multiple options={options.events} value={f.eventIds} onChange={(eventIds) => update({ eventIds })} placeholder="Ajouter un événement…" />}
                </Field>
              )}
            </FormSection>

            {modules.roleplay && (
              <FormSection id="roleplay" title="Scènes de roleplay" description="Les scènes de roleplay qui racontent cet épisode : elles apparaissent sur sa fiche.">
                <Field
                  label="Scènes liées"
                  hint={roleplay && !roleplay.scenes.length ? 'Aucune scène dans cet univers : créez-en depuis un fil de roleplay (bouton « Scènes »).' : undefined}
                >
                  {(props) => (
                    <Combobox
                      {...props}
                      multiple
                      options={(roleplay?.scenes || []).map((s) => ({ value: s.id, label: s.title, description: placeNames.get(s.placeId) }))}
                      value={sceneIds}
                      onChange={setSceneDraft}
                      placeholder="Lier une scène…"
                      emptyText="Aucune scène"
                    />
                  )}
                </Field>
              </FormSection>
            )}

            <AppearanceSection
              state={state}
              savedBackground={episode?.background}
              showColors={false}
              title="Fond"
              description="L’arrière-plan de la page de l’épisode. Sans fond, l’épisode prend celui de son histoire."
            />

            {!isNew && (
              <section aria-labelledby="danger-title" className={form.danger}>
                <div>
                  <p id="danger-title" className={form.dangerTitle}>Supprimer l’épisode</p>
                  <p className={form.note}>
                    {isLastEpisode
                      ? 'C’est le seul épisode de l’histoire : une histoire en garde au moins un. Ajoutez-en un autre avant de le supprimer.'
                      : 'Les personnages, lieux et événements liés sont conservés.'}
                  </p>
                </div>
                <Button variant="danger" icon={Trash2} disabled={isLastEpisode} onClick={() => setConfirmDelete(true)}>
                  Supprimer
                </Button>
              </section>
            )}
          </div>

          <FormActionBar visible={isNew || isDirty || pending} message={!isNew && 'Modifications non enregistrées'}>
            <Button
              variant="ghost"
              onClick={() => {
                if (isNew) return navigate(storyPath);
                state.reset();
                setSceneDraft(null);
              }}
              disabled={pending}
            >
              Annuler
            </Button>
            <Button type="submit" variant="primary" loading={pending}>
              {isNew ? 'Ajouter l’épisode' : 'Enregistrer'}
            </Button>
          </FormActionBar>
        </form>

        {!isNew && (
          <Dialog
            open={confirmDelete}
            onClose={() => setConfirmDelete(false)}
            dismissible={!remove.isPending}
            size="sm"
            title="Supprimer l’épisode ?"
            description={`« ${episode.title} » sera retiré de « ${story.name} » et supprimé définitivement.`}
            footer={
              <>
                <Button variant="ghost" onClick={() => setConfirmDelete(false)} disabled={remove.isPending}>Annuler</Button>
                <Button variant="danger" onClick={onDelete} loading={remove.isPending}>Supprimer définitivement</Button>
              </>
            }
          />
        )}
        {guard.dialog}
      </main>
    </EntityThemeZone>
  );
}
