# Mods d'exemple

Chaque dossier est un mod. Pour l'installer : compresser le dossier en .zip, puis
Codex → menu du compte → « Mods » (super admins) → « Installer un mod ».
Activer ensuite le mod dans les paramètres de l'univers.

```
cd exemples-mods
zip -r artefacts.zip artefacts
cd hunger-games && zip -r ../hunger-games.zip . && cd ..
```

- `artefacts` : type de fiche « Artefact », champs sur les personnages, page « Trésor » (tirage au sort).
- `hunger-games` : simulateur Hunger Games (page « Jeux »). Les événements sont dans `events.js`
  (syntaxe des accords en tête du fichier), la simulation dans `engine.js`, l'interface dans `app.js`.

Format complet : page « Documentation des mods » de Codex (/mods/documentation) ou note Obsidian « Modding ».
