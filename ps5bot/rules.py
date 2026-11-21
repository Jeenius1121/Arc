"""Moteur de règles : « QUAND je vois ceci À L'ÉCRAN → FAIRE ces actions à la manette ».

Format d'une règle (voir config.example.yaml pour des exemples complets) :

    - name: Passer les dialogues
      when:                       # une condition, ou une liste (= toutes vraies)
        template: templates/dialogue.png
        region: [900, 600, 380, 120]
        threshold: 0.85
      do:
        - tap: cross
        - wait: 0.5
      cooldown: 1.0               # secondes minimum entre deux déclenchements
      edge: false                 # true = seulement quand la condition DEVIENT vraie
      stop: true                  # true = ne pas évaluer les règles suivantes
"""

from __future__ import annotations

import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable

import numpy as np

from .controller import Controller
from .vision import Detection, TemplateCache, match_color, match_template


# --------------------------------------------------------------------------- #
# Conditions
# --------------------------------------------------------------------------- #

class ConditionError(ValueError):
    pass


def evaluate(cond: Any, frame: np.ndarray, templates: TemplateCache) -> Detection:
    """Évalue une condition (dict) ou une liste de conditions (toutes requises)."""
    if isinstance(cond, list):
        return _combine("all", cond, frame, templates)
    if not isinstance(cond, dict):
        raise ConditionError(f"Condition invalide : {cond!r}")

    if "all" in cond:
        return _combine("all", cond["all"], frame, templates)
    if "any" in cond:
        return _combine("any", cond["any"], frame, templates)
    if "not" in cond:
        inner = evaluate(cond["not"], frame, templates)
        return Detection(ok=not inner.ok, score=inner.score, box=inner.box,
                         label="not " + inner.label, children=[inner])

    if "template" in cond:
        gray = cond.get("gray", True)
        tpl = templates.get(cond["template"], gray)
        det = match_template(frame, tpl, cond.get("region"), cond.get("threshold", 0.85))
        det.label = f"template {Path(cond['template']).name}"
        return det

    if "color" in cond:
        if "at" not in cond and "region" not in cond:
            raise ConditionError("Une condition `color` a besoin de `at: [x, y]` ou `region`.")
        det = match_color(frame, cond["color"], region=cond.get("region"), at=cond.get("at"),
                          tolerance=cond.get("tolerance", 30), min_ratio=cond.get("min_ratio"))
        det.label = f"color {list(cond['color'])}"
        return det

    raise ConditionError(f"Type de condition inconnu : {sorted(cond)}")


def _combine(mode: str, conds: list, frame, templates) -> Detection:
    children = [evaluate(c, frame, templates) for c in conds]
    ok = all(c.ok for c in children) if mode == "all" else any(c.ok for c in children)
    return Detection(ok=ok, label=mode, children=children)


def iter_leaves(det: Detection):
    if det.children:
        for child in det.children:
            yield from iter_leaves(child)
    else:
        yield det


# --------------------------------------------------------------------------- #
# Actions
# --------------------------------------------------------------------------- #

class ActionError(ValueError):
    pass


def run_actions(actions: list, pad: Controller, sleep: Callable[[float], None] = time.sleep,
                log: Callable[[str], None] = print) -> None:
    for action in actions:
        run_action(action, pad, sleep, log)


def run_action(action: Any, pad: Controller, sleep=time.sleep, log=print) -> None:
    if not isinstance(action, dict) or len(action) != 1:
        raise ActionError(f"Action invalide (une seule clé attendue) : {action!r}")
    (kind, arg), = action.items()

    if kind == "tap":
        button, duration = _button_arg(arg, default_duration=0.08)
        pad.press(button)
        sleep(duration)
        pad.release(button)
    elif kind == "hold":
        button, duration = _button_arg(arg, default_duration=1.0)
        pad.press(button)
        sleep(duration)
        pad.release(button)
    elif kind == "press":
        pad.press(arg)
    elif kind == "release":
        pad.release(arg)
    elif kind == "wait":
        sleep(float(arg))
    elif kind == "stick":
        side = arg.get("side", "left")
        pad.stick(side, arg.get("x", 0.0), arg.get("y", 0.0))
        if "duration" in arg:
            sleep(float(arg["duration"]))
            pad.stick(side, 0.0, 0.0)
    elif kind == "trigger":
        side = arg["side"]
        pad.trigger(side, arg.get("value", 1.0))
        if "duration" in arg:
            sleep(float(arg["duration"]))
            pad.trigger(side, 0.0)
    elif kind == "dpad":
        if isinstance(arg, str):
            direction, duration = arg, 0.08
        else:
            direction, duration = arg["direction"], float(arg.get("duration", 0.08))
        pad.dpad(direction)
        sleep(duration)
        pad.dpad("none")
    elif kind == "repeat":
        for _ in range(int(arg.get("times", 1))):
            run_actions(arg["do"], pad, sleep, log)
    elif kind == "log":
        log(f"  [log] {arg}")
    elif kind == "reset":
        pad.reset()
    else:
        raise ActionError(f"Action inconnue : {kind!r}")


def _button_arg(arg, default_duration: float) -> tuple[str, float]:
    if isinstance(arg, str):
        return arg, default_duration
    return arg["button"], float(arg.get("duration", default_duration))


# --------------------------------------------------------------------------- #
# Règles et moteur
# --------------------------------------------------------------------------- #

@dataclass
class Rule:
    name: str
    when: Any
    do: list
    cooldown: float = 0.5
    edge: bool = False
    stop: bool = True
    enabled: bool = True
    # état interne
    last_fired: float = field(default=-1e9, repr=False)
    last_state: bool = field(default=False, repr=False)
    fired_count: int = field(default=0, repr=False)

    @classmethod
    def from_dict(cls, data: dict) -> "Rule":
        unknown = set(data) - {"name", "when", "do", "cooldown", "edge", "stop", "enabled"}
        if unknown:
            raise ValueError(f"Clés inconnues dans la règle {data.get('name')!r} : {sorted(unknown)}")
        if "when" not in data or "do" not in data:
            raise ValueError(f"La règle {data.get('name')!r} doit avoir `when` et `do`.")
        return cls(
            name=data.get("name", "sans nom"),
            when=data["when"],
            do=list(data["do"]),
            cooldown=float(data.get("cooldown", 0.5)),
            edge=bool(data.get("edge", False)),
            stop=bool(data.get("stop", True)),
            enabled=bool(data.get("enabled", True)),
        )


class Engine:
    def __init__(self, rules: list[Rule], templates: TemplateCache, pad: Controller,
                 clock: Callable[[], float] = time.monotonic,
                 sleep: Callable[[float], None] = time.sleep,
                 log: Callable[[str], None] = print):
        self.rules = rules
        self.templates = templates
        self.pad = pad
        self.clock = clock
        self.sleep = sleep
        self.log = log

    def step(self, frame: np.ndarray) -> tuple[list[Rule], dict[str, Detection]]:
        """Évalue les règles sur une image et exécute celles qui se déclenchent.
        Renvoie (règles déclenchées, détections par règle pour l'affichage)."""
        fired: list[Rule] = []
        detections: dict[str, Detection] = {}
        for rule in self.rules:
            if not rule.enabled:
                continue
            det = evaluate(rule.when, frame, self.templates)
            detections[rule.name] = det
            rising = det.ok and not rule.last_state
            rule.last_state = det.ok
            if not det.ok or (rule.edge and not rising):
                continue
            now = self.clock()
            if now - rule.last_fired < rule.cooldown:
                continue
            self.log(f"[règle] {rule.name}")
            run_actions(rule.do, self.pad, self.sleep, self.log)
            rule.last_fired = self.clock()
            rule.fired_count += 1
            fired.append(rule)
            if rule.stop:
                break
        return fired, detections
