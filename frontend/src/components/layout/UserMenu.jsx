import { useState } from 'react';
import { useNavigate } from 'react-router';
import { KeyRound, LogOut, UsersRound } from 'lucide-react';
import { useChangePassword } from '@/api/users';
import { initials, roleLabel, useAuth, usePermissions } from '@/auth/auth';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { Field, Input } from '@/components/ui/Field';
import { Menu } from '@/components/ui/Menu';
import { useToast } from '@/components/ui/Toast';
import { cx } from '@/components/ui/cx';
import styles from './UserMenu.module.scss';

/**
 * Compte connecté : mot de passe, gestion des comptes (admins), déconnexion.
 * `expanded` : affiche aussi le nom et le rôle (barre latérale) ; `placement` : ouverture du menu.
 */
export function UserMenu({ expanded = false, placement = 'bottom', align = 'end', className }) {
  const { user, logout } = useAuth();
  const { isAdmin } = usePermissions();
  const navigate = useNavigate();
  const [passwordOpen, setPasswordOpen] = useState(false);
  if (!user) return null;

  return (
    <>
      <Menu
        placement={placement}
        align={align}
        trigger={(props) => (
          <button
            type="button"
            {...props}
            className={cx(styles.trigger, expanded && styles.expanded, className)}
            aria-label={`Compte : ${user.displayName}`}
            title={expanded ? undefined : `${user.displayName} · ${roleLabel(user.role)}`}
          >
            <span className={styles.avatar} aria-hidden>
              {initials(user.displayName)}
            </span>
            {expanded && (
              <span className={styles.identity}>
                <span className={styles.name}>{user.displayName}</span>
                <span className={styles.role}>{roleLabel(user.role)}</span>
              </span>
            )}
          </button>
        )}
        items={[
          isAdmin && { label: 'Comptes utilisateurs', icon: UsersRound, onSelect: () => navigate('/utilisateurs') },
          { label: 'Changer de mot de passe', icon: KeyRound, onSelect: () => setPasswordOpen(true) },
          { separator: true },
          { label: 'Se déconnecter', icon: LogOut, onSelect: logout },
        ]}
      />
      {/* `key` : formulaire vide à chaque ouverture */}
      <PasswordDialog key={String(passwordOpen)} open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </>
  );
}

function PasswordDialog({ open, onClose }) {
  const change = useChangePassword();
  const toast = useToast();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState(null);

  const submit = (e) => {
    e.preventDefault();
    if (next.length < 8) return setError('Le nouveau mot de passe doit faire au moins 8 caractères.');
    if (next !== confirm) return setError('Les deux mots de passe ne correspondent pas.');
    setError(null);
    change.mutate(
      { currentPassword: current, newPassword: next },
      {
        onSuccess: () => {
          toast.success('Mot de passe modifié.');
          onClose();
        },
        onError: (err) => setError(err.message),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      dismissible={!change.isPending}
      size="sm"
      title="Changer de mot de passe"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={change.isPending}>Annuler</Button>
          <Button variant="primary" type="submit" form="password-form" loading={change.isPending}>Enregistrer</Button>
        </>
      }
    >
      <form id="password-form" onSubmit={submit} className={styles.form}>
        <Field label="Mot de passe actuel">
          {(props) => <Input {...props} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" autoFocus />}
        </Field>
        <Field label="Nouveau mot de passe" hint="8 caractères minimum.">
          {(props) => <Input {...props} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />}
        </Field>
        <Field label="Confirmer le nouveau mot de passe" error={error}>
          {(props) => <Input {...props} type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />}
        </Field>
      </form>
    </Dialog>
  );
}
