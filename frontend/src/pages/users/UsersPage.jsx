import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, CircleAlert, Pencil, Trash2, UserPlus, UsersRound } from '@/components/ui/icons';
import { useCreateUser, useDeleteUser, useUpdateUser, useUsers } from '@/api/users';
import { ROLES, canGrantRole, canManageUser, initials, roleLabel, useAuth } from '@/auth/auth';
import { AppHeader } from '@/components/layout/AppHeader';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { Field, Input } from '@/components/ui/Field';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import page from '../Page.module.scss';
import styles from './UsersPage.module.scss';

const ROLE_COLORS = { superadmin: '#b45309', admin: '#7c3aed', editor: '#0e7490', reader: '#64748b' };

/** Comptes utilisateurs (/utilisateurs, admins) : pas d'inscription libre, les admins créent les comptes. */
export default function UsersPage() {
  const { user: me } = useAuth();
  const users = useUsers();
  const remove = useDeleteUser();
  const toast = useToast();
  const [editing, setEditing] = useState(null); // compte, ou 'new'
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    document.title = 'Comptes · Almanach';
    return () => {
      document.title = 'Almanach';
    };
  }, []);

  const list = users.data || [];
  const counts = Object.fromEntries(ROLES.map((r) => [r.value, list.filter((u) => u.role === r.value).length]));

  const confirmDelete = () =>
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(`Le compte « ${deleting.displayName} » a été supprimé.`);
        setDeleting(null);
      },
      onError: (err) => toast.error(err.message),
    });

  return (
    <>
      <AppHeader />
      <main className={`${page.main} ${page.mainSpaced}`}>
        <Link to="/" className={page.backLink}>
          <ArrowLeft aria-hidden /> Univers
        </Link>
        <div className={styles.top}>
          <div>
            <h1 className={page.title}>Comptes utilisateurs</h1>
            <p className={styles.lead}>Les comptes sont créés ici : il n’y a pas d’inscription libre. Les rôles valent pour tous les univers.</p>
          </div>
          <Button variant="primary" icon={UserPlus} onClick={() => setEditing('new')}>
            Nouveau compte
          </Button>
        </div>

        <ul className={styles.roles}>
          {ROLES.slice()
            .reverse()
            .map((r) => (
              <li key={r.value} className={styles.roleCard} style={{ '--role': ROLE_COLORS[r.value] }}>
                <span className={styles.roleCount}>{counts[r.value]}</span>
                <span className={styles.roleName}>{r.label}</span>
                <span className={styles.roleDescription}>{r.description}</span>
              </li>
            ))}
        </ul>

        {users.isPending ? (
          <Spinner label="Chargement des comptes…" />
        ) : users.error ? (
          <EmptyState icon={CircleAlert} title="Impossible de charger les comptes" action={<Button onClick={() => users.refetch()}>Réessayer</Button>}>
            {users.error.message}
          </EmptyState>
        ) : list.length === 0 ? (
          <EmptyState icon={UsersRound} title="Aucun compte" />
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Compte</th>
                  <th scope="col">Rôle</th>
                  <th scope="col">Créé le</th>
                  <th scope="col">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((u) => {
                  const self = u.id === me.id;
                  const manageable = self || canManageUser(me, u);
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className={styles.account}>
                          <span className={styles.avatar} aria-hidden>
                            {initials(u.displayName)}
                          </span>
                          <span className={styles.identity}>
                            <span className={styles.name}>
                              {u.displayName}
                              {self && <span className={styles.you}> (vous)</span>}
                            </span>
                            <span className={styles.username}>@{u.username}</span>
                          </span>
                        </span>
                      </td>
                      <td>
                        <Badge color={ROLE_COLORS[u.role]}>{roleLabel(u.role)}</Badge>
                      </td>
                      <td className={styles.date}>{new Date(u.createdAt).toLocaleDateString('fr-FR')}</td>
                      <td className={styles.actions}>
                        {manageable && (
                          <Button variant="ghost" size="sm" iconOnly icon={Pencil} aria-label={`Modifier « ${u.displayName} »`} onClick={() => setEditing(u)} />
                        )}
                        {manageable && !self && (
                          <Button variant="danger-ghost" size="sm" iconOnly icon={Trash2} aria-label={`Supprimer « ${u.displayName} »`} onClick={() => setDeleting(u)} />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {editing && <UserDialog key={editing === 'new' ? 'new' : editing.id} account={editing === 'new' ? null : editing} me={me} onClose={() => setEditing(null)} />}

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        dismissible={!remove.isPending}
        size="sm"
        title={deleting ? `Supprimer le compte « ${deleting.displayName} » ?` : ''}
        description="La personne ne pourra plus se connecter. Les entités auxquelles elle était liée sont conservées."
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={remove.isPending}>Annuler</Button>
            <Button variant="danger" onClick={confirmDelete} loading={remove.isPending}>Supprimer</Button>
          </>
        }
      />
    </>
  );
}

/** Création ou modification d'un compte (nom, rôle, nouveau mot de passe). */
function UserDialog({ account, me, onClose }) {
  const isNew = !account;
  const self = account?.id === me.id;
  const create = useCreateUser();
  const update = useUpdateUser();
  const toast = useToast();
  const pending = create.isPending || update.isPending;
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState(account?.displayName || '');
  const [role, setRole] = useState(account?.role || 'reader');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  // Rôles attribuables (un admin ne crée pas d'admin) ; le rôle actuel reste affiché
  const roleOptions = ROLES.filter((r) => canGrantRole(me, r.value) || r.value === account?.role).map((r) => ({ value: r.value, label: r.label }));
  const roleHint = self ? 'Vous ne pouvez pas changer votre propre rôle.' : ROLES.find((r) => r.value === role)?.description;

  const submit = (e) => {
    e.preventDefault();
    const found = {};
    if (isNew && !/^[a-z0-9._-]{3,64}$/.test(username.trim().toLowerCase())) found.username = '3 à 64 caractères : lettres minuscules, chiffres, . _ -';
    if (!displayName.trim()) found.displayName = 'Le nom affiché est requis.';
    if ((isNew || password) && password.length < 8) found.password = '8 caractères minimum.';
    setErrors(found);
    if (Object.keys(found).length) return;

    const onError = (err) => setErrors({ form: err.message });
    if (isNew) {
      create.mutate(
        { username: username.trim().toLowerCase(), displayName: displayName.trim(), role, password },
        {
          onSuccess: (u) => {
            toast.success(`Compte « ${u.displayName} » créé. Transmettez-lui son identifiant et son mot de passe.`);
            onClose();
          },
          onError,
        },
      );
    } else {
      const data = { displayName: displayName.trim() };
      if (!self && role !== account.role) data.role = role;
      if (password) data.password = password;
      update.mutate(
        { id: account.id, data },
        {
          onSuccess: () => {
            toast.success(password ? 'Compte enregistré, mot de passe réinitialisé.' : 'Compte enregistré.');
            onClose();
          },
          onError,
        },
      );
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      dismissible={!pending}
      title={isNew ? 'Nouveau compte' : `Modifier « ${account.displayName} »`}
      description={isNew ? undefined : `Identifiant : @${account.username}`}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={pending}>Annuler</Button>
          <Button variant="primary" type="submit" form="user-form" loading={pending}>
            {isNew ? 'Créer le compte' : 'Enregistrer'}
          </Button>
        </>
      }
    >
      <form id="user-form" onSubmit={submit} className={styles.form} noValidate>
        {isNew && (
          <Field label="Identifiant" required hint="Sert à se connecter. Lettres minuscules, chiffres, . _ -" error={errors.username}>
            {(props) => <Input {...props} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} autoFocus />}
          </Field>
        )}
        <Field label="Nom affiché" required error={errors.displayName}>
          {(props) => <Input {...props} value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={120} autoFocus={!isNew} />}
        </Field>
        <Field label="Rôle" hint={roleHint}>
          {(props) => <Select {...props} options={roleOptions} value={role} onChange={setRole} disabled={self} />}
        </Field>
        <Field
          label={isNew ? 'Mot de passe' : 'Nouveau mot de passe'}
          required={isNew}
          hint={isNew ? '8 caractères minimum. La personne pourra le changer depuis son menu.' : 'Laisser vide pour ne pas le changer.'}
          error={errors.password || errors.form}
        >
          {(props) => <Input {...props} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />}
        </Field>
      </form>
    </Dialog>
  );
}
