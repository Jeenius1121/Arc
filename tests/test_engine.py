"""Tests hors ligne : images synthétiques + manette factice (pas besoin de PS5)."""

import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
import pytest
import yaml

from ps5bot.controller import DryRunController
from ps5bot.rules import Engine, Rule, evaluate, run_actions
from ps5bot.vision import TemplateCache

ROOT = Path(__file__).resolve().parents[1]


def make_frame():
    rng = np.random.default_rng(0)
    frame = rng.integers(0, 60, (720, 1280, 3), dtype=np.uint8)  # fond sombre bruité
    return frame


def add_button(frame, x=1100, y=650):
    cv2.rectangle(frame, (x, y), (x + 120, y + 40), (240, 240, 240), -1)
    cv2.circle(frame, (x + 20, y + 20), 12, (200, 120, 40), -1)
    cv2.putText(frame, "OK", (x + 45, y + 30), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 0, 0), 2)
    return frame


@pytest.fixture
def templates(tmp_path):
    frame = add_button(make_frame())
    cv2.imwrite(str(tmp_path / "btn.png"), frame[650:690, 1100:1220])
    return TemplateCache(tmp_path)


class FakeClock:
    def __init__(self):
        self.t = 0.0

    def __call__(self):
        return self.t

    def sleep(self, s):
        self.t += s


def make_engine(rules, templates):
    clock = FakeClock()
    pad = DryRunController(verbose=False)
    engine = Engine([Rule.from_dict(r) for r in rules], templates, pad,
                    clock=clock, sleep=clock.sleep, log=lambda *_: None)
    return engine, pad, clock


def test_template_found_and_not_found(templates):
    cond = {"template": "btn.png", "region": [1000, 600, 280, 120]}
    assert evaluate(cond, add_button(make_frame()), templates).ok
    assert not evaluate(cond, make_frame(), templates).ok
    # le bouton a bougé hors de la zone de recherche
    assert not evaluate(cond, add_button(make_frame(), x=100, y=100), templates).ok
    # sans zone : cherché partout
    assert evaluate({"template": "btn.png"}, add_button(make_frame(), x=100, y=100), templates).ok


def test_color_conditions(templates):
    frame = make_frame()
    frame[680:692, 40:340] = (30, 30, 200)  # BGR -> rouge
    assert evaluate({"color": [200, 30, 30], "at": [100, 685]}, frame, templates).ok
    assert evaluate({"color": [200, 30, 30], "region": [40, 680, 300, 12], "min_ratio": 0.9},
                    frame, templates).ok
    assert not evaluate({"color": [200, 30, 30], "region": [40, 600, 300, 100], "min_ratio": 0.5},
                        frame, templates).ok
    assert evaluate({"not": {"color": [0, 255, 0], "at": [100, 685]}}, frame, templates).ok
    assert evaluate({"any": [{"color": [0, 255, 0], "at": [5, 5]},
                             {"color": [200, 30, 30], "at": [100, 685]}]}, frame, templates).ok


def test_rule_fires_with_cooldown(templates):
    rules = [{"name": "ok", "when": {"template": "btn.png"}, "do": [{"tap": "cross"}],
              "cooldown": 1.0}]
    engine, pad, clock = make_engine(rules, templates)
    frame = add_button(make_frame())
    engine.step(frame)
    engine.step(frame)            # trop tôt : cooldown
    clock.t += 1.0
    engine.step(frame)
    assert [e for e in pad.log if e[0] == "press"] == [("press", "cross")] * 2


def test_edge_rule_fires_once_per_appearance(templates):
    rules = [{"name": "ok", "when": {"template": "btn.png"}, "do": [{"tap": "cross"}],
              "cooldown": 0, "edge": True}]
    engine, pad, _ = make_engine(rules, templates)
    on, off = add_button(make_frame()), make_frame()
    for frame in (on, on, on, off, on):
        engine.step(frame)
    assert sum(1 for e in pad.log if e[0] == "press") == 2


def test_stop_prevents_later_rules(templates):
    rules = [
        {"name": "a", "when": {"template": "btn.png"}, "do": [{"tap": "cross"}]},
        {"name": "b", "when": {"template": "btn.png"}, "do": [{"tap": "circle"}]},
    ]
    engine, pad, _ = make_engine(rules, templates)
    fired, _ = engine.step(add_button(make_frame()))
    assert [r.name for r in fired] == ["a"]
    rules[0]["stop"] = False
    engine, pad, _ = make_engine(rules, templates)
    fired, _ = engine.step(add_button(make_frame()))
    assert [r.name for r in fired] == ["a", "b"]


def test_actions_sequence():
    pad = DryRunController(verbose=False)
    clock = FakeClock()
    run_actions([
        {"hold": {"button": "r2", "duration": 2}},
        {"stick": {"side": "left", "x": 0, "y": -1, "duration": 0.5}},
        {"dpad": "down"},
        {"repeat": {"times": 2, "do": [{"tap": "r1"}]}},
    ], pad, sleep=clock.sleep, log=lambda *_: None)
    assert pad.log == [
        ("press", "r2"), ("release", "r2"),
        ("stick", "left", 0.0, -1.0), ("stick", "left", 0.0, 0.0),
        ("dpad", "down"), ("dpad", "none"),
        ("press", "r1"), ("release", "r1"), ("press", "r1"), ("release", "r1"),
    ]
    assert clock.t == pytest.approx(2 + 0.5 + 0.08 + 2 * 0.08)


def test_invalid_inputs_raise():
    pad = DryRunController(verbose=False)
    with pytest.raises(ValueError):
        run_actions([{"tap": "bouton_inexistant"}], pad)
    with pytest.raises(ValueError):
        Rule.from_dict({"name": "x", "when": {}, "do": [], "cooldwn": 1})


def test_example_config_parses_and_cli_check(tmp_path):
    cfg = yaml.safe_load((ROOT / "config.example.yaml").read_text(encoding="utf-8"))
    assert [Rule.from_dict(r).name for r in cfg["rules"]]

    # check en ligne de commande, avec la vraie CLI
    frame = add_button(make_frame())
    (tmp_path / "templates").mkdir()
    cv2.imwrite(str(tmp_path / "templates" / "btn.png"), frame[650:690, 1100:1220])
    cv2.imwrite(str(tmp_path / "shot.png"), frame)
    (tmp_path / "config.yaml").write_text(yaml.safe_dump({
        "rules": [{"name": "bouton", "when": {"template": "templates/btn.png",
                                              "region": [1000, 600, 280, 120]},
                   "do": [{"tap": "cross"}]}]
    }), encoding="utf-8")
    out = subprocess.run(
        [sys.executable, "-m", "ps5bot", "check", str(tmp_path / "config.yaml"),
         str(tmp_path / "shot.png"), "-o", str(tmp_path / "annot.png")],
        cwd=ROOT, capture_output=True, text=True, check=True,
    ).stdout
    assert "DÉCLENCHE  bouton" in out
    assert (tmp_path / "annot.png").exists()
