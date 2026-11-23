# Codex

Codex est une application consacrée au Worldbuilding. Une sorte de wiki pour l'enregistrer des entités d'univers fictifs et avoir la possibilité de les utiliser.
Vous pouvez y enregistrer vos œuvres préférés, vos histoires, ou bien des histoires vécues avec vos amis lors de jeux de roles.

Ainsi, comme le nom l'indique, vous allez pouvoir constituer un Codex, une encyclopédie où vos personnages, vos lieux, vos groupes, et tout ce qui constitue votre univers sera enregistré.

## Principe

### Les univers et ses entités

Codex permet de créer un ou plusieurs univers. Chaques univers auront leur wiki, leurs entités, leur ambiance et leurs paramètres propres. Codex peut donc stocker plusieurs univers, mais ils sont tous indépendants les uns des autres.

Chaques univers auront donc leurs propres entités. Il y aura au minimum des personnages et des lieux (nous allons voir pourquoi "au minimum" plus tard), que vous allez pouvoir créer, configurer, et lier ensemble, ou à de futurs entités (par exemple, un personnage vient d'un lieu, et un lieu peut avoir plusieurs personnages originaires de ce dernier).

Il y a également des référenciels disponibles afin de pouvoir mieux catégoriser vos personnages :
- par genre
- statut (s'il est vivant ou non etc...),
- ou alignment (Lawful Good / Chaotic Evil par exemple).

Ces référenciels sont éditables à votre guise.

### Les modules : Des entités et options supplémentaires

Dans les paramètres d'un univers, vous pouvez activer ou non des modules afin d'ajouter davantage de perspectives d'éditions à votre univers.

<img width="748" height="953" alt="image" src="https://github.com/user-attachments/assets/5a565b34-ca93-4135-a59a-d22a1e3e9ace" />

Il y a donc des entités supplémentaires ajoutables :
- Les **groupes** : Des groupements de personnages afin d'enregistrer des affiliations, des clans, des équipes, des organisations... Le tout avec une hiérarchie définissable.
- Des **espèces** si votre monde en comporte plusieurs
- Une faune de créatures via le **bestiaire**
- Des **histoires**, le tout découpé en épisodes visibles sous forme de visuals novels ou non.
- Des **collections** afin de grouper vos entités de manière plus abstraite, à savoir s'ils sont terminés ou non, ou par parties de l'oeuvre que vous voulez archiver (une saison, un opus)

Il y a également des options supplémentaires pour vos entités :
- Pour les _personnages_, il y a :
  - les **pouvoirs**,
  - les **rangs de puissance**,
  - les **traits de personnalité**, qui sont définis en reprenant le système des 24 forces de caractère du VIA Institute.
  - Il y a également le module de **relations**, mais il n'est pas encore au point. Les relations définissables entre les personnages sont encore trop limitées, et les dynamiques manquent et ne sont pas au point.
- Pour les _lieux_, vous pouvez ajouter une **carte** pour vos lieux. Ainsi si vous avez plusieurs sous lieux pour un même lieu, vous pouvez les placer et y accéder de manière plus immersive.
- Pour les _histoires_, vous pouvez ajouter des **évènements**.

Il existe également un module de son pour ajouter des thèmes à vos personnages, lieux, et même des sons d'ambiance pour ces derniers

Enfin, un module de roleplay, dont l'objectif est de pouvoir faire du roleplay ecrit avec les personnages de votre univers. Si le module d'histoire est activé, vous pourrez même les enregistrer.

Effectivement, il n'y a pas que de l'archivage d'entités. Des que vous avez un univers avec ses liaisons, vous pouvez l'utiliser pour vos amuser simplement (via le roleplay comme dit ci-dessus).
Mais si vous voulez faire d'autres jeux ?

### Les Mods

Les mods sont des créations possibles d'entités, de champs supplémentaires pour les entités existantes, ou bien même des pages de supplémentaires comme des pages de jeux.

Il existe une documentation pour les mods dans la page `/mods/documentation` de votre site Codex.

Il y a également deux mods exemples afin de vous amuser, ou bien de prendre en main le modding :

- "Artefacts" est un mod simple permettant d'enregistrer des artefacts dans votre univers. Vous pourrez les classer par rareté et les décrire. Il y a également un jeu afin de pouvoir tirer au sort un des artefacts de votre univers.

- "Hunger Games" qui est un simulateur du célèbre jeu dans lequel vous pourrez y mettre vos personnages, et ainsi découvrir le déroulé de leur aventure.

Vous pourrez créer vos mods et aller encore plus loin. J'ai envie de créer un générateur d'histoires, pouvant pousser loin l'évolution des relations entre les personnages, ou même un mod ajoutant un système de combat poussé. Ou alors je fais quelque chose de plus simple comme un simulateur de combats pokemon, ou l'équivalent du WaifuArena de Mudae.

## Installation
- Dans "backend", créez un fichier .env avec les champs du .env.example, puis complétez les à votre convenance. Le but est de connecter l'application à une base de données, et de créer un premier compte super admin.

- Installez les dépendances.

```
cd backend
npm i
cd ../frontend
npm i
```

- Lancez ensuite le serveur node js via une commande à la racine du site. Celle-ci compilera votre rendu web, et lancera votre backend.

Lancement du serveur (à la racine du projet) :
```
npm run start
```

## Fonctionement

### Frontend

Le frontend est concu en React + Vite. Il contient tous les assets du site rendu, ainsi que ses pages. La compilation est faite dans le dossier `dist` lu ensuite par le backend.

### Backend

Un backend a été construit avec Sequelize, Node JS, et Express. Il doit se connecter à une base de donées (configurée par défaut en MySQL), et lire le rendu du site internet. 
