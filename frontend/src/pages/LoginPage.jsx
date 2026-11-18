import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router';
import { LogIn } from '@/components/ui/icons';
import { useAuth } from '@/auth/auth';
import { BrandMark } from '@/components/layout/AppHeader';
import { ColorModeToggle } from '@/components/layout/ColorModeToggle';
import { Button } from '@/components/ui/Button';
import { Field, Input } from '@/components/ui/Field';
import styles from './LoginPage.module.scss';

/** Connexion (/connexion). Pas d'inscription : les comptes sont créés par un admin. */
export default function LoginPage() {
  const { status, login } = useAuth();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [pending, setPending] = useState(false);

  // Retour vers la page demandée (chemin interne uniquement)
  const retour = params.get('retour');
  const target = retour?.startsWith('/') && !retour.startsWith('//') ? retour : '/';

  useEffect(() => {
    document.title = 'Connexion · Codex';
    return () => {
      document.title = 'Codex';
    };
  }, []);

  if (status === 'authenticated') return <Navigate to={target} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return setError('Renseignez votre identifiant et votre mot de passe.');
    setPending(true);
    setError(null);
    try {
      await login(username.trim(), password);
      navigate(target, { replace: true });
    } catch (err) {
      setError(err.message);
      setPending(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.corner}>
        <ColorModeToggle />
      </div>
      <main className={styles.card}>
        <div className={styles.brand}>
          <BrandMark className={styles.mark} />
          <h1 className={styles.title}>Codex</h1>
          <p className={styles.subtitle}>Connectez-vous pour accéder aux univers.</p>
        </div>
        <form onSubmit={submit} className={styles.form} noValidate>
          <Field label="Identifiant">
            {(props) => <Input {...props} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus />}
          </Field>
          <Field label="Mot de passe" error={error}>
            {(props) => <Input {...props} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />}
          </Field>
          <Button type="submit" variant="primary" icon={LogIn} loading={pending} className={styles.submit}>
            Se connecter
          </Button>
        </form>
        <p className={styles.note}>Pas de compte ? Demandez-en un à un administrateur.</p>
      </main>
    </div>
  );
}
