import { useState } from 'react';
import { useNavigate } from 'react-router';
import { universesApi } from '@/api/universes';
import { useToast } from '@/components/ui/Toast';
import { DeleteUniverseDialog, DuplicateUniverseDialog } from './UniverseDialogs';
import { universePath } from '@/utils/universe';

/**
 * Actions sur un univers partagées entre l'accueil et les paramètres :
 * dupliquer, exporter, supprimer. Rendre `dialogs` dans la page.
 */
export function useUniverseActions({ afterDelete } = {}) {
  const toast = useToast();
  const navigate = useNavigate();
  const [duplicating, setDuplicating] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const exportUniverse = (universe) => {
    universesApi
      .exportFile(universe.id)
      .then(() => toast.success(`« ${universe.name} » a été exporté.`))
      .catch((err) => toast.error(`Export impossible : ${err.message}`));
  };

  const dialogs = (
    <>
      {/* `key` : état neuf (nom proposé, erreurs) à chaque ouverture */}
      <DuplicateUniverseDialog
        key={`dup-${duplicating?.id ?? ''}`}
        universe={duplicating}
        onClose={() => setDuplicating(null)}
        onDone={(copy) => {
          setDuplicating(null);
          toast.success(`« ${copy.name} » a été créé.`);
          navigate(universePath(copy));
        }}
      />
      <DeleteUniverseDialog
        key={`del-${deleting?.id ?? ''}`}
        universe={deleting}
        onClose={() => setDeleting(null)}
        onDone={(universe) => {
          setDeleting(null);
          toast.success(`« ${universe.name} » a été supprimé.`);
          afterDelete?.(universe);
        }}
      />
    </>
  );

  return {
    duplicate: setDuplicating,
    remove: setDeleting,
    export: exportUniverse,
    dialogs,
  };
}
