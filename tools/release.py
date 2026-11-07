#!/usr/bin/env python3
"""
Publie une nouvelle version de Tracker : met à jour le numéro partout pour que les
téléphones détectent la mise à jour et affichent le bandeau.

Usage :
  python3 tools/release.py 1.1.0 "Nouveauté 1" "Nouveauté 2"

Fichiers modifiés :
  version.json           (lu par l'app pour détecter la nouvelle version)
  assets/js/version.js   (version embarquée dans l'app)
  sw.js                  (nom du cache → nouveau service worker)
Ensuite : git commit + git push sur la branche Tracker.
"""
import json
import os
import re
import sys
from datetime import date

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if len(sys.argv) < 2 or not re.fullmatch(r"\d+\.\d+\.\d+", sys.argv[1]):
    sys.exit(__doc__)
version, notes = sys.argv[1], sys.argv[2:]

vj = os.path.join(ROOT, "version.json")
old = json.load(open(vj, encoding="utf-8"))
if tuple(map(int, version.split("."))) <= tuple(map(int, old["version"].split("."))):
    sys.exit(f"La version {version} doit être supérieure à {old['version']}.")
json.dump({"version": version, "date": str(date.today()), "notes": notes or ["Améliorations et corrections"]},
          open(vj, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


def sub(path, pattern, repl):
    p = os.path.join(ROOT, path)
    s = open(p, encoding="utf-8").read()
    s2, n = re.subn(pattern, repl, s, count=1)
    if not n:
        sys.exit(f"Motif introuvable dans {path}")
    open(p, "w", encoding="utf-8").write(s2)


sub("assets/js/version.js", r"APP_VERSION = '[^']+'", f"APP_VERSION = '{version}'")
sub("sw.js", r"const VERSION = '[^']+'", f"const VERSION = '{version}'")
print(f"Tracker {old['version']} → {version}. Commitez et poussez sur la branche Tracker : les apps afficheront le bandeau.")
