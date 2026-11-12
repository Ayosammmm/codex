import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getToken, request, setToken, setUnauthorizedHandler } from '@/api/client';
import { AUTH_KEY, AuthContext } from './auth';

/** Fournit la session (utilisateur connecté et entités qu'il peut modifier) à toute l'application. */
export function AuthProvider({ children }) {
  const queryClient = useQueryClient();
  const [hasToken, setHasToken] = useState(() => Boolean(getToken()));

  const session = useQuery({
    queryKey: AUTH_KEY,
    queryFn: () => request('/auth/me'),
    enabled: hasToken,
    staleTime: 5 * 60_000,
    retry: (count, error) => error.status !== 401 && count < 2,
  });

  const logout = () => {
    setToken(null);
    setHasToken(false);
    queryClient.clear(); // aucune donnée ne reste en mémoire après la déconnexion
  };

  // Jeton expiré ou compte supprimé : retour à la connexion
  useEffect(() => {
    setUnauthorizedHandler(logout);
  });

  const login = async (username, password) => {
    const data = await request('/auth/login', { method: 'POST', body: { username, password } });
    queryClient.clear();
    setToken(data.token);
    queryClient.setQueryData(AUTH_KEY, { user: data.user, editable: data.editable });
    setHasToken(true);
    return data.user;
  };

  const status = !hasToken ? 'anonymous' : session.data ? 'authenticated' : session.isPending ? 'loading' : 'error';

  const value = {
    status,
    error: session.error,
    user: hasToken ? session.data?.user || null : null,
    editable: hasToken ? session.data?.editable || null : null,
    login,
    logout,
  };

  return <AuthContext value={value}>{children}</AuthContext>;
}
