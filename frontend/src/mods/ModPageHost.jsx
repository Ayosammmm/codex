import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { UPLOADS_BASE } from '@/api/client';
import { metadataApi, recordsApi } from '@/api/mods';
import { entityKeys } from '@/api/queries';
import { RESOURCES } from '@/api/resources';
import { usePermissions } from '@/auth/auth';
import { useToast } from '@/components/ui/Toast';
import { useThemeKey } from '@/theme/themeKey';
import { universePath } from '@/utils/universe';
import { BASE_ENTITIES } from './entityRefs';
import styles from './Mods.module.scss';

/**
 * Page de code d'un mod, affichée dans une iframe isolée (sandbox sans allow-same-origin : origine opaque).
 * Le mod n'a accès ni à la session ni au DOM de l'application : il appelle l'API par postMessage
 * (SDK : /mod-files/almanach-sdk.js), et chaque appel est exécuté ici avec les droits de l'utilisateur,
 * limité à l'univers courant et aux données de ce mod.
 */

// Variables CSS du thème transmises à la page du mod
const THEME_VARS = [
  '--bg', '--surface', '--surface-2', '--surface-3', '--border', '--border-strong',
  '--fg', '--fg-muted', '--fg-subtle', '--danger', '--success', '--warning',
  '--primary', '--secondary', '--tertiary', '--font-ui', '--font-title', '--font-mono', '--r-sm', '--r', '--r-lg',
];

// Ressources lisibles par un mod : 'characters' (ou 'character'), 'places'…
const READABLE = Object.fromEntries(
  Object.entries(BASE_ENTITIES).flatMap(([type, b]) => [[b.resource, b.resource], [type, b.resource]]),
);

const httpError = (message, status = 400) => Object.assign(new Error(message), { status });

export function ModPageHost({ universe, modPage }) {
  const { mod } = modPage;
  const iframeRef = useRef(null);
  const wrapRef = useRef(null);
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const themeKey = useThemeKey();
  const { user, isAdmin, canCreate } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [height, setHeight] = useState(null);

  // Adresse stable : changer les paramètres de l'URL (setQuery) ne recharge pas la page du mod
  const [src] = useState(
    () => `/mod-files/${encodeURIComponent(mod.id)}/${modPage.entry.split('/').map(encodeURIComponent).join('/')}?v=${encodeURIComponent(`${mod.version}-${mod.updatedAt || ''}`)}`,
  );

  // Valeurs courantes lues par le gestionnaire de messages (installé une seule fois)
  const live = useRef({});
  useLayoutEffect(() => {
    live.current = { universe, mod, modPage, user, isAdmin, canCreate, themeKey, searchParams, navigate, toast, queryClient, setSearchParams };
  });

  useEffect(() => {
    const frame = iframeRef.current;
    const post = (message) => frame?.contentWindow?.postMessage({ source: 'almanach-host', ...message }, '*');

    const readTheme = () => {
      const style = getComputedStyle(wrapRef.current || document.documentElement);
      const vars = Object.fromEntries(THEME_VARS.map((name) => [name, style.getPropertyValue(name).trim()]).filter(([, v]) => v));
      return { key: live.current.themeKey, mode: document.documentElement.dataset.mode || 'light', vars };
    };

    const context = () => {
      const { universe: u, mod: m, modPage: p, user: me, isAdmin: admin, canCreate: create, searchParams: params } = live.current;
      return {
        mod: { id: m.id, name: m.name, version: m.version, entityTypes: m.entityTypes, fields: m.fields },
        page: { key: p.key, label: p.label, path: p.path },
        universe: { id: u.id, name: u.name, description: u.description, logo: u.logo, colors: u.colors },
        user: me ? { id: me.id, displayName: me.displayName, role: me.role, canCreate: create, isAdmin: admin } : null,
        query: Object.fromEntries(params),
        uploadsBase: UPLOADS_BASE,
        theme: readTheme(),
      };
    };

    // --- Appels du mod ---
    const listOf = (resource) => {
      const { queryClient: qc, universe: u } = live.current;
      return qc.fetchQuery({ queryKey: entityKeys.list(resource, u.id), queryFn: () => RESOURCES[resource].list(u.id), staleTime: 10_000 });
    };
    const ownRecord = async (id) => {
      const record = await recordsApi.get(id);
      if (record.modId !== live.current.mod.id || record.universe_id !== live.current.universe.id) throw httpError('Enregistrement introuvable.', 404);
      return record;
    };
    const customType = (type) => {
      const key = type.slice('custom:'.length);
      if (!live.current.mod.entityTypes.some((t) => t.key === key)) throw httpError(`Type « ${key} » inconnu dans ce mod.`);
      return key;
    };

    const handlers = {
      'entities.list': async ({ type }) => {
        const { mod: m } = live.current;
        if (typeof type === 'string' && type.startsWith('custom:')) {
          const key = customType(type);
          return (await listOf('customEntities')).filter((e) => e.modId === m.id && e.typeKey === key);
        }
        if (!READABLE[type]) throw httpError(`Type d’entité inconnu : ${type}`);
        return listOf(READABLE[type]);
      },
      'entities.get': async ({ type, id }) => {
        const custom = typeof type === 'string' && type.startsWith('custom:');
        const resource = custom ? 'customEntities' : READABLE[type];
        if (!resource) throw httpError(`Type d’entité inconnu : ${type}`);
        const entity = await RESOURCES[resource].get(Number(id));
        const wrong = entity.universe_id !== live.current.universe.id || (custom && (entity.modId !== live.current.mod.id || entity.typeKey !== customType(type)));
        if (wrong) throw httpError('Fiche introuvable.', 404);
        return entity;
      },
      'entities.metadata': async () => {
        const rows = await metadataApi.list(live.current.universe.id);
        return Object.fromEntries(rows.filter((r) => r.data?.[live.current.mod.id]).map((r) => [`${r.entityType}:${r.entityId}`, r.data[live.current.mod.id]]));
      },
      'records.list': ({ collection, summary }) => recordsApi.list(live.current.universe.id, live.current.mod.id, collection, { summary }),
      'records.get': ({ id }) => ownRecord(id),
      'records.create': ({ collection, data }) => recordsApi.create(live.current.universe.id, live.current.mod.id, collection, data),
      'records.update': async ({ id, data }) => {
        await ownRecord(id);
        return recordsApi.update(id, data);
      },
      'records.remove': async ({ id }) => {
        await ownRecord(id);
        return recordsApi.remove(id);
      },
      navigate: ({ path }) => {
        if (typeof path !== 'string' || /^[a-z]+:|^\/|\.\./i.test(path)) throw httpError('Chemin invalide.');
        live.current.navigate(universePath(live.current.universe, path));
        return true;
      },
      pathOf: ({ type, id }) => {
        if (typeof type === 'string' && type.startsWith('custom:')) {
          const key = customType(type);
          const t = live.current.mod.entityTypes.find((x) => x.key === key);
          return `mods/${live.current.mod.id}/${t.path}/${Number(id)}`;
        }
        const base = Object.entries(BASE_ENTITIES).find(([k, b]) => k === type || b.resource === type)?.[1];
        if (!base) throw httpError(`Type d’entité inconnu : ${type}`);
        return `${base.path}/${Number(id)}`;
      },
      toast: ({ message, kind }) => {
        const text = String(message).slice(0, 300);
        if (kind === 'error') live.current.toast.error(text);
        else live.current.toast.success(text);
        return true;
      },
      scrollToTop: () => {
        frame?.scrollIntoView({ block: 'start', behavior: 'smooth' });
        return true;
      },
      setQuery: ({ params }) => {
        live.current.setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            for (const [k, v] of Object.entries(params || {})) {
              if (v == null || v === '') next.delete(k);
              else next.set(k, String(v));
            }
            return next;
          },
          { replace: true },
        );
        return true;
      },
    };

    const onMessage = async (event) => {
      if (!frame || event.source !== frame.contentWindow) return;
      const message = event.data;
      if (!message || message.source !== 'almanach-mod') return;
      if (message.type === 'hello') return post({ type: 'init', context: context() });
      if (message.type === 'resize') {
        const h = Number(message.height);
        if (Number.isFinite(h)) setHeight(Math.min(Math.max(h, 200), 20000));
        return;
      }
      if (message.type !== 'request') return;
      const handler = Object.hasOwn(handlers, message.method) ? handlers[message.method] : null;
      try {
        if (!handler) throw httpError(`Méthode inconnue : ${message.method}`);
        const result = await handler(message.params || {});
        post({ type: 'response', id: message.id, result: JSON.parse(JSON.stringify(result ?? null)) });
      } catch (error) {
        post({ type: 'response', id: message.id, error: { message: error.message || 'Erreur', status: error.status || 500 } });
      }
    };

    window.addEventListener('message', onMessage);
    // Changement clair / sombre : la page du mod suit
    const observer = new MutationObserver(() => post({ type: 'theme', theme: readTheme() }));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-mode'] });
    return () => {
      window.removeEventListener('message', onMessage);
      observer.disconnect();
    };
  }, []);

  return (
    <main ref={wrapRef} className={styles.modPage}>
      <iframe
        ref={iframeRef}
        src={src}
        title={`${modPage.label} (${mod.name})`}
        className={styles.modFrame}
        style={height ? { height } : undefined}
        // Origine opaque : pas d'accès à la session ni au stockage de l'application
        sandbox="allow-scripts allow-modals allow-downloads allow-popups"
        referrerPolicy="no-referrer"
      />
    </main>
  );
}
