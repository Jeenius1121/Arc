# TRACKER — Raider Companion

> « Dis-moi ce qu'il te manque. Je te dis où aller. »

Application mobile (PWA installable) pour les joueurs d'**ARC Raiders**. Tu choisis ce qu'il te manque
(un matériau, un schéma, une pièce ARC, une arme à fabriquer) et Tracker te donne :

- la **meilleure méthode** (fouille, chasse d'ARC, quête, fabrication, achat, recyclage) ;
- la **carte conseillée**, avec le classement de toutes les cartes ;
- les **zones conseillées** (types de butin, valeur rouge/jaune) sur un **plan tactique animé** avec **itinéraire numéroté** ;
- les **étapes à suivre** (préparation, carte, itinéraire, conteneurs à fouiller, ARC à abattre, plan B, extraction) ;
- un **indice de chance** estimé ;
- pour les **schémas** : où la communauté les trouve (2 309 signalements), de jour ou de nuit, dans quels conteneurs et quelles zones ;
- pour les **armes** : paliers I → IV, matériaux cumulés, schéma et niveau d'atelier requis, **plan de raids** ;
- **Ma liste** : plusieurs objectifs fusionnés en un seul plan de raids, avec suivi de ce que tu possèdes ;
- **Garder / recycler / vendre** pour chaque objet, atelier, bestiaire ARC, conditions de carte, quêtes.

Tout est en français et fonctionne **hors-ligne** une fois installé.

## Installer sur un téléphone

1. Ouvre l'adresse de l'app (GitHub Pages, voir ci-dessous) sur ton téléphone.
2. **Android / Chrome** : menu ⋮ → *Installer l'application*.
   **iPhone / Safari** : bouton *Partager* → *Sur l'écran d'accueil*.

## Mises à jour intégrées

L'app compare sa version à `version.json` au démarrage, toutes les 5 minutes et à chaque retour au premier plan.
Si une version plus récente est publiée, un **bandeau orange apparaît en haut de l'écran** :
un toucher télécharge la nouvelle version, l'installe et relance l'app (puis affiche les nouveautés).

Publier une nouvelle version :

```bash
python3 tools/release.py 1.1.0 "Nouveauté 1" "Nouveauté 2"
git commit -am "Tracker 1.1.0" && git push origin Tracker
```

## Mise en ligne (GitHub Pages)

Dans le dépôt GitHub : **Settings → Pages → Build and deployment → Source : Deploy from a branch →
Branch : `Tracker` / `(root)` → Save**. L'app est ensuite servie à `https://<utilisateur>.github.io/<dépôt>/`.

## Structure

```
index.html, manifest.webmanifest, sw.js, version.json   coque PWA + service worker + version publiée
assets/css/app.css                                     design
assets/js/                                             app (modules ES, sans dépendance ni build)
  data.js  engine.js  mapsvg.js  update.js  store.js  ui.js  icons.js  version.js
  views/   home, item, craft, maps, list, more
data/db.json                                           base embarquée (générée)
tools/build_sources.py                                 relevés zones + signalements de schémas → tools/sources/
tools/build_data.py                                    génère data/db.json
tools/release.py                                       publie une nouvelle version
```

Régénérer les données :

```bash
git clone --depth 1 https://github.com/RaidTheory/arcraiders-data /tmp/arcraiders-data
python3 -I tools/build_data.py /tmp/arcraiders-data
```

## Sources & crédits

- Objets, recettes, ARC, quêtes, atelier, marchands : [RaidTheory/arcraiders-data](https://github.com/RaidTheory/arcraiders-data) (MIT) — [arctracker.io](https://arctracker.io).
- Zones, types de butin et positions relatives : relevés communautaires de la carte du jeu. Signalements de schémas : agrégés à partir de relevés communautaires.
- Polices Chakra Petch et Barlow : SIL Open Font License (voir `assets/fonts/`).
- Icônes, logo et plans schématiques : créations originales de Tracker.

ARC Raiders est une marque d'Embark Studios AB. Tracker est un projet de fans, **non officiel**, non affilié à
Embark Studios et non approuvé par eux. Les noms et contenus du jeu appartiennent à leurs propriétaires.
Les indices de chance sont des estimations : le butin du jeu reste aléatoire.
