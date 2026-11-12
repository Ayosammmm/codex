import { Link, useOutletContext, useParams } from 'react-router';
import { Compass, Construction, PowerOff } from 'lucide-react';
import { findSection, getModulesState } from '@/config/modules';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { universePath } from '@/utils/universe';
import styles from './UniverseSectionPage.module.scss';

/**
 * Page d'un module ou d'un référentiel de l'univers (ex. /univers/1-taoka/personnages).
 * Contenu provisoire : les vraies pages arrivent dans les prochaines étapes.
 */
export default function UniverseSectionPage() {
  const { universe } = useOutletContext();
  const { section: path } = useParams();
  const found = findSection(getModulesState(universe), path);

  if (!found) {
    return (
      <main className={styles.main}>
        <EmptyState icon={Compass} title="Page introuvable" action={<Button as={Link} to={universePath(universe)} variant="primary">Accueil de l’univers</Button>}>
          Cette page n’existe pas dans cet univers.
        </EmptyState>
      </main>
    );
  }

  const { kind, section, enabled } = found;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <span className={styles.icon}>
          <section.icon aria-hidden />
        </span>
        <div>
          <h1 className={styles.title}>{section.label}</h1>
          <p className={styles.subtitle}>{kind === 'module' ? section.description : 'Référentiel de l’univers'}</p>
        </div>
      </header>

      {enabled ? (
        <EmptyState icon={Construction} title="Bientôt disponible">
          Cette page sera construite dans une prochaine étape de la v3.
        </EmptyState>
      ) : (
        <EmptyState
          icon={PowerOff}
          title="Module désactivé"
          action={<Button as={Link} to={universePath(universe, 'parametres')} variant="primary">Gérer les modules</Button>}
        >
          Activez ce module dans les paramètres de l’univers pour accéder à cette page. Les données existantes sont conservées.
        </EmptyState>
      )}
    </main>
  );
}
