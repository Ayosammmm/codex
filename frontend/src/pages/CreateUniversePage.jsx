import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { ArrowLeft } from '@/components/ui/icons';
import { useSaveUniverse } from '@/api/queries';
import { AppHeader } from '@/components/layout/AppHeader';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { FormActionBar } from '@/components/universe/FormActionBar';
import { FormSection, UniverseForm } from '@/components/universe/UniverseForm';
import { Switch } from '@/components/ui/Switch';
import styles from './CreateUniversePage.module.scss';
import { useUniverseForm } from '@/components/universe/useUniverseForm';
import { useUnsavedChangesGuard } from '@/components/universe/useUnsavedChangesGuard';
import { universePath } from '@/utils/universe';
import page from './Page.module.scss';

export default function CreateUniversePage() {
  const state = useUniverseForm(null);
  const save = useSaveUniverse();
  const navigate = useNavigate();
  const toast = useToast();
  const [nameError, setNameError] = useState(null);
  // Valeurs de départ (genres, statuts, rangs...) : proposées par défaut
  const [withDefaults, setWithDefaults] = useState(true);
  const guard = useUnsavedChangesGuard(state.isDirty && !save.isSuccess);

  const submit = (e) => {
    e.preventDefault();
    const { values, images } = state.toSubmit();
    if (!values.name) {
      setNameError('Donnez un nom à votre univers.');
      document.getElementById('general')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setNameError(null);
    save.mutate(
      { values: { ...values, withDefaults }, images },
      {
        onSuccess: (universe) => {
          toast.success(`« ${universe.name} » est prêt.`);
          guard.allowNextNavigation();
          navigate(universePath(universe));
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  return (
    <>
      <AppHeader />
      <main className={page.main}>
        <Link to="/" className={page.backLink}>
          <ArrowLeft aria-hidden /> Tous les univers
        </Link>
        <h1 className={page.title}>Nouvel univers</h1>
        <p className={page.lead}>Tout est modifiable plus tard dans les paramètres de l’univers.</p>

        <form onSubmit={submit} noValidate>
          <UniverseForm
            universe={null}
            state={state}
            nameError={nameError}
            extraSections={<DefaultsSection checked={withDefaults} onChange={setWithDefaults} />}
          />
          <FormActionBar>
            <Button as={Link} to="/" variant="ghost">Annuler</Button>
            <Button type="submit" variant="primary" loading={save.isPending}>Créer l’univers</Button>
          </FormActionBar>
        </form>
      </main>
      {guard.dialog}
    </>
  );
}

const DEFAULTS = [
  { label: 'Genres', values: 'Homme, Femme, Non-binaire, Autre' },
  { label: 'Statuts', values: 'Vivant, Disparu, Décédé, Inconnu' },
  { label: 'Alignements', values: 'les 9 classiques, de Loyal bon à Chaotique mauvais' },
  { label: 'Rangs de puissance', values: 'S, A, B, C, D' },
  { label: 'Types de lieux', values: 'Monde, Continent, Pays, Région, Ville, Village, Bâtiment, Lieu naturel' },
  { label: 'Types de groupes', values: 'Famille, Clan, Guilde, Organisation, Armée, Ordre, Bande' },
];

/** Option « valeurs de départ » : les référentiels de l'univers sont pré-remplis (modifiables ensuite). */
function DefaultsSection({ checked, onChange }) {
  return (
    <FormSection id="depart" title="Pour bien démarrer" description="Pré-remplit les référentiels de l’univers. Vous pourrez tout renommer, réordonner ou supprimer ensuite.">
      <div className={styles.toggle}>
        <label htmlFor="with-defaults" className={styles.toggleLabel}>
          Ajouter les valeurs par défaut
        </label>
        <Switch id="with-defaults" checked={checked} onChange={onChange} />
      </div>
      {checked && (
        <dl className={styles.defaults}>
          {DEFAULTS.map((d) => (
            <div key={d.label}>
              <dt>{d.label}</dt>
              <dd>{d.values}</dd>
            </div>
          ))}
        </dl>
      )}
    </FormSection>
  );
}
