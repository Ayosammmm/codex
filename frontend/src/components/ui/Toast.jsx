import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { CircleAlert, CircleCheck, X } from '@/components/ui/icons';
import { cx } from './cx';
import styles from './Toast.module.scss';

const ToastContext = createContext(null);
let nextId = 1;

/** Notifications éphémères : const toast = useToast(); toast.success('...') */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback(
    (type, message) => {
      const id = nextId++;
      setToasts((list) => [...list.slice(-3), { id, type, message }]);
      setTimeout(() => dismiss(id), type === 'error' ? 7000 : 4000);
    },
    [dismiss],
  );

  const api = useMemo(
    () => ({ success: (m) => push('success', m), error: (m) => push('error', m) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className={styles.region}>
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.type === 'error' ? 'alert' : 'status'}
            className={styles.toast}
          >
            {t.type === 'error' ? (
              <CircleAlert className={cx(styles.icon, styles.error)} aria-hidden />
            ) : (
              <CircleCheck className={cx(styles.icon, styles.success)} aria-hidden />
            )}
            <p className={styles.message}>{t.message}</p>
            <button type="button" onClick={() => dismiss(t.id)} className={styles.close} aria-label="Fermer">
              <X aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
