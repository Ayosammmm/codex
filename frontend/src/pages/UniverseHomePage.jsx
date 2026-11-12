import { Link, useOutletContext } from 'react-router';
import { Settings } from '@/components/ui/icons';
import { useUniverses } from '@/api/queries';
import { getModulesState, getNavModules } from '@/config/modules';
import { Button } from '@/components/ui/Button';
import { RichText } from '@/components/ui/RichText';
import { Expandable } from '@/components/ui/Expandable';
import { UniverseAvatar } from '@/components/universe/UniverseAvatar';
import { UniverseBanner } from '@/components/universe/UniverseCard';
import { plainText, universePath } from '@/utils/universe';
import styles from './UniverseHomePage.module.scss';
import { usePermissions } from '@/auth/auth';

/** Accueil d'un univers : présentation et accès rapide aux modules actifs. */
export default function UniverseHomePage() {
  const { universe } = useOutletContext();
  const { isAdmin } = usePermissions();
  const { data: universes } = useUniverses();
  const stats = universes?.find((u) => u.id === universe.id)?.stats || {};
  const modules = getNavModules(getModulesState(universe));

  return (
    <main className={styles.main}>
      <section className={styles.hero}>
        <UniverseBanner universe={universe} className={styles.banner} />
        <div className={styles.identity}>
          <UniverseAvatar universe={universe} className={styles.avatar} />
          <h1 className={styles.name}>{universe.name}</h1>
          {isAdmin && (
            <Button as={Link} to={universePath(universe, 'parametres')} icon={Settings} size="sm">
              Paramètres
            </Button>
          )}
        </div>
        {plainText(universe.description) && (
          <Expandable className={styles.description}>
            <RichText html={universe.description} />
          </Expandable>
        )}
      </section>

      <h2 className={styles.sectionTitle}>Contenu de l’univers</h2>
      <ul className={styles.modules}>
        {modules.map((m) => (
          <li key={m.key}>
            <Link to={universePath(universe, m.path)} className={styles.module}>
              <span className={styles.moduleIcon}>
                <m.icon aria-hidden />
              </span>
              <p className={styles.moduleLabel}>{m.navLabel || m.label}</p>
              {stats[m.key] !== undefined && <p className={styles.moduleCount}>{stats[m.key]}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
