import { Link } from 'react-router';
import { ArrowLeft, Pencil } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import { useEntityList } from '@/api/queries';
import { Button } from '@/components/ui/Button';
import { EntityThemeZone } from '@/components/entity/EntityThemeZone';
import { entityAncestors } from '@/components/entity/tree';
import { SpecieSheet } from '@/components/species/SpecieSheet';
import { universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { SpecieLoader } from './SpecieLoader';
import { usePermissions } from '@/auth/auth';

/** Fiche d'une espèce (/especes/:specieId), en lecture seule. */
export default function SpeciePage() {
  return <SpecieLoader>{(specie, universe) => <SpecieView key={specie.id} universe={universe} specie={specie} />}</SpecieLoader>;
}

function SpecieView({ universe, specie }) {
  const { canEdit } = usePermissions();
  // Liste de l'univers : lignée et sous-espèces (illustrations, compteurs)
  const { data: species = [] } = useEntityList('species', universe.id);
  const subspecies = species.filter((s) => s.parentId === specie.id).sort((a, b) => a.name.localeCompare(b.name, 'fr'));

  return (
    <EntityThemeZone tinted universe={universe} colors={specie.colors} background={uploadUrl(specie.background)} backgroundColor={specie.backgroundColor}>
      <main className={`${page.main} ${page.mainSpaced}`}>
        <Link to={universePath(universe, 'especes')} className={page.backLink}>
          <ArrowLeft aria-hidden /> Espèces
        </Link>
        <div className={page.belowBack}>
          <SpecieSheet
            universe={universe}
            specie={specie}
            ancestors={entityAncestors(specie, species)}
            subspecies={subspecies}
            actions={
              canEdit('specie', specie.id) && (
                <Button as={Link} to={universePath(universe, `especes/${specie.id}/modifier`)} variant="primary" icon={Pencil}>
                  Modifier
                </Button>
              )
            }
          />
        </div>
      </main>
    </EntityThemeZone>
  );
}
