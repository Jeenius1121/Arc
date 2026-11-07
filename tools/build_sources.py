#!/usr/bin/env python3
"""
Construit les fichiers « sources » factuels utilisés par build_data.py :

  tools/sources/maps-poi.json          zones de chaque carte (nom, position relative, types de butin, valeur)
  tools/sources/blueprint-reports.json  statistiques agrégées des signalements de plans (blueprints)

Ce script n'est à relancer que lorsque l'on veut rafraîchir ces relevés.
Usage :
  python3 -I tools/build_sources.py <dossier_ext> <dossier_arcraiders-data>

<dossier_ext> doit contenir :
  tyler_maps.json   positions relatives des zones (0..1) + types de butin
  stig_maps.json    niveau de valeur (Red/Yellow) des zones tel qu'affiché sur la carte du jeu
  lootzones.json    relevé complémentaire (valeur high/medium)
  bp_atlas.csv      signalements communautaires de plans trouvés
"""
import csv
import json
import os
import re
import sys
from collections import Counter, defaultdict

EXT, RAID = sys.argv[1], sys.argv[2]
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "sources")
os.makedirs(OUT, exist_ok=True)


def norm(s):
    s = (s or "").lower().replace("&", "and").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", " ", s).strip()
    return re.sub(r"^the ", "", s)


# ---------------------------------------------------------------- cartes / zones
TYLER_TO_ID = {
    "dam-battlegrounds": "dam",
    "buried-city": "buried_city",
    "spaceport": "spaceport",
    "the-blue-gate": "blue_gate",
    "riven-tides": "riven_tides",
    "stella-montis": "stella_montis",
    "pendola-pass": "pendola_pass",
}
STIG_TO_ID = {"Dam": "dam", "Buried": "buried_city", "Space": "spaceport", "Blue": "blue_gate", "Stella": "stella_montis"}
LZ_TO_ID = {"dam": "dam", "buried-city": "buried_city", "pendola-pass": "pendola_pass"}
# alias de noms entre relevés
ALIAS = {
    ("spaceport", "trench tower"): ["north trench tower", "south trench tower"],
    ("spaceport", "control tower"): ["control tower a6"],
    ("dam", "research and administration"): ["research and administration"],
}

tyler = json.load(open(os.path.join(EXT, "tyler_maps.json")))
stig = json.load(open(os.path.join(EXT, "stig_maps.json")))
lz = json.load(open(os.path.join(EXT, "lootzones.json")))

maps = {}
for m in tyler["maps"]:
    mid = TYLER_TO_ID.get(m["id"])
    if not mid:
        continue
    maps[mid] = {
        "id": mid,
        "nameEn": m["name"],
        "difficulty": m.get("difficulty"),
        "length": m.get("length"),
        "pois": [
            {
                "name": r["name"],
                "x": round(r["x"], 4),
                "y": round(r["y"], 4),
                "tags": [("ARC" if t.lower() == "arc" else t) for t in r.get("areaTypes", [])],
                "tier": None,
            }
            for r in m.get("rooms", [])
        ],
    }

TIER = {"Red": "high", "Yellow": "medium"}
for key, block in stig.items():
    mid = STIG_TO_ID[key]
    pois = maps[mid]["pois"]
    for name, info in block["locations"].items():
        if name == "None":
            continue
        tags = [("ARC" if t.lower() == "arc" else t) for t in info.get("category", [])]
        tier = TIER.get(info.get("tier"))
        targets = ALIAS.get((mid, norm(name)), [norm(name)])
        found = False
        for p in pois:
            if norm(p["name"]) in targets:
                found = True
                if tier:
                    p["tier"] = tier
                if not p["tags"]:
                    p["tags"] = tags
        if not found:
            # zone connue sans position (ex. niveau supérieur de Stella Montis)
            pois.append({"name": name if name != "Pilgrims Peak" else "Pilgrim's Peak", "x": None, "y": None, "tags": tags, "tier": tier})

for key, zones in lz["maps"].items():
    mid = LZ_TO_ID[key]
    for z in zones:
        for p in maps[mid]["pois"]:
            if norm(p["name"]) == norm(z["name"]) and z.get("value") and not p["tier"]:
                p["tier"] = z["value"]

# corrections de noms d'affichage
for p in maps["stella_montis"]["pois"]:
    if p["name"] == "Research And Administration":
        p["name"] = "Research & Administration"

json.dump({"_source": "Relevés communautaires de la carte du jeu (types de butin affichés sous chaque zone, niveau de valeur, positions relatives).", "maps": maps},
          open(os.path.join(OUT, "maps-poi.json"), "w"), ensure_ascii=False, indent=1)
print("maps-poi.json :", {k: len(v["pois"]) for k, v in maps.items()})

# ---------------------------------------------------------------- signalements de plans
item_ids = {f[:-5] for f in os.listdir(os.path.join(RAID, "items")) if f.endswith(".json")}


def bp_id(name):
    s = name.lower().replace("mk. 3", "mk3").replace("magazine", "mag").replace("gunparts", "gun parts").replace("'", "")
    s = re.sub(r"[^a-z0-9]+", "_", s).strip("_")
    cand = s + "_blueprint"
    return cand if cand in item_ids else None


MAPFIELD = [
    ("dam battlegrounds", "dam"), ("buried city", "buried_city"), ("spaceport", "spaceport"),
    ("blue gate", "blue_gate"), ("stella montis", "stella_montis"), ("riven tides", "riven_tides"), ("pendola", "pendola_pass"),
]


def parse_map(v):
    v = (v or "").lower()
    if "stella montis the blue gate" in v:
        return None, None
    mid = next((i for k, i in MAPFIELD if k in v), None)
    cond = "night" if "night" in v else "storm" if "storm" in v else "bunker" if "bunker" in v else "day" if "day" in v else None
    return mid, cond


CONT = [
    (r"surve?y", "arpenteur"), (r"raider?s? ca[cs]", "cache_raider"), (r"breach|square box", "breach"),
    (r"weapon|gun case|rifle", "caisse_arme"), (r"ammo|grenade|metal crate", "caisse_munitions"),
    (r"med(ical)? ?bag|medkit|first aid", "sac_medical"), (r"red locker|security locker", "casier_rouge"),
    (r"locker", "casier"), (r"suitcase|luggage", "valise"), (r"backpack|\bbag\b", "sac"),
    (r"trash|dumpster|bin\b", "poubelle"), (r"computer|server|android", "electronique"),
    (r"black box", "boite_noire"), (r"car|vehicle|trunk|hood", "vehicule"),
    (r"drawer|dresser|nightstand", "tiroir"), (r"cabinet|cupboard|wardrobe|closet|shelf", "armoire"),
    (r"desk|table", "bureau"), (r"crate|box|chest", "caisse"),
]


def parse_cont(v):
    v = (v or "").lower().strip()
    if v in ("", "yes", "no", "?", "n/a"):
        return None
    for rx, k in CONT:
        if re.search(rx, v):
            return k
    return "autre"


POI_ALIAS = {
    "research and admin": "research and administration", "ruby apartments": "ruby residence", "ruby residences": "ruby residence",
    "space travel building": "space travel", "space travel agency": "space travel", "townhall": "town hall",
    "scrapyard": "scrap yard", "plaza rosa pharmacy": "plaza rosa", "plaza roza": "plaza rosa", "pilgrims peak": "pilgrims peak",
    "water treatment": "water treatment control", "power generation": "power generation complex",
}


def parse_poi(mid, v):
    if not mid or not v:
        return None
    t = norm(v)
    for a, b in POI_ALIAS.items():
        if a in t:
            t = t.replace(a, b)
    best = None
    for p in maps[mid]["pois"]:
        n = norm(p["name"])
        if n and n in t and (best is None or len(n) > len(norm(best))):
            best = p["name"]
    if not best and mid == "spaceport" and "control tower" in t:
        best = "Control Tower A6"
    return best


rows = list(csv.DictReader(open(os.path.join(EXT, "bp_atlas.csv"), encoding="utf-8")))
agg = defaultdict(lambda: {"n": 0, "maps": Counter(), "cond": Counter(), "room": Counter(), "cont": Counter(), "poi": Counter(), "trials": False, "quest": None, "only": None})
unmatched = Counter()
for r in rows:
    bid = bp_id(r["BlueprintName"])
    if not bid:
        unmatched[r["BlueprintName"]] += 1
        continue
    a = agg[bid]
    if r.get("QuestReward") is not None:  # ligne de synthèse
        if (r.get("TrialsReward") or "").strip().lower() == "yes":
            a["trials"] = True
        q = (r.get("QuestReward") or "").strip()
        if q and q.lower() not in ("no", "?", "n/a"):
            a["quest"] = q
        mid, _ = parse_map(r["Map"])
        if mid:
            a["only"] = mid
        continue
    mid, cond = parse_map(r["Map"])
    if not mid:
        continue
    a["n"] += 1
    a["maps"][mid] += 1
    if cond:
        a["cond"][cond] += 1
    rm = (r.get("MapCondition") or "").lower()
    a["room"]["normal" if rm.startswith("no") else "key" if "key room" in rm else "breach" if "breach" in rm else "unknown"] += 1
    c = parse_cont(r.get("Scavengable"))
    if c:
        a["cont"][c] += 1
    p = parse_poi(mid, r.get("Containers"))
    if p:
        a["poi"][mid + "|" + p] += 1

out = {}
for bid, a in sorted(agg.items()):
    out[bid] = {
        "n": a["n"],
        "maps": dict(a["maps"].most_common()),
        "cond": dict(a["cond"]),
        "room": {k: v for k, v in a["room"].items() if k != "unknown"},
        "cont": a["cont"].most_common(6),
        "poi": [[k.split("|")[0], k.split("|")[1], v] for k, v in a["poi"].most_common(8)],
        "trials": a["trials"],
        "quest": a["quest"],
        "only": a["only"],
    }
total = sum(v["n"] for v in out.values())
json.dump({"_source": "Agrégat de signalements communautaires de plans trouvés (carte, moment, type de salle, conteneur, zone).", "totalReports": total, "blueprints": out},
          open(os.path.join(OUT, "blueprint-reports.json"), "w"), ensure_ascii=False, indent=1)
print("blueprint-reports.json :", len(out), "plans,", total, "signalements ; non reconnus :", dict(unmatched))
