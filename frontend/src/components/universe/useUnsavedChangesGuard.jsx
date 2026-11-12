import { useEffect, useRef } from 'react';
import { useBlocker } from 'react-router';
import { Dialog } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

/**
 * Demande confirmation avant de quitter une page avec des modifications non enregistrées
 * (navigation interne et fermeture de l'onglet).
 * Appeler `allowNextNavigation()` juste avant une redirection voulue (ex. après enregistrement).
 */
export function useUnsavedChangesGuard(when) {
  const bypass = useRef(false);
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      when && !bypass.current && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!when) return;
    const onBeforeUnload = (e) => e.preventDefault();
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [when]);

  const dialog = (
    <Dialog
      open={blocker.state === 'blocked'}
      onClose={() => blocker.reset?.()}
      size="sm"
      title="Quitter sans enregistrer ?"
      description="Vos modifications seront perdues."
      footer={
        <>
          <Button variant="ghost" onClick={() => blocker.reset?.()}>Rester</Button>
          <Button variant="danger" onClick={() => blocker.proceed?.()}>Quitter</Button>
        </>
      }
    />
  );

  return {
    dialog,
    allowNextNavigation: () => {
      bypass.current = true;
    },
  };
}
