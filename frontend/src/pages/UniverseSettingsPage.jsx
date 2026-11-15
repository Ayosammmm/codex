import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router';
import { Copy, Download, Trash2 } from '@/components/ui/icons';
import { useSaveUniverse } from '@/api/queries';
import { Button } from '@/components/ui/Button';
import { ColorModeToggle } from '@/components/layout/ColorModeToggle';
import { useToast } from '@/components/ui/Toast';
import { FormActionBar } from '@/components/universe/FormActionBar';
import { FormSection, UniverseForm } from '@/components/universe/UniverseForm';
import { useUniverseForm } from '@/components/universe/useUniverseForm';
import { useUniverseActions } from '@/components/universe/useUniverseActions';
import { useUnsavedChangesGuard } from '@/components/universe/useUnsavedChangesGuard';
import page from './Page.module.scss';
import styles from './UniverseSettingsPage.module.scss';

export default function UniverseSettingsPage() {
  const { universe } = useOutletContext();
  const state = useUniverseForm(universe);
  const save = useSaveUniverse();
  const toast = useToast();
  const navigate = useNavigate();
  const [nameError, setNameError] = useState(null);
  const guard = useUnsavedChangesGuard(state.isDirty);
  const actions = useUniverseActions({
    afterDelete: () => {
      guard.allowNextNavigation();
      navigate('/', { replace: true });
    },
  });

  const submit = (e) => {
    e.preventDefault();
    const { values, images } = state.toSubmit();
    if (!values.name) {
      setNameError('Le nom est obligatoire.');
      document.getElementById('general')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setNameError(null);
    save.mutate(
      { id: universe.id, values, images },
      {
        onSuccess: () => toast.success('Paramètres enregistrés.'),
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <main className={page.main}>
      <h1 className={page.title}>Paramètres</h1>
      <p className={page.lead}>Identité, apparence et modules de « {universe.name} ».</p>

      <form onSubmit={submit} noValidate>
        <UniverseForm
          universe={universe}
          state={state}
          nameError={nameError}
          beforeAppearanceToc={[{ id: 'affichage', label: 'Affichage global' }]}
          extraToc={[
            { id: 'donnees', label: 'Données' },
            { id: 'suppression', label: 'Suppression' },
          ]}
          beforeAppearance={
            <FormSection id="affichage" title="Affichage global">
              <ActionRow
                title="Mode des univers"
                text="Clair, sombre, ou selon le réglage du système. Indépendant du mode de l’accueil de l’Almanach."
                action={<ColorModeToggle showLabels scope="universe" />}
              />
            </FormSection>
          }
          extraSections={
            <>
              <FormSection id="donnees" title="Données">
                <ActionRow
                  title="Exporter"
                  text="Télécharge une archive .zip contenant l’univers, ses entités, leurs liens et toutes leurs images. Il peut être réimporté depuis l’accueil."
                  action={<Button icon={Download} onClick={() => actions.export(universe)}>Exporter</Button>}
                />
                <ActionRow
                  title="Dupliquer"
                  text="Crée un nouvel univers identique, pour expérimenter sans toucher à l’original."
                  action={<Button icon={Copy} onClick={() => actions.duplicate(universe)}>Dupliquer</Button>}
                />
              </FormSection>
              <section id="suppression" aria-labelledby="danger-title" className={styles.danger}>
                <ActionRow
                  title={<span id="danger-title">Supprimer l’univers</span>}
                  text="Supprime définitivement l’univers et tout son contenu."
                  action={<Button variant="danger" icon={Trash2} onClick={() => actions.remove(universe)}>Supprimer</Button>}
                />
              </section>
            </>
          }
        />

        <FormActionBar visible={state.isDirty || save.isPending} message="Modifications non enregistrées">
          <Button variant="ghost" onClick={state.reset} disabled={save.isPending}>Annuler</Button>
          <Button type="submit" variant="primary" loading={save.isPending}>Enregistrer</Button>
        </FormActionBar>
      </form>

      {actions.dialogs}
      {guard.dialog}
    </main>
  );
}

function ActionRow({ title, text, action }) {
  return (
    <div className={styles.actionRow}>
      <div>
        <p className={styles.actionTitle}>{title}</p>
        <p className={styles.actionText}>{text}</p>
      </div>
      {action}
    </div>
  );
}
