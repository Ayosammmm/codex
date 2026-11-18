# Codex — Frontend v3

Vite + React 19, SCSS (CSS Modules), React Router, TanStack Query, TipTap.

```bash
npm install
npm run dev        # http://localhost:5174 (le backend doit tourner sur :5000)
```

Vite relaie `/api` et `/uploads` vers le backend (`VITE_BACKEND_URL` pour changer la cible).

## Thèmes

Tout passe par des variables CSS, voir `src/styles/_tokens.scss` :

1. **Mode** clair / sombre (`html[data-mode]`) : fonds, surfaces, textes.
2. **Thème** (`[data-theme="codex"]`) : polices, arrondis, ombres, couleurs par défaut.
   Catalogue dans `src/theme/themes.js`.
3. **Couleurs de l'univers** (`--primary`, `--secondary`, `--tertiary`) posées en inline par
   `universeThemeProps()` (`src/theme/universeTheme.js`) ; les variantes (`-soft`, `-ink`, `-hover`)
   sont dérivées en CSS.

Les composants n'utilisent que ces variables (`var(--surface)`, `var(--fg-muted)`, `var(--primary)`,
`var(--secondary-ink)`…), jamais de couleurs en dur. Ajouter un thème = un bloc `[data-theme='…']`
dans `_tokens.scss` + `available: true` dans `themes.js`.

## Styles (SCSS)

- `src/styles/main.scss` : styles globaux, importés une fois (tokens, reset, texte riche).
- `src/styles/_mixins.scss` : breakpoints (`@include up(md)`), espacements (`space(4)` = 1rem),
  `card`, `focus-ring`, `line-clamp`… À importer dans chaque module : `@use '@/styles/mixins' as *;`
- Chaque composant a son `Composant.module.scss` (classes locales : `styles.card`, `styles.title`…).
- Seule classe globale utilitaire : `sr-only` (texte réservé aux lecteurs d'écran).

## Structure

```
src/
├── api/          client fetch, API univers, hooks React Query
├── components/
│   ├── ui/       design system (Button, Field, Dialog, Menu, Switch, ColorInput, ImagePicker, RichText…)
│   ├── layout/   en-tête, sélecteur clair/sombre
│   └── universe/ carte, formulaire, aperçu, actions (dupliquer / exporter / supprimer)
├── config/       modules d'univers
├── pages/        accueil, création, cadre d'univers, accueil d'univers, paramètres
├── styles/       tokens de thème, mixins, styles globaux
├── theme/        thèmes, contraste, mode clair/sombre
└── utils/
```
