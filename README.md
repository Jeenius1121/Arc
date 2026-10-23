# ARC Events

Une application mobile (Expo / React Native) qui affiche les comptes à rebours des événements de carte (map conditions) d'**ARC Raiders**, avec des filtres que tu peux combiner et enregistrer.

## Fonctionnalités

- Planning lu sur le site officiel (`https://arcraiders.com/map-conditions`), pour la **région de serveur** choisie dans ⚙ (Europe par défaut, Amérique du Nord, Brésil, Asie de l'Est, Océanie). En Europe, MetaForge sert de secours si le site officiel ne répond pas.
- Noms des cartes et des événements en français (`src/core/names.ts`).
- Compte à rebours en direct ; un événement en cours est encadré en vert (« fin dans … »).
- Liste triée du plus proche au plus lointain.
- Filtres combinables (bouton **Filtres**) : catégories (Nuit, Orage / météo, Butin bonus, ARC majeur), cartes, événements exacts, « masquer les événements en cours ». Dans un même groupe les choix s'additionnent, entre groupes ils se combinent : « Orage » + « Champ de bataille du barrage » = les orages sur cette carte.
- **Filtres enregistrés** : donne un nom au filtre dans la fenêtre Filtres → il apparaît en haut de l'écran. Appui long pour le supprimer.
- **Notifications** : la cloche 🔔 sur un événement à venir permet de cocher un ou plusieurs rappels (au début, 5/15/30 min, 1 h ou 2 h avant, à la fin). Sur un événement en cours, la cloche prévient quand il se termine.
- **Favoris** : le cœur ❤ suit un type d'événement, sur toutes les cartes ou seulement certaines (re-toucher le cœur pour choisir). Une notification arrive à chaque occurrence (au début ou avant, réglable dans ⚙), sauf pendant les **heures calmes**.
- **Vue « Cartes · maintenant »** : pour chaque carte, l'événement en cours et le suivant.
- **Fiche détail** (toucher un événement) : icône officielle, type (majeure/mineure), effets en français, prochaines occurrences, cloche et cœur. Toucher une notification ouvre directement cette fiche.
- Liste groupée (En cours, Dans l'heure, Aujourd'hui, Demain, Plus tard), badge ✨ Rare pour les événements qui reviennent au plus 2 fois dans le planning, alerte si les données ont plus d'une heure.
- **Widget Android** « ARC Events » : prochains favoris (ou prochains événements) sur l'écran d'accueil. Le planning est rechargé en arrière-plan toutes les ~2 h pour le widget et les favoris.
- **Objets** (onglet 🔎) : recherche en français de tous les objets ; fiche avec verdict **Garder / Mettre de côté / Recycler / Vendre**, valeur, valeur par case, recyclage, démontage, recette, usages (quêtes, atelier, projets, fabrication, échanges), marchands, ARC qui le lâchent, zones de butin.
- **Objectifs** (onglet 🎯) : suivre des quêtes, niveaux d'atelier et phases de projet ; l'app calcule la **liste de courses** totale et ce qu'il manque, avec les objets mis de côté.
- **Planificateur** : en haut de l'onglet Objectifs, les meilleurs créneaux à venir pour ta liste de courses (ARC qui lâchent l'objet et sont plus fréquents pendant l'événement, plantes et Floraisons luxuriantes, épaves d'ARC et Cimetière d'épaves…), avec notification optionnelle (⚙ → 🎯).
- **Bestiaire** (onglet 🤖) : chaque ARC avec menace, point faible, cartes, événements où il est plus fréquent (et prochaines occasions), butin.
- **Fabrication** : matériaux de base au total, coût en composants contre prix marchand, nombre de fabrications possibles avec les objets mis de côté.
- **Scanner** 📷 (onglet Objets) : photo de l'écran du jeu → reconnaissance de texte sur le téléphone (ML Kit) → fiche de l'objet.
- **Journal** (onglet 📒) : chaque raid en deux appuis (carte, extrait/mort, valeur) ; taux d'extraction et rendement réel par carte et par événement.
- **Escouade** : partager un événement (lien `arcevents://` qui ouvre la fiche) ou sa liste de courses.
- **Fiches de quêtes** (objectifs, objets à livrer, récompenses, chaîne), **cartes** (vue Cartes → 🗺), alerte quand une mise à jour des données modifie un objet suivi.
- Cache hors ligne, actualisation toutes les 15 min ou en tirant la liste vers le bas.

## Installer sur Android sans ordinateur

À chaque mise à jour du code, GitHub compile l'APK et le publie sur la page *Releases* → `apk-latest` (`app-release.apk`, accompagné de `version.json`).

Une fois installée, l'app se met à jour toute seule : au démarrage (désactivable dans ⚙) ou avec le bouton *Rechercher une mise à jour*, elle compare son numéro de build à `version.json`, télécharge le nouvel APK et ouvre l'installateur Android. Le dépôt doit être public pour que ces fichiers soient accessibles.

## Lancer l'app

```bash
npm install
npx expo start        # scanne le QR code avec Expo Go (Android / iOS)
```

Pour générer un APK ou une build iOS : `npx eas-cli@latest build`.

## Développement

```bash
npm test              # tests du parsing et des filtres (node:test)
npm run typecheck
```

- `src/core/parsers.ts` : lecture du planning officiel (données `liveEntries` de la page Next.js) et de MetaForge.
- `src/core/names.ts` : noms français.
- `src/core/filter.ts` : filtrage, tri, comptes à rebours.
- `src/core/favorites.ts`, `src/core/insights.ts`, `src/core/conditionInfo.ts` (+ `conditionIcons.json`, icônes extraites du site officiel) : favoris, vue par carte, groupes, rareté, fiches.
- `src/widget/` : widget Android (react-native-android-widget).
- `scripts/check-sources.ts` : vérifie les vraies sources (lancé par GitHub Actions, workflow *Check data sources*).

## Données de jeu

Objets, quêtes, atelier, projets, ARC et échanges viennent du dépôt communautaire [arcraiders-data](https://github.com/fgrzesiak/arcraiders-data) (MIT, synchronisé depuis arctracker.io ; images servies par cdn.arctracker.io). `scripts/build-gamedata.ts` en tire `src/data/gamedata.json` (français uniquement), régénéré à chaque build et publié chaque jour sur la release `apk-latest` : l'app télécharge la version la plus récente.

## Limites connues

- Le site officiel n'est pas une API documentée : si Embark change la page, le workflow *Check data sources* échouera et `parsers.ts` devra être adapté.
- Les noms français viennent de arctracker.io/fr/map-events ; un nouvel événement non listé s'affiche en anglais.
