# ps5bot : lire l'écran de la PS5 et piloter la manette

Le script regarde l'image de ta PS5 sur le PC et, selon ce qu'il voit, appuie
sur les boutons d'une **manette virtuelle** que la PS5 reçoit comme une vraie.

```
 PS5 ──Remote Play──► chiaki-ng (fenêtre sur le PC) ──capture──► ps5bot
  ▲                                                                │
  └────────── Remote Play ◄── chiaki-ng ◄── manette DS4 virtuelle ◄┘
```

Tu décris le comportement dans un fichier YAML, sous forme de règles :
« **quand** je vois cette image (ou cette couleur) à tel endroit → **faire**
ces actions à la manette ».

## 1. Installation (Windows)

1. **Python 3.10+** : <https://www.python.org/downloads/> (coche « Add to PATH »).
2. **chiaki-ng** (client Remote Play open source) :
   <https://github.com/streetpea/chiaki-ng/releases>. Lance-le, connecte-toi à
   ton compte PSN et associe ta PS5 (PS5 : *Paramètres → Système → Lecture
   à distance → Associer un appareil*). Vérifie que tu vois bien l'image du jeu.
3. Dans le dossier du projet :
   ```bat
   python -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```
   L'installation de `vgamepad` lance l'installeur du pilote **ViGEmBus** :
   accepte-le (il crée la manette virtuelle).
4. Copie `config.example.yaml` en `config.yaml`.

### Vérifier la manette virtuelle

Lance une session chiaki-ng, puis :
```bat
python -m ps5bot test-pad
```
Le curseur des menus de la PS5 doit bouger (bas, haut, droite, puis Rond).
Si rien ne se passe : dans chiaki-ng, vérifie dans les réglages de manette que
la manette virtuelle « Wireless Controller » est détectée. Débranche ta vraie
manette du PC si chiaki-ng la sélectionne à la place.

## 2. Apprendre au script ce qu'il doit reconnaître

1. Mets le jeu sur l'écran voulu, puis fais une capture :
   ```bat
   python -m ps5bot screenshot config.yaml
   ```
   → l'image est enregistrée dans `screenshots/` en 1280x720.
2. Découpe l'élément à reconnaître (une icône, un texte de bouton…) :
   ```bat
   python -m ps5bot crop screenshots\capture_XXXX.png -o templates\mon_bouton.png
   ```
   Sélectionne la zone à la souris puis ENTRÉE. Le script affiche les lignes
   `template:` et `region:` à copier dans `config.yaml`.
3. Vérifie la règle sur la capture, sans toucher à la manette :
   ```bat
   python -m ps5bot check config.yaml screenshots\capture_XXXX.png -o verif.png
   ```
   Il affiche le score de chaque condition (1.0 = identique) et dessine les zones
   dans `verif.png`. Fais aussi le test sur une capture où l'élément est
   **absent** pour t'assurer que la règle ne se déclenche pas.

Conseils pour une détection fiable :
- choisis un élément **fixe** de l'interface (pas le décor qui bouge) ;
- donne toujours une `region` petite autour de l'endroit attendu ;
- garde la même résolution de stream dans chiaki-ng (720p ou 1080p) ;
- ajuste `threshold` : 0.85 est un bon départ, monte si ça se déclenche à tort.

## 3. Lancer le bot

```bat
python -m ps5bot run config.yaml --dry-run --preview
```
`--dry-run` affiche les actions sans les envoyer, `--preview` ouvre une fenêtre
de debug (zones en vert = détecté, en rouge = non détecté ; touches **p** pause,
**s** capture, **q** quitter). Quand tout est bon, enlève `--dry-run` :

```bat
python -m ps5bot run config.yaml --preview
```

**Ctrl+C** arrête le bot et relâche tous les boutons.

## Écrire des règles

Voir `config.example.yaml`, commenté. En résumé :

| Condition | Exemple |
|---|---|
| Image | `template: templates/x.png`, `region: [x, y, w, h]`, `threshold: 0.85` |
| Couleur d'un pixel | `color: [R, G, B]`, `at: [x, y]`, `tolerance: 30` |
| Couleur d'une zone | `color: [R, G, B]`, `region: [...]`, `min_ratio: 0.5` |
| Combinaisons | liste (= toutes), `any: [...]`, `not: {...}` |

| Action | Exemple |
|---|---|
| Appui bref | `tap: cross` |
| Maintenir | `hold: {button: r2, duration: 2}` |
| Stick | `stick: {side: left, x: 0, y: -1, duration: 0.5}` (y = -1 vers le haut) |
| Gâchette analogique | `trigger: {side: l2, value: 0.5, duration: 1}` |
| Croix directionnelle | `dpad: down` |
| Pause | `wait: 0.5` |
| Répéter | `repeat: {times: 3, do: [...]}` |

Options d'une règle : `cooldown` (secondes entre deux déclenchements), `edge: true`
(une seule fois à chaque apparition), `stop: false` (continuer à évaluer les
règles suivantes), `enabled: false` (désactiver).

## Autres sources d'image

- **Carte d'acquisition HDMI** (Elgato…) : `source: {type: capture_card, device: 0}`.
  L'image vient alors de la carte, mais les commandes passent toujours par
  chiaki-ng / Remote Play (la PS5 n'accepte pas de manette « logicielle » en USB).
- **PS Remote Play officiel** : `window_title: "PS Remote Play"`. L'appli officielle
  n'accepte pas toujours les manettes virtuelles ; chiaki-ng est plus fiable.
- **Écran entier** : `type: monitor` ; **zone fixe** : `type: region`.
- **Fichiers** (tests sans PS5) : `type: file`, `path: screenshots/`.

## Tests

```bash
pip install pytest
python -m pytest
```

## ⚠️ Jeux en ligne

Automatiser un jeu en ligne est en général interdit par ses conditions
d'utilisation et peut entraîner un **bannissement du compte PSN**. Les jeux
détectent souvent les comportements trop réguliers. Utilise l'outil pour des
tâches de menu ou du contenu solo, à tes risques, et jamais pour prendre
l'avantage sur d'autres joueurs.
