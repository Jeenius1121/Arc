#!/usr/bin/env python3
"""
Génère data/db.json, la base de données embarquée dans l'application Tracker.

Usage :
  python3 -I tools/build_data.py <dossier arcraiders-data>

Sources :
  - RaidTheory/arcraiders-data (MIT) : objets, recettes, recyclage, ARC, quêtes, atelier, projets, marchands
  - tools/sources/maps-poi.json : zones des cartes (types de butin, valeur, position relative)
  - tools/sources/blueprint-reports.json : statistiques des signalements de plans
Les textes de stratégie (descriptions de cartes, conseils, événements) sont rédigés pour Tracker.
"""
import json
import os
import subprocess
import sys
from datetime import date

RAID = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def L(*p):
    return json.load(open(os.path.join(RAID, *p), encoding="utf-8"))


def fr(o, fallback=""):
    if isinstance(o, dict):
        return o.get("fr") or o.get("en") or fallback
    return o or fallback


# ------------------------------------------------------------------ dictionnaires FR
TYPE_FR = {
    "Recyclable": "Recyclable", "Blueprint": "Plan", "Trinket": "Babiole", "Quick Use": "Utilisation rapide",
    "Key": "Clé", "Modification": "Accessoire d'arme", "Topside Material": "Matériau de surface",
    "Assault Rifle": "Fusil d'assaut", "Augment": "Augmentation", "SMG": "Pistolet-mitrailleur", "Pistol": "Pistolet",
    "Nature": "Nature", "Refined Material": "Matériau raffiné", "Special": "Spécial", "Shotgun": "Fusil à pompe",
    "Battle Rifle": "Fusil de combat", "Ammunition": "Munitions", "Sniper Rifle": "Fusil de précision",
    "LMG": "Mitrailleuse légère", "Basic Material": "Matériau de base", "Hand Cannon": "Canon de poing",
    "Shield": "Bouclier", "Misc": "Divers",
}
WEAPON_TYPES = {"Assault Rifle", "SMG", "Pistol", "Shotgun", "Battle Rifle", "Sniper Rifle", "LMG", "Hand Cannon", "Special"}

BENCH_FR = {"in_raid": "En raid", "workbench": "Établi"}
for f in os.listdir(os.path.join(RAID, "hideout")):
    h = L("hideout", f)
    BENCH_FR[h["id"]] = fr(h["name"])

MAP_ID = {
    "dam_battlegrounds": "dam", "the_spaceport": "spaceport", "buried_city": "buried_city", "the_blue_gate": "blue_gate",
    "stella_montis_upper": "stella_montis", "stella_montis_lower": "stella_montis", "riven_tides": "riven_tides",
}

MAP_META = {
    "dam": {
        "n": "Le Barrage", "full": "Champ de bataille du Barrage", "hue": 28,
        "desc": "Centrale hydroélectrique au milieu de marais pollués. La carte la plus accessible : idéale pour débuter, "
                "farmer les composants de base et chasser l'ARC. Seule carte où apparaît la Matriarche.",
        "strengths": ["Industriel", "Mécanique", "Technologique", "ARC"],
        "events": ["night-raid", "electromagnetic-storm", "matriarch", "harvester"],
    },
    "buried_city": {
        "n": "Ville Enfouie", "full": "Ville Enfouie", "hue": 42,
        "desc": "Ruines ensablées d'une ville italienne : appartements, hôpital, bibliothèque, commerces. La reine du "
                "Résidentiel, du Médical, du Commercial et de l'Ancien Monde. Très riche en plans la nuit.",
        "strengths": ["Résidentiel", "Médical", "Commercial", "Ancien Monde"],
        "events": ["night-raid", "electromagnetic-storm", "bird-city"],
    },
    "spaceport": {
        "n": "Port Spatial", "full": "Port Spatial d'Acerra", "hue": 200,
        "desc": "Ancien site de lancement : hangars, tours de lancement, parcs à conteneurs. Le meilleur endroit pour "
                "l'Industriel, le Mécanique, l'Exode et le Technologique.",
        "strengths": ["Industriel", "Mécanique", "Exode", "Technologique"],
        "events": ["night-raid", "electromagnetic-storm", "launch-tower-loot", "hidden-bunker", "harvester"],
    },
    "blue_gate": {
        "n": "Portail Bleu", "full": "Le Portail Bleu", "hue": 215,
        "desc": "Col de montagne autour d'un ancien poste-frontière : village, fort, entrepôts et dizaines de véhicules "
                "à fouiller. Excellent pour l'Industriel (Engrenages rouillés), la Nature et l'Ancien Monde.",
        "strengths": ["Industriel", "Mécanique", "Nature", "Ancien Monde"],
        "events": ["night-raid", "electromagnetic-storm", "locked-gate", "harvester"],
    },
    "stella_montis": {
        "n": "Stella Montis", "full": "Stella Montis", "hue": 185,
        "desc": "Centre de recherche enfoui sous la neige, sur deux niveaux. Petit, très dense en butin et en combats "
                "rapprochés. Excellent pour le Technologique, le Médical et les pièces d'armes.",
        "strengths": ["Technologique", "Médical", "Ancien Monde", "Électrique"],
        "events": ["night-raid", "electromagnetic-storm"],
    },
    "riven_tides": {
        "n": "Riven Tides", "full": "Riven Tides", "hue": 175,
        "desc": "Station balnéaire et port de commerce abandonnés. Carte la plus exigeante : grues, conteneurs, "
                "douane et hôtel. Bonne pour l'Industriel et l'Exode.",
        "strengths": ["Industriel", "Exode", "Résidentiel"],
        "events": ["beachcombing", "hurricane"],
    },
    "pendola_pass": {
        "n": "Pendola Pass", "full": "Pendola Pass", "hue": 265,
        "desc": "Observatoire de haute montagne relié par le rail. Gros potentiel Exode autour du télescope et de "
                "l'observatoire, Industriel/Mécanique autour de la gare de triage.",
        "strengths": ["Exode", "Industriel", "Mécanique", "Ancien Monde"],
        "events": [],
    },
}
MAP_ORDER = ["dam", "buried_city", "spaceport", "blue_gate", "stella_montis", "riven_tides", "pendola_pass"]

# noms français : officiels (tirés des textes de quêtes du jeu) quand ils existent, sinon traduction Tracker
POI_FR = {
    "dam": {
        "West Broken Bridge": "Pont effondré ouest", "Pattern House": "Maison aux motifs", "Ruby Residence": "Résidence Ruby",
        "Pale Apartments": "Appartements Pale", "Ben Welder's Sunroof": "Véranda de Ben Welder", "Generator Hall": "Hall des générateurs",
        "Power Generation Complex": "Complexe de production électrique", "Controlled Access Zone": "Zone à accès restreint",
        "Hydroponic Dome Complex": "Complexe de dômes hydroponiques", "Pipeline Tower": "Tour du pipeline", "The Breach": "La Brèche",
        "Old Battleground": "Ancien champ de bataille", "Floodgates": "Vannes", "Water Treatment Control": "Contrôle du traitement de l'eau",
        "South Swamp Outpost": "Avant-poste du marécage du sud", "Primary Facility": "Installation principale", "Control Tower": "Tour de contrôle",
        "Research & Administration": "Bâtiment de recherche et administration", "Red Lakes Balcony": "Balcon des Lacs rouges",
        "Electrical Substation": "Sous-station électrique", "Small Creek": "Petit ruisseau", "Testing Annex": "Annexe d'essais",
        "Water Towers": "Châteaux d'eau", "Wreckage": "Épave", "Scrap Yard": "Dépôt de ferraille", "Formicai Outpost": "Avant-poste de Formicai",
    },
    "buried_city": {
        "Hospital": "Hôpital", "Library": "Bibliothèque", "Space Travel": "Bureau des voyages spatiaux", "Research": "Recherche",
        "Town Hall": "Hôtel de ville", "Piazza Arbusto": "Piazza Arbusto", "Grandioso Apartments": "Appartements Grandioso",
        "Santa Maria Houses": "Résidences Santa Maria", "Plaza Rosa": "Plaza Rosa", "Galleria": "Galleria", "Marano Park": "Parc Marano",
        "Parking Garage": "Parc de stationnement", "Red Tower": "Tour rouge",
    },
    "spaceport": {
        "Fuel Depot": "Dépôt de carburant", "West Hangar": "Hangar ouest", "West Container Yard": "Parc à conteneurs ouest",
        "Jiangsu Warehouse": "Entrepôt Jiangsu", "Shipping Warehouse": "Entrepôt d'expédition", "East Hangar": "Hangar est",
        "North Trench Tower": "Tour de tranchée nord", "South Trench Tower": "Tour de tranchée sud", "The Trench": "La Tranchée",
        "Car Park": "Parking", "Arrival Building": "Bâtiment d'arrivée", "Little Hangar": "Petit hangar", "Water Towers": "Châteaux d'eau",
        "Fuel Control": "Bâtiment de régulation du carburant", "Launch Towers": "Tours de lancement", "East Container Yard": "Parc à conteneurs est",
        "Rocket Assembly": "Site d'assemblage des fusées", "Departure Building": "Bâtiment des départs", "Fuel Processing": "Traitement du carburant",
        "Fuel Lines": "Conduites de carburant", "Control Tower A6": "Tour de contrôle A6", "Container Storage": "Entrepôt de conteneurs",
        "Vehicle Maintenance": "Maintenance des véhicules", "Fuel Storage": "Stockage de carburant", "Maintenance Hangar": "Hangar de maintenance",
        "Staff Parking": "Parking du personnel", "Security Checkpoint": "Point de contrôle de sécurité",
    },
    "blue_gate": {
        "Village": "Village", "Barren Clearing": "Clairière aride", "Raider's Refuge": "Refuge des Raiders", "Reinforced Reception": "Réception renforcée",
        "Data Vault": "Salle de données", "Headhouse": "Bâtiment de tête", "Pilgrim's Peak": "Pic Pèlerin", "Trapper's Glade": "Clairière du trappeur",
        "Outer Gates": "Portes extérieures", "Warehouse Complex": "Complexe d'entrepôts", "Gate Control Room": "Salle de contrôle du portail",
        "Abandoned Housing Project": "Projet de logement abandonné", "Adorned Wreckage": "Décombres décorés", "Checkpoint": "Poste de contrôle",
        "Ridgeline": "Crête", "Maintenance Bunker": "Bunker de maintenance", "Highway Collapse": "Autoroute effondrée", "Broken Earth": "Crevasses",
        "Olive Grove": "Oliveraie", "Ruined Homestead": "Ferme en ruine", "Ancient Fort": "Fort ancien",
    },
    "riven_tides": {
        "Wavebreaker": "Brise-lames", "Seabed": "Fonds marins", "Port Authority Building": "Capitainerie", "Wreckage": "Épave",
        "Azzurro Beach": "Plage Azzurro", "Stacking Yard": "Aire d'empilement", "Hotel Panorama Azzurro": "Hôtel Panorama Azzurro",
        "Transfer Depot": "Dépôt de transfert", "Weighing Checkpoint": "Poste de pesage", "Customs House": "Douane", "Tennis Court": "Court de tennis",
    },
    "stella_montis": {
        "Collapsed Tunnel": "Tunnel effondré", "Western Tunnel": "Tunnel ouest", "Lobby Metro": "Métro du Hall",
        "Robotic Sandbox A": "Bac à sable robotique A", "Logistics Admin": "Administration logistique", "Loading Bay": "Quai de chargement",
        "Sandbox": "Bac à sable", "Control Room": "Salle de contrôle", "Robotic Sandbox B": "Bac à sable robotique B", "Eastern Tunnel": "Tunnel est",
        "Seed Vault": "Coffre à graines", "Assembly": "Chaîne d'assemblage", "Assembly Workshops": "Ateliers d'assemblage", "Atrium": "Atrium",
        "Business Center": "Centre d'affaires", "Communications": "Communications", "Cultural Archives": "Archives culturelles", "Lobby": "Hall",
        "Medical Research": "Zone de recherche médicale", "Red Checkpoint": "Poste de contrôle rouge",
    },
    "pendola_pass": {
        "Deep-Space Telescope": "Télescope d'espace lointain", "Cielo Sereno Observatory": "Observatoire Cielo Sereno",
        "Almatera Station": "Gare d'Almatera", "Railroad Junction": "Embranchement ferroviaire", "Fallen Emperor": "L'Empereur déchu",
        "Commissary Supermarket": "Supermarché de l'économat", "Railyard": "Gare de triage", "Old Town": "Vieille ville",
        "Loading Platforms": "Quais de chargement", "Old Hamlet": "Vieux hameau",
    },
}

EVENT_META = {
    "night-raid": ("Raid nocturne", "Carte plongée dans la nuit : visibilité réduite mais butin de meilleure valeur. "
                   "Les joueurs signalent bien plus de plans de nuit (×2,4 à la Ville Enfouie)."),
    "electromagnetic-storm": ("Tempête électromagnétique", "Éclairs et perturbations sur toute la carte ; butin de plus grande valeur. "
                              "Restez à couvert pendant les impacts."),
    "locked-gate": ("Portail verrouillé", "Portail Bleu : le portail est fermé et le raid dure 40 min. Une zone à haute valeur s'ouvre."),
    "hidden-bunker": ("Bunker caché", "Port Spatial : un bunker secret à forte valeur peut être ouvert ; raid de 40 min. "
                      "Son aile de sécurité est réputée pour les plans."),
    "launch-tower-loot": ("Butin de la tour de lancement", "Port Spatial : butin renforcé au sommet de la tour de lancement. "
                          "Apportez une Batterie industrielle pour alimenter le générateur au pied des tyroliennes."),
    "matriarch": ("Matriarche", "Le Barrage : boss ARC géant. Lâche le Réacteur de la Matriarche et des Accélérateurs magnétiques. À faire en équipe."),
    "harvester": ("Récolteur", "Gros événement ARC autour d'une structure « Récolteur » : beaucoup d'ARC, beaucoup de pièces ARC."),
    "uncovered-caches": ("Caches de raider", "Des caches de raiders apparaissent sur la carte : parmi les meilleurs conteneurs à plans (~10 % selon la communauté)."),
    "prospecting-probes": ("Sondes de prospection", "Des sondes ARC tombent sur la carte : à fouiller pour du butin ARC."),
    "husk-graveyard": ("Cimetière d'épaves", "De nombreuses carcasses d'ARC à démonter : idéal pour farmer les pièces ARC."),
    "lush-blooms": ("Floraisons luxuriantes", "Plantes et paniers en osier en abondance : idéal pour les objets Nature."),
    "bird-city": ("Cité des Oiseaux", "Événement propre à la Ville Enfouie."),
    "beachcombing": ("Collecte sur la plage", "Objets échoués à ramasser sur le littoral."),
    "hurricane": ("Ouragan", "Vents violents sur la carte : déplacements et visibilité perturbés."),
    "cold-snap": ("Vague de froid", "Froid intense : gérez votre chaleur."),
}

BOT_FR = {
    "arc_bastion": ("Bastion", "Assaut lourd", "Détruisez la cartouche à l'arrière pour exposer son point faible."),
    "arc_bombardier": ("Bombardier", "Artillerie lourde", "Visez la cartouche jaune à l'arrière : dégâts directs au noyau."),
    "arc_fireball": ("Bolide", "Contrôle de zone", "Son noyau est exposé quand il crache des flammes."),
    "arc_hornet": ("Frelon", "Drone moyen", "Propulseurs arrière non blindés."),
    "arc_leaper": ("Bondisseur", "Engin de siège", "Le feu est très efficace ; vous pouvez aussi viser son œil."),
    "arc_matriarch": ("Matriarche", "Boss", "Noyau central lumineux exposé quand elle attaque ; articulations des pattes et zones rouges de la couronne."),
    "arc_pop": ("Pop", "Explosif", "Tirez simplement dessus avant qu'il n'arrive au contact."),
    "arc_rocketeer": ("Artificier", "Artillerie volante", "Détruisez ses deux propulseurs ou visez le noyau sous l'appareil."),
    "arc_sentinel": ("Sentinelle", "Tourelle de précision", "Visez la cartouche jaune non blindée."),
    "arc_shredder": ("Shredder", "Contrôle de zone", "Visez la barre « œil » de la tête ; le noyau orange entre les plaques est aussi vulnérable."),
    "arc_snitch": ("Mouchard", "Drone éclaireur", "Propulseurs ou blindage du dessous."),
    "arc_spotter": ("Observateur", "Drone éclaireur", "Propulseurs non blindés."),
    "arc_surveyor": ("Arpenteur", "Reconnaissance", "Expose son noyau d'énergie quand il tire son rayon bleu vers le ciel."),
    "arc_the_queen": ("La Reine", "Boss", "Articulations jaunes des pattes ; noyau exposé quand elle tire son laser."),
    "arc_tick": ("Tique", "Prédateur embusqué", "Tirez dessus — un seul coup de mêlée suffit."),
    "arc_turret": ("Tourelle", "Système de défense", "Non blindée : tirez simplement dessus."),
    "arc_wasp": ("Guêpe", "Drone volant", "Propulseurs non blindés."),
}
THREAT_FR = {"Low": "Faible", "Moderate": "Modérée", "High": "Élevée", "Critical": "Critique", "Extreme": "Extrême"}

FX_VALUES = {
    "Heavy Ammo": "Munitions lourdes", "Light Ammo": "Munitions légères", "Medium Ammo": "Munitions moyennes",
    "Shotgun Ammo": "Munitions de fusil à pompe", "Launcher Ammo": "Munitions de lanceur", "Energy Clip": "Chargeur d'énergie",
    "Very Weak": "Très faible", "Weak": "Faible", "Moderate": "Modérée", "Strong": "Forte", "Very Strong": "Très forte",
    "Fully-Automatic": "Automatique", "Semi-Automatic": "Semi-automatique", "Bolt-Action": "À verrou", "Break-Action": "Canon basculant",
    "Pump-Action": "À pompe", "Lever-Action": "À levier", "Single-Action": "Simple action", "Slide-Action": "À coulisse",
    "Integrated Silencer": "Silencieux intégré", "Scoped": "Lunette intégrée", "Twin Shot": "Tir double", "Experimental": "Expérimental",
    "True": "Oui", "Light": "Léger", "Medium": "Moyen", "Heavy": "Lourd",
}
FX_LABELS = {
    "type de munitions": "Munitions", "penetration d'armure arc": "Pénétration ARC", "mode de tir": "Mode de tir",
    "compatibilite de bouclier": "Boucliers compatibles", "compatibilite bouclier": "Boucliers compatibles",
    "trait special": "Trait spécial", "taille du chargeur": "Chargeur", "durabilite": "Durabilité",
}


def _plain(s):
    import unicodedata
    s = unicodedata.normalize("NFD", s.replace("’", "'")).encode("ascii", "ignore").decode().lower().strip()
    return s


def fx_label(s):
    return FX_LABELS.get(_plain(s), s[:1].upper() + s[1:])


def fx_value(v):
    if v in FX_VALUES:
        return FX_VALUES[v]
    if "," in v:
        return ", ".join(FX_VALUES.get(x.strip(), x.strip()) for x in v.split(","))
    return v


# ------------------------------------------------------------------ objets
items = {}
for f in sorted(os.listdir(os.path.join(RAID, "items"))):
    if not f.endswith(".json"):
        continue
    d = L("items", f)
    it = {"id": d["id"], "n": fr(d["name"]), "en": d["name"].get("en", d["id"]), "t": d.get("type"), "r": d.get("rarity")}
    if d.get("value") is not None:
        it["v"] = d["value"]
    for k_src, k_dst in (("weightKg", "w"), ("stackSize", "s"), ("craftQuantity", "cq"), ("stationLevelRequired", "lv"), ("upgradesTo", "ut")):
        if d.get(k_src) is not None:
            it[k_dst] = d[k_src]
    if d.get("foundIn"):
        it["f"] = [x.strip() for x in d["foundIn"].split(",") if x.strip()]
    for k_src, k_dst in (("recipe", "rc"), ("recyclesInto", "ry"), ("salvagesInto", "sv"), ("upgradeCost", "up"), ("repairCost", "rp")):
        if d.get(k_src):
            it[k_dst] = d[k_src]
    if d.get("craftBench"):
        b = d["craftBench"]
        it["b"] = b if isinstance(b, list) else [b]
    if d.get("blueprintLocked"):
        it["bl"] = 1
    if d.get("isWeapon") or d.get("type") in WEAPON_TYPES:
        it["wpn"] = 1
    if d.get("questItem"):
        it["qi"] = 1
    desc = fr(d.get("description"))
    if desc:
        it["d"] = desc.split(" Permet de fabriquer :")[0].split(" Sert à fabriquer :")[0].strip()
    fx = []
    for k, v in (d.get("effects") or {}).items():
        if isinstance(v, dict):
            val = v.get("value")
            if val in (None, ""):
                continue
            fx.append([fx_label(v.get("fr") or k), fx_value(str(val))])
    if fx:
        it["fx"] = fx[:8]
    stats = {k: d[k] for k in ("damage", "fireRate", "range", "stability", "agility", "stealth") if isinstance(d.get(k), (int, float))}
    if stats:
        it["st"] = stats
    vend = []
    for v in d.get("vendors") or []:
        vend.append({k: v[k] for k in ("trader", "cost", "limit", "refreshSeconds", "requiredLevel") if v.get(k) is not None})
    if vend:
        it["vd"] = vend
    items[it["id"]] = it

# marchands (trades.json) : complète les vendeurs manquants
for t in L("trades.json"):
    it = items.get(t["itemId"])
    if not it:
        continue
    vd = it.setdefault("vd", [])
    if not any(v["trader"] == t["trader"] for v in vd):
        c = t.get("cost") or {}
        vd.append({"trader": t["trader"], "cost": {c.get("itemId", "coins"): c.get("quantity", 0)}, "limit": t.get("dailyLimit"), "qty": t.get("quantity", 1)})

# plans → objet débloqué
for bid, it in items.items():
    if it["t"] != "Blueprint":
        continue
    base = bid[: -len("_blueprint")] if bid.endswith("_blueprint") else None
    target = None
    if base:
        for cand in (base, base + "_i"):
            if cand in items:
                target = cand
                break
    if target:
        it["bpf"] = target
        items[target]["bp"] = bid
        # quelques noms source sans accents (« Schema Tempete ») : on reprend le nom de l'objet débloqué
        if it["n"].startswith("Schema "):
            base_name = items[target]["n"]
            it["n"] = "Schéma " + (base_name[:-2] if base_name.endswith(" I") else base_name)

# ------------------------------------------------------------------ cartes
src = json.load(open(os.path.join(HERE, "sources", "maps-poi.json"), encoding="utf-8"))["maps"]
bots_raw = L("bots.json")
maps = []
for mid in MAP_ORDER:
    s = src[mid]
    meta = MAP_META[mid]
    pois = []
    for p in s["pois"]:
        poi = {"n": POI_FR.get(mid, {}).get(p["name"], p["name"]), "en": p["name"], "tags": p["tags"]}
        if p["x"] is not None:
            poi["x"], poi["y"] = p["x"], p["y"]
        if p["tier"]:
            poi["tier"] = p["tier"]
        pois.append(poi)
    bots = sorted({b["id"] for b in bots_raw for m in b["maps"] if MAP_ID.get(m) == mid})
    maps.append({
        "id": mid, "n": meta["n"], "full": meta["full"], "en": s["nameEn"], "hue": meta["hue"],
        "diff": s["difficulty"], "len": (s["length"] or "").replace("during Hidden Bunker", "avec Bunker caché").replace("during Locked Gate", "avec Portail verrouillé"), "desc": meta["desc"], "str": meta["strengths"],
        "events": meta["events"], "bots": bots, "pois": pois,
    })

# ------------------------------------------------------------------ ARC
bots = []
for b in bots_raw:
    n, typ, weak = BOT_FR[b["id"]]
    bots.append({
        "id": b["id"], "n": n, "en": b["name"].title(), "type": typ, "threat": THREAT_FR.get(b["threat"], b["threat"]),
        "lvl": ["Low", "Moderate", "High", "Critical", "Extreme"].index(b["threat"]) + 1 if b["threat"] in ["Low", "Moderate", "High", "Critical", "Extreme"] else 3,
        "maps": sorted({MAP_ID[m] for m in b["maps"] if m in MAP_ID}, key=MAP_ORDER.index), "drops": b["drops"], "weak": weak,
        "xp": b.get("destroyXp"),
    })

# ------------------------------------------------------------------ événements
ev_raw = L("map-events", "map-events.json")["eventTypes"]
events = []
for eid, e in ev_raw.items():
    if eid == "none":
        continue
    n, desc = EVENT_META.get(eid, (e["localizations"].get("fr") or e["displayName"], ""))
    events.append({"id": eid, "n": n, "desc": desc, "major": e.get("category") == "major", "off": bool(e.get("disabled"))})

# ------------------------------------------------------------------ quêtes
quests = []
for f in sorted(os.listdir(os.path.join(RAID, "quests"))):
    q = L("quests", f)
    objs = [fr(o) for o in (q.get("objectives") or []) if isinstance(o, dict)]
    quests.append({
        "id": q["id"], "n": fr(q["name"]), "tr": q.get("trader"),
        "maps": sorted({MAP_ID[m] for m in (q.get("map") or []) if m in MAP_ID}, key=MAP_ORDER.index),
        "obj": objs,
        "req": [[r["itemId"], r["quantity"]] for r in (q.get("requiredItemIds") or [])],
        "rew": [[r["itemId"], r["quantity"]] for r in (q.get("rewardItemIds") or [])],
        "grant": [[r["itemId"], r["quantity"]] for r in (q.get("grantedItemIds") or [])],
        "prev": q.get("previousQuestIds") or [],
    })

# ------------------------------------------------------------------ atelier
stations = []
for f in sorted(os.listdir(os.path.join(RAID, "hideout"))):
    h = L("hideout", f)
    lv = [{"lv": l["level"], "req": [[r["itemId"], r["quantity"]] for r in l.get("requirementItemIds", [])]} for l in h["levels"]]
    if not any(l["req"] for l in lv):
        continue
    stations.append({"id": h["id"], "n": fr(h["name"]), "levels": lv})

# ------------------------------------------------------------------ projets
projects = []
for p in L("projects.json"):
    if p.get("disabled"):
        continue
    phases = []
    for ph in p.get("phases", []):
        reqs = []
        for r in ph.get("requirementItemIds", []) or []:
            reqs.append({"id": r["itemId"], "q": r["quantity"], "rew": [[x["itemId"], x["quantity"]] for x in (r.get("rewardItemIds") or [])]})
        phases.append({"p": ph.get("phase"), "n": fr(ph.get("name")), "req": reqs})
    projects.append({"id": p["id"], "n": fr(p["name"]), "phases": phases})

# ------------------------------------------------------------------ signalements de plans
bpr = json.load(open(os.path.join(HERE, "sources", "blueprint-reports.json"), encoding="utf-8"))
qname = {q["id"]: q["n"] for q in quests}
qbyen = {}
for f in os.listdir(os.path.join(RAID, "quests")):
    q = L("quests", f)
    qbyen[q["name"].get("en", "").lower()] = q["id"]
for bid, r in bpr["blueprints"].items():
    if r.get("quest"):
        r["questId"] = qbyen.get(r["quest"].lower())

try:
    data_rev = subprocess.check_output(["git", "-C", RAID, "log", "-1", "--format=%cs"], text=True).strip()
except Exception:
    data_rev = str(date.today())

db = {
    "meta": {"dataDate": data_rev, "built": str(date.today()), "bpReports": bpr["totalReports"]},
    "items": list(items.values()),
    "maps": maps,
    "bots": bots,
    "events": events,
    "quests": quests,
    "stations": stations,
    "projects": projects,
    "benches": BENCH_FR,
    "bpr": bpr["blueprints"],
}
os.makedirs(os.path.join(ROOT, "data"), exist_ok=True)
out = os.path.join(ROOT, "data", "db.json")
json.dump(db, open(out, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print("db.json :", os.path.getsize(out) // 1024, "Ko —", len(items), "objets,", len(maps), "cartes,", len(bots), "ARC,", len(quests), "quêtes")
