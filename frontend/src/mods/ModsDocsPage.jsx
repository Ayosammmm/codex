import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { ArrowLeft, Check, Copy } from '@/components/ui/icons';
import { AppHeader } from '@/components/layout/AppHeader';
import page from '@/pages/Page.module.scss';
import { ModIcon } from './ModIcon';
import { MOD_ICON_NAMES } from './modIcons';
import styles from './ModsDocs.module.scss';

/** Documentation des mods (/mods/documentation), ouverte depuis la page d'installation des mods. */

const SECTIONS = [
  ['cycle', 'Cycle de vie'],
  ['archive', 'Archive'],
  ['manifeste', 'Manifeste'],
  ['champs', 'Champs'],
  ['pages', 'Pages de code'],
  ['sdk', 'SDK'],
  ['theme', 'Thème et affichage'],
  ['droits', 'Droits'],
  ['icones', 'Icônes'],
];

const ZIP_EXAMPLE = `cd exemples-mods
zip -r artefacts.zip artefacts
cd hunger-games && zip -r ../hunger-games.zip . && cd ..`;

const MANIFEST = `{
  "id": "artefacts",              // 2 à 40 caractères : minuscules, chiffres, tirets
  "name": "Artefacts",
  "version": "1.0.0",
  "description": "…", "author": "…",
  "icon": "Gem",                   // voir « Icônes » plus bas

  "entityTypes": [{
    "key": "artefact",             // unique dans le mod (« character », « place »… réservés)
    "label": "Artefact", "plural": "Artefacts", "feminine": false,
    "path": "artefacts",           // URL : /univers/…/mods/<id>/artefacts (par défaut : key)
    "icon": "Gem", "description": "…",
    "hierarchy": true,             // parent / enfants, vue arborescence
    "navSection": "encyclopedia",  // ou "games" (défaut : encyclopedia)
    "fields": [ … ]
  }],

  "fields": {                      // champs ajoutés aux fiches de base
    "character": [ … ], "place": [ … ], "group": [ … ], "specie": [ … ],
    "creature": [ … ], "story": [ … ], "event": [ … ]
  },

  "pages": [{
    "key": "tresor", "label": "Trésor", "path": "tresor", "icon": "Trophy",
    "entry": "index.html",         // fichier .html présent dans l'archive
    "navSection": "games"          // ou "encyclopedia" (défaut : games)
  }]
}`;

const FIELD = `{ "key": "rarete", "label": "Rareté", "type": "select", "hint": "…", "table": true, "card": true,
  "options": ["Commun", { "value": "legendaire", "label": "Légendaire", "color": "#d4a017" }] }`;

const SDK = `<script src="/mod-files/codex-sdk.js"></script>
<script>
  Codex.ready().then(async (ctx) => {
    // ctx : { mod, page, universe, user: { id, displayName, role, canCreate, isAdmin }, query, theme, uploadsBase }
    const persos = await Codex.entities.list('characters');        // places, groups, species, creatures, stories, events
    const artefacts = await Codex.entities.list('custom:artefact'); // types du mod
    const perso = await Codex.entities.get('characters', 12);
    const valeurs = await Codex.entities.metadata();                // { 'character:12': { mana: 40 } }

    // Données libres du mod dans l'univers, rangées par collection
    const rec = await Codex.records.create('parties', { gagnant: { type: 'character', id: 12 } });
    await Codex.records.list('parties', { summary: true });         // sans \`data\`
    await Codex.records.get(rec.id);
    await Codex.records.update(rec.id, { … });
    await Codex.records.remove(rec.id);

    Codex.navigate(await Codex.pathOf('characters', 12));           // ouvre une fiche
    Codex.toast('Partie enregistrée', 'success');
    Codex.scrollToTop();                                            // remonte en haut de la page du mod
    Codex.setQuery({ partie: rec.id });                             // ?partie=… (relu dans ctx.query)
    Codex.imageUrl(perso.avatar);
  });
</script>`;

const FIELD_TYPES = [
  ['text', 'texte court (1 000 caractères)', null],
  ['richtext', 'texte mis en forme', null],
  ['number', 'nombre, ramené entre min et max', <><code>min</code>, <code>max</code>, <code>unit</code></>],
  ['boolean', 'oui / non', null],
  ['date', 'AAAA-MM-JJ', null],
  ['select', 'une option', <><code>options</code> : chaînes ou <code>{'{ value, label, color }'}</code></>],
  ['multiselect', 'plusieurs options', <code>options</code>],
  ['color', '#rrggbb', null],
  ['url', 'http(s)://…', null],
  [
    'ref',
    <>fiche(s) liée(s) : <code>[{'{ type, id }'}]</code></>,
    <><code>entity</code> : character, place, group, specie, creature, story, event ou un type du mod · <code>multiple</code></>,
  ],
];

const SDK_METHODS = [
  ['ready()', <>Promesse résolue avec le contexte, ensuite lisible via <code>Codex.context</code>.</>],
  ['entities.list(type)', <>Fiches de l’univers : <code>characters</code>, <code>places</code>, <code>groups</code>, <code>species</code>, <code>creatures</code>, <code>stories</code>, <code>events</code> (ou au singulier), ou <code>custom:&lt;clé&gt;</code> pour un type de ce mod.</>],
  ['entities.get(type, id)', 'Une fiche, si elle appartient à l’univers courant (et au mod pour custom:).'],
  ['entities.metadata()', <>Valeurs des champs ajoutés par ce mod, indexées par <code>'type:id'</code>.</>],
  ['records.*', <>Enregistrements libres. Collection : minuscules, chiffres, <code>_</code> et <code>-</code> (40 caractères). 4 Mo maximum par enregistrement. Liste du plus récent au plus ancien, avec <code>author</code> et <code>createdBy</code>.</>],
  ['pathOf(type, id)', 'Chemin d’une fiche, relatif à l’univers.'],
  ['navigate(path)', <>Ouvre une page de l’univers. Chemin relatif uniquement (pas de <code>/</code> initial, de <code>..</code> ni de <code>http:</code>).</>],
  ['toast(message, kind)', <><code>success</code> ou <code>error</code>, 300 caractères maximum.</>],
  ['setQuery(params)', 'Modifie les paramètres de l’URL sans recharger la page ; une valeur vide supprime le paramètre.'],
  ['scrollToTop()', 'Remonte en haut de la page du mod, à appeler après un changement d’écran.'],
  ['imageUrl(path)', 'URL affichable d’une image de fiche (/uploads/… ou URL externe).'],
  ["on('theme', cb)", 'Appelé quand l’utilisateur passe en mode clair ou sombre.'],
];

function CodeBlock({ children, label }) {
  const [copied, setCopied] = useState(false);
  const copy = () =>
    navigator.clipboard?.writeText(children).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  return (
    <div className={styles.code}>
      <div className={styles.codeBar}>
        <span>{label}</span>
        <button type="button" onClick={copy} className={styles.copy}>
          {copied ? <Check aria-hidden /> : <Copy aria-hidden />}
          {copied ? 'Copié' : 'Copier'}
        </button>
      </div>
      <pre>{children}</pre>
    </div>
  );
}

function Table({ head, rows }) {
  return (
    <div className={styles.tableWrap}>
      <table className={styles.table}>
        <thead>
          <tr>{head.map((h) => <th key={h}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map(([first, ...rest]) => (
            <tr key={first}>
              <td><code>{first}</code></td>
              {rest.map((cell, i) => <td key={i}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function ModsDocsPage() {
  const [active, setActive] = useState(SECTIONS[0][0]);

  useEffect(() => {
    document.title = 'Documentation des mods · Codex';
    return () => {
      document.title = 'Codex';
    };
  }, []);

  // Sommaire : section en cours de lecture
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setActive(e.target.id)),
      { rootMargin: '0px 0px -70% 0px' },
    );
    SECTIONS.forEach(([id]) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <AppHeader />
      <main className={`${page.main} ${page.mainSpaced}`}>
        <Link to="/mods" className={page.backLink}>
          <ArrowLeft aria-hidden /> Mods
        </Link>
        <h1 className={page.title}>Documentation des mods</h1>
        <p className={page.lead}>
          Un mod étend un univers sans toucher au code de Codex. Les modules sont livrés avec l’application ; un mod est une archive .zip
          qu’un super admin installe, puis qu’un admin active dans son univers.
        </p>

        <div className={styles.layout}>
          <nav className={styles.toc} aria-label="Sommaire">
            <ol>
              {SECTIONS.map(([id, label]) => (
                <li key={id}>
                  <a href={`#${id}`} className={active === id ? styles.tocActive : undefined}>{label}</a>
                </li>
              ))}
            </ol>
          </nav>

          <div className={styles.content}>
            <div className={styles.kinds}>
              <div>
                <strong>Types de fiches</strong>
                <span>« Artefacts », « Vaisseaux »… avec galerie, arborescence, tableau, fiche, édition, album photo, collections, éditeurs, export / import.</span>
              </div>
              <div>
                <strong>Champs supplémentaires</strong>
                <span>Sur les personnages, lieux, groupes, espèces, créatures, histoires et événements.</span>
              </div>
              <div>
                <strong>Pages de code</strong>
                <span>Jeux, simulateurs, outils en HTML / JS, rangés dans « Encyclopédie » ou « Jeux ».</span>
              </div>
            </div>

            <section id="cycle">
              <h2>Cycle de vie</h2>
              <ol className={styles.steps}>
                <li><div><strong>Installer.</strong> Un super admin envoie l’archive .zip sur la page « Mods ». Réinstaller un mod du même <code>id</code> le met à jour.</div></li>
                <li><div><strong>Activer.</strong> Un admin l’active dans les paramètres de l’univers, section « Mods ».</div></li>
                <li><div>
                  <strong>Désactiver ou désinstaller.</strong> Les pages et champs du mod sont masqués ; les données sont conservées et réapparaissent à la
                  réactivation. Une mise à jour qui retire un champ garde aussi ses valeurs.
                </div></li>
              </ol>
              <p>
                Deux mods d’exemple sont fournis dans <code>exemples-mods/</code> du dépôt : <code>artefacts</code> (type de fiche, champs sur les
                personnages, page « Trésor ») et <code>hunger-games</code> (simulateur avec parties enregistrées).
              </p>
              <CodeBlock label="bash">{ZIP_EXAMPLE}</CodeBlock>
            </section>

            <section id="archive">
              <h2>Archive</h2>
              <p>Un <code>manifest.json</code> à la racine de l’archive (ou dans un unique dossier), accompagné des fichiers des pages.</p>
              <ul>
                <li>50 Mo maximum (100 Mo décompressée), 2 000 fichiers maximum.</li>
                <li>
                  Fichiers acceptés : html, htm, js, mjs, css, json, txt, md, map · png, jpg, jpeg, gif, webp, avif, svg, ico · mp3, ogg, oga, wav,
                  m4a, opus, webm · woff, woff2, ttf, otf.
                </li>
                <li>Les autres fichiers et les fichiers cachés sont ignorés ; une archive contenant <code>../</code> est refusée.</li>
              </ul>
            </section>

            <section id="manifeste">
              <h2>Manifeste</h2>
              <p>
                Un mod déclare au moins un type de fiche, un champ ou une page. Les commentaires ci-dessous expliquent chaque clé : ils ne sont pas
                autorisés dans le vrai fichier JSON.
              </p>
              <CodeBlock label="manifest.json">{MANIFEST}</CodeBlock>
              <p>
                Limites : 20 types de fiches, 10 pages, 60 champs par liste et 100 options par champ à choix. Clés de types et de pages et chemins :
                minuscules, chiffres et tirets ; un chemin ne sert qu’une fois dans le mod.
              </p>
            </section>

            <section id="champs">
              <h2>Champs</h2>
              <CodeBlock label="champ">{FIELD}</CodeBlock>
              <ul>
                <li><code>key</code> : lettres, chiffres et <code>_</code>, commence par une lettre. Sans <code>type</code>, le champ est un <code>text</code>.</li>
                <li><code>table: false</code> masque la colonne par défaut ; <code>card: true</code> affiche le champ sur les cartes de la galerie.</li>
              </ul>
              <Table head={['Type', 'Valeur', 'Options']} rows={FIELD_TYPES} />
              <p>Les listes à choix et les oui / non servent aussi de filtres et de regroupements ; les champs simples sont triables.</p>
            </section>

            <section id="pages">
              <h2>Pages de code</h2>
              <p>
                Une page s’affiche dans une iframe isolée (sandbox, origine opaque) : elle n’a accès ni à la session, ni au DOM, ni au stockage de
                Codex. Chaque fichier servi porte un en-tête CSP <code>sandbox</code>, même ouvert directement dans un onglet.
              </p>
              <p>
                La page dialogue avec l’application via le SDK, qui exécute chaque appel avec les droits de l’utilisateur, limité à l’univers courant
                et aux données du mod. Les fichiers du mod sont servis sur <code>/mod-files/&lt;id&gt;/…</code> : scripts, styles et images se chargent
                par chemin relatif.
              </p>
            </section>

            <section id="sdk">
              <h2>SDK</h2>
              <p>Le SDK se charge depuis <code>/mod-files/codex-sdk.js</code> et expose l’objet global <code>Codex</code>.</p>
              <CodeBlock label="index.html">{SDK}</CodeBlock>
              <Table head={['Méthode', 'Rôle']} rows={SDK_METHODS} />
              <p>Chaque appel renvoie une promesse ; en cas d’échec, l’erreur porte un <code>message</code> et un <code>status</code> HTTP.</p>
              <p className={styles.callout}>
                <strong>Références.</strong> Stockez un lien vers une fiche sous la forme <code>{'{ "type": "character", "id": 12 }'}</code>{' '}
                (<code>"custom"</code> pour une fiche de mod). Ces références sont renumérotées à l’export, à l’import et à la duplication de l’univers.
              </p>
            </section>

            <section id="theme">
              <h2>Thème et affichage</h2>
              <ul>
                <li>
                  Variables CSS du thème de l’univers : <code>--bg</code>, <code>--surface</code>, <code>--surface-2</code>, <code>--surface-3</code>,{' '}
                  <code>--border</code>, <code>--border-strong</code>, <code>--fg</code>, <code>--fg-muted</code>, <code>--fg-subtle</code>,{' '}
                  <code>--danger</code>, <code>--success</code>, <code>--warning</code>, <code>--primary</code>, <code>--secondary</code>,{' '}
                  <code>--tertiary</code>, <code>--font-ui</code>, <code>--font-title</code>, <code>--font-mono</code>, <code>--r-sm</code>,{' '}
                  <code>--r</code>, <code>--r-lg</code>.
                </li>
                <li>La racine reçoit <code>data-mode</code> (light / dark) et <code>data-theme</code>, mis à jour quand l’utilisateur change de mode.</li>
                <li>La hauteur de l’iframe suit celle du contenu (200 à 20 000 px). Gardez un fond transparent sur <code>body</code>.</li>
                <li>Prévoyez des valeurs de repli, par exemple <code>var(--primary, #3d5a98)</code>.</li>
              </ul>
            </section>

            <section id="droits">
              <h2>Droits</h2>
              <ul>
                <li>Installer / désinstaller : super admins. Activer dans un univers : admins.</li>
                <li>Fiches des types de mods : mêmes règles que les autres fiches (éditeurs liés, admins).</li>
                <li>Champs supplémentaires : droits de la fiche concernée.</li>
                <li>Enregistrements des pages : lecture pour tous, création par les éditeurs, modification / suppression par l’auteur ou un admin.</li>
              </ul>
            </section>

            <section id="icones">
              <h2>Icônes</h2>
              <p>Noms utilisables pour <code>icon</code> (mod, types de fiches, pages). Un nom inconnu affiche une pièce de puzzle.</p>
              <ul className={styles.icons}>
                {MOD_ICON_NAMES.filter((name) => name !== 'SketchFilter').map((name) => (
                  <li key={name} title={name}>
                    <ModIcon name={name} aria-hidden />
                    <span>{name}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      </main>
    </>
  );
}
