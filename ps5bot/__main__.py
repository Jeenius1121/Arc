"""Point d'entrée : python -m ps5bot <commande> ...

Commandes :
  run         lance le bot (lit l'écran, applique les règles, pilote la manette)
  screenshot  enregistre l'image actuelle (à la résolution de référence)
  crop        découpe un modèle dans une capture et affiche la zone [x, y, w, h]
  check       teste les règles sur une image enregistrée, sans rien envoyer
  test-pad    appuie sur quelques boutons pour vérifier la manette virtuelle
"""

from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime
from pathlib import Path

import cv2
import yaml

from .capture import create_source
from .controller import DryRunController, create_controller
from .rules import Engine, Rule, evaluate, iter_leaves, run_actions
from .vision import TemplateCache


def load_config(path: str) -> tuple[dict, list[Rule], TemplateCache]:
    cfg_path = Path(path)
    with open(cfg_path, encoding="utf-8") as fh:
        cfg = yaml.safe_load(fh) or {}
    rules = [Rule.from_dict(r) for r in cfg.get("rules", [])]
    # Les chemins des modèles sont relatifs au dossier du fichier de config.
    cfg["_base_dir"] = cfg_path.resolve().parent
    templates = TemplateCache(cfg["_base_dir"])
    return cfg, rules, templates


# --------------------------------------------------------------------------- #
# Affichage de debug
# --------------------------------------------------------------------------- #

def draw_overlay(frame, detections, paused: bool, fps: float):
    view = frame.copy()
    y = 20
    for name, det in detections.items():
        color = (0, 200, 0) if det.ok else (0, 0, 255)
        for leaf in iter_leaves(det):
            if leaf.box:
                x, by, w, h = leaf.box
                cv2.rectangle(view, (x, by), (x + w, by + h), color, 2)
        scores = ", ".join(f"{leaf.label}={leaf.score:.2f}" for leaf in iter_leaves(det))
        cv2.putText(view, f"{'OK ' if det.ok else '-- '}{name}: {scores}", (10, y),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1, cv2.LINE_AA)
        y += 20
    status = "PAUSE (p pour reprendre)" if paused else f"{fps:.1f} img/s  [p]ause [s]capture [q]uitter"
    cv2.putText(view, status, (10, view.shape[0] - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6,
                (0, 255, 255), 2, cv2.LINE_AA)
    return view


def save_frame(frame, out_dir: str = "screenshots") -> Path:
    out = Path(out_dir)
    out.mkdir(parents=True, exist_ok=True)
    path = out / f"capture_{datetime.now():%Y%m%d_%H%M%S_%f}.png"
    cv2.imwrite(str(path), frame)
    return path


# --------------------------------------------------------------------------- #
# Commandes
# --------------------------------------------------------------------------- #

def cmd_run(args) -> int:
    cfg, rules, templates = load_config(args.config)
    if not rules:
        print("Aucune règle dans la configuration.")
        return 1
    pad = DryRunController() if args.dry_run else create_controller(cfg.get("controller", "virtual_ds4"))
    source = create_source(cfg.get("source", {}), cfg["_base_dir"])
    engine = Engine(rules, templates, pad)
    fps_target = float(args.fps or cfg.get("fps", 10))
    period = 1.0 / fps_target
    preview = args.preview or cfg.get("preview", False)

    delay = float(cfg.get("start_delay", 3))
    print(f"{len(rules)} règle(s) chargée(s). Démarrage dans {delay:.0f} s — Ctrl+C pour arrêter.")
    time.sleep(delay)

    paused = False
    measured_fps = 0.0
    try:
        while True:
            t0 = time.monotonic()
            frame = source.grab()
            if frame is None:
                time.sleep(0.5)
                continue
            detections = {}
            if not paused:
                _, detections = engine.step(frame)
            if preview:
                cv2.imshow("ps5bot", draw_overlay(frame, detections, paused, measured_fps))
                key = cv2.waitKey(1) & 0xFF
                if key == ord("q"):
                    break
                if key == ord("p"):
                    paused = not paused
                    pad.reset()
                    print("Pause." if paused else "Reprise.")
                if key == ord("s"):
                    print(f"Capture enregistrée : {save_frame(frame)}")
            elapsed = time.monotonic() - t0
            if elapsed < period:
                time.sleep(period - elapsed)
            measured_fps = 1.0 / max(time.monotonic() - t0, 1e-6)
    except KeyboardInterrupt:
        print("\nArrêt demandé.")
    finally:
        pad.close()
        source.close()
        if preview:
            cv2.destroyAllWindows()
        print("Bilan :")
        for rule in rules:
            print(f"  {rule.name}: {rule.fired_count} déclenchement(s)")
    return 0


def cmd_screenshot(args) -> int:
    cfg, _, _ = load_config(args.config)
    source = create_source(cfg.get("source", {}), cfg["_base_dir"])
    try:
        for i in range(args.count):
            if i:
                time.sleep(args.interval)
            frame = None
            for _ in range(20):  # la carte d'acquisition peut renvoyer des images vides au début
                frame = source.grab()
                if frame is not None:
                    break
                time.sleep(0.1)
            if frame is None:
                print("Aucune image reçue (fenêtre introuvable ? carte non branchée ?).")
                return 1
            print(f"Capture enregistrée : {save_frame(frame, args.output)}")
    finally:
        source.close()
    return 0


def cmd_crop(args) -> int:
    img = cv2.imread(args.image)
    if img is None:
        print(f"Impossible de lire {args.image}")
        return 1
    print("Sélectionne la zone à la souris puis appuie sur ENTRÉE (ou C pour annuler).")
    x, y, w, h = cv2.selectROI("Découper un modèle", img, showCrosshair=True)
    cv2.destroyAllWindows()
    if w == 0 or h == 0:
        print("Annulé.")
        return 1
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(out), img[y:y + h, x:x + w])
    pad = args.margin
    b, g, r = (int(v) for v in img[y + h // 2, x + w // 2])
    print(f"Modèle enregistré : {out}")
    print("À copier dans ta config :")
    print(f"    template: {out.as_posix()}")
    print(f"    region: [{max(0, x - pad)}, {max(0, y - pad)}, {w + 2 * pad}, {h + 2 * pad}]"
          f"   # zone de recherche (marge de {pad} px)")
    print(f"Couleur au centre de la sélection : color: [{r}, {g}, {b}]  at: [{x + w // 2}, {y + h // 2}]")
    return 0


def cmd_check(args) -> int:
    cfg, rules, templates = load_config(args.config)
    size = tuple(cfg.get("source", {}).get("size", (1280, 720)))
    frame = cv2.imread(args.image)
    if frame is None:
        print(f"Impossible de lire {args.image}")
        return 1
    if (frame.shape[1], frame.shape[0]) != size:
        frame = cv2.resize(frame, size, interpolation=cv2.INTER_AREA)
    detections = {}
    for rule in rules:
        det = evaluate(rule.when, frame, templates)
        detections[rule.name] = det
        print(f"{'DÉCLENCHE' if det.ok else 'non      '}  {rule.name}")
        for leaf in iter_leaves(det):
            print(f"             {leaf.label}: score={leaf.score:.3f} {'OK' if leaf.ok else '--'} zone={leaf.box}")
    if args.output:
        cv2.imwrite(args.output, draw_overlay(frame, detections, False, 0))
        print(f"Image annotée : {args.output}")
    return 0


def cmd_test_pad(args) -> int:
    pad = DryRunController() if args.dry_run else create_controller("virtual_ds4")
    print("Manette virtuelle créée. Test dans 3 s (laisse la fenêtre chiaki-ng visible)...")
    time.sleep(3)
    sequence = [
        {"dpad": "down"}, {"wait": 0.4}, {"dpad": "up"}, {"wait": 0.4},
        {"stick": {"side": "left", "x": 1, "y": 0, "duration": 0.3}}, {"wait": 0.4},
        {"tap": "circle"},
    ]
    try:
        run_actions(sequence, pad)
    finally:
        pad.close()
    print("Terminé. Si la PS5 a réagi, tout fonctionne.")
    return 0


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(prog="ps5bot", description="Lit l'écran de la PS5 et pilote la manette.")
    sub = parser.add_subparsers(dest="command", required=True)

    p = sub.add_parser("run", help="Lancer le bot")
    p.add_argument("config")
    p.add_argument("--dry-run", action="store_true", help="n'envoie rien à la manette, affiche seulement")
    p.add_argument("--preview", action="store_true", help="fenêtre de debug avec les détections")
    p.add_argument("--fps", type=float, help="images analysées par seconde")
    p.set_defaults(func=cmd_run)

    p = sub.add_parser("screenshot", help="Enregistrer une capture")
    p.add_argument("config")
    p.add_argument("-o", "--output", default="screenshots")
    p.add_argument("-n", "--count", type=int, default=1)
    p.add_argument("--interval", type=float, default=1.0)
    p.set_defaults(func=cmd_screenshot)

    p = sub.add_parser("crop", help="Découper un modèle dans une capture")
    p.add_argument("image")
    p.add_argument("-o", "--output", default="templates/modele.png")
    p.add_argument("--margin", type=int, default=20, help="marge autour de la zone de recherche")
    p.set_defaults(func=cmd_crop)

    p = sub.add_parser("check", help="Tester les règles sur une image")
    p.add_argument("config")
    p.add_argument("image")
    p.add_argument("-o", "--output", help="enregistrer l'image annotée")
    p.set_defaults(func=cmd_check)

    p = sub.add_parser("test-pad", help="Tester la manette virtuelle")
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(func=cmd_test_pad)

    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
