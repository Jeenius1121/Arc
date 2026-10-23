# ARC Events

Une application mobile (Expo / React Native) qui affiche les comptes à rebours des événements de carte (map conditions) d'**ARC Raiders**, avec des filtres que tu peux combiner et enregistrer.

## Fonctionnalités

- Planning lu sur le site officiel (`https://arcraiders.com/map-conditions`), pour la **région de serveur** choisie dans ⚙ (Europe par défaut, Amérique du Nord, Brésil, Asie de l'Est, Océanie). En Europe, MetaForge sert de secours si le site officiel ne répond pas.
- Noms des cartes et des événements en français (`src/core/names.ts`).
- Compte à rebours en direct ; un événement en cours est encadré en vert (« fin dans … »).
- Liste triée du plus proche au plus lointain.
- Filtres combinables (bouton **Filtres**) : catégories (Nuit, Orage / météo, Butin bonus, ARC majeur), cartes, événements exacts, « masquer les événements en cours ». Dans un même groupe les choix s'additionnent, entre groupes ils se combinent : « Orage » + « Champ de bataille du barrage » = les orages sur cette carte.
- **Filtres enregistrés** : donne un nom au filtre dans la fenêtre Filtres → il apparaît en haut de l'écran. Appui long pour le supprimer.
- Cache hors ligne, actualisation toutes les 15 min ou en tirant la liste vers le bas.

## Installer sur Android sans ordinateur

À chaque mise à jour du code, GitHub compile l'APK et le publie sur la page *Releases* → `apk-latest` (`app-release.apk`). Ouvre-la connecté à ton compte GitHub (le dépôt est privé).

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
- `scripts/check-sources.ts` : vérifie les vraies sources (lancé par GitHub Actions, workflow *Check data sources*).

## Limites connues

- Le site officiel n'est pas une API documentée : si Embark change la page, le workflow *Check data sources* échouera et `parsers.ts` devra être adapté.
- Les noms français viennent de arctracker.io/fr/map-events ; un nouvel événement non listé s'affiche en anglais.
