import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { useToast } from '@/components/ui/Toast';
import { linkUniverse } from '@/utils/autoLink';

/**
 * Bouton « Créer les liens » des paramètres de l'univers : dans toutes les fiches existantes, les noms d'entités
 * cités dans les grands textes riches deviennent des liens vers leur fiche (voir utils/autoLink.js).
 * Confirmation d'abord : les textes sont réécrits (seuls les champs de texte riche sont enregistrés).
 */
export function AutoLinkAction({ universe }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [confirming, setConfirming] = useState(false);
  const [progress, setProgress] = useState(null); // { done, total } pendant le traitement

  const run = async () => {
    setConfirming(false);
    setProgress({ done: 0, total: 0 });
    try {
      const { fields, entities } = await linkUniverse(queryClient, universe.id, { onProgress: setProgress });
      // Les fiches et listes affichées reprennent les textes enregistrés
      await queryClient.invalidateQueries({ queryKey: ['entities'] });
      toast.success(fields ? `Liens ajoutés dans ${entities} fiche${entities > 1 ? 's' : ''} (${fields} texte${fields > 1 ? 's' : ''}).` : 'Aucun nouveau lien à créer.');
    } catch (err) {
      toast.error(`Liens automatiques : ${err.message}`);
    } finally {
      setProgress(null);
    }
  };

  const label = progress ? (progress.total ? `${progress.done} / ${progress.total} fiches…` : 'Préparation…') : 'Créer les liens';
  return (
    <>
      <Button icon={Link} loading={Boolean(progress)} onClick={() => setConfirming(true)}>
        {label}
      </Button>
      <Dialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Créer les liens vers les fiches ?"
        description="Dans toutes les fiches de l’univers, chaque nom de personnage, lieu, groupe, espèce, créature, histoire ou événement cité dans les grands textes (description, histoire, notes…) deviendra un lien vers sa fiche. Les liens existants sont conservés ; vous pourrez retirer un lien dans l’éditeur."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)}>Annuler</Button>
            <Button variant="primary" icon={Link} onClick={run}>Créer les liens</Button>
          </>
        }
      />
    </>
  );
}
