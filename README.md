# ARC Events

Une application mobile (Expo / React Native) qui affiche les comptes à rebours des événements de carte (map conditions) d'**ARC Raiders**, avec des filtres que tu peux combiner et enregistrer.

## Fonctionnalités

- Récupère le planning depuis le site officiel (`https://arcraiders.com/map-conditions`). Si la page ne contient aucune donnée exploitable, l'app passe à une source communautaire (MetaForge). Tu peux modifier les URL dans ⚙.
- Compte à rebours en direct pour chaque événement. Un événement en cours est encadré en vert et affiche « fin dans … ».
- La liste va toujours de l'événement le plus proche au plus lointain.
- Filtres combinables :
  - **Catégories** : Nuit, Orage / météo, Butin bonus, ARC majeur. Elles sont déduites du nom de l'événement.
  - **Cartes** : Dam Battlegrounds (Champ de bataille du barrage), Buried City, Spaceport, The Blue Gate, Stella Montis…
  - **Événements** : chaque condition exacte trouvée dans les données.
  - Option « masquer les événements en cours ».
- Dans un même groupe, plusieurs choix s'additionnent (OU). Entre les groupes, ils se combinent (ET). Par exemple, « Orage » + « Dam Battlegrounds » n'affiche que les orages sur cette carte.
- **Filtres enregistrés** : configure un filtre, donne-lui un nom (« Orage Barrage »), puis appuie sur *Enregistrer*. Il apparaît dans la barre du haut. Un appui long dessus le supprime. Nuit, Orage / météo et Butin bonus sont fournis par défaut.
- Les dernières données sont mises en cache pour l'usage hors ligne. Elles sont actualisées toutes les 15 min, ou quand tu tires la liste vers le bas.

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

- `src/core/normalize.ts` lit n'importe quel JSON et en extrait les événements (carte, condition, début, fin). Il accepte des horodatages, des dates ISO ou des heures quotidiennes `HH:MM`. Ces dernières sont interprétées en UTC et répétées sur 48 h.
- `src/core/html.ts` extrait d'une page web les données `__NEXT_DATA__`, les `<script type="application/json">`, les flux React Server Components et les tableaux HTML.
- `src/core/filter.ts` contient le filtrage, le tri et le formatage des comptes à rebours.
- `src/data/sources.ts` liste les sources et l'ordre de repli.

## Limites connues

Le format de la page officielle n'est pas documenté. Le parseur a été écrit pour être tolérant, mais **il n'a pas pu être testé contre la vraie page**, car elle n'était pas accessible depuis l'environnement de développement. Si l'app affiche « aucun événement trouvé », il faudra ajuster `normalize.ts` ou `html.ts` au format réel. Même chose si les heures sont décalées : les heures `HH:MM` sont supposées en UTC.
