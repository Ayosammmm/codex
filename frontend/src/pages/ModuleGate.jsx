import { Link, useOutletContext } from 'react-router';
import { PowerOff } from 'lucide-react';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Feedback';
import { universePath } from '@/utils/universe';
import page from './Page.module.scss';

/**
 * Affiche une page seulement si son module est actif dans l'univers.
 * `module` : clé d'un module, ou liste de clés (il suffit qu'une soit active).
 */
export function ModuleGate({ module, children }) {
  const { universe } = useOutletContext();
  const state = getModulesState(universe);
  const keys = Array.isArray(module) ? module : [module];
  if (keys.some((key) => isModuleEnabled(state, key))) return children;
  return (
    <main className={page.narrow}>
      <EmptyState
        icon={PowerOff}
        title="Module désactivé"
        action={<Button as={Link} to={universePath(universe, 'parametres')} variant="primary">Gérer les modules</Button>}
      >
        Activez ce module dans les paramètres de l’univers pour accéder à cette page. Les données existantes sont conservées.
      </EmptyState>
    </main>
  );
}
