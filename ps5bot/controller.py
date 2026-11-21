"""Manettes : virtuelle (DS4 via ViGEmBus) ou factice (dry-run).

Conventions communes à toutes les manettes :
- boutons : cross, circle, square, triangle, l1, r1, l2, r2, l3, r3,
  options, create, ps, touchpad
- croix directionnelle : up, down, left, right, up_left, up_right,
  down_left, down_right, none
- sticks : "left" / "right", x et y entre -1.0 et 1.0
  (x = -1 gauche, x = 1 droite, y = -1 HAUT, y = 1 bas)
- gâchettes analogiques : "l2" / "r2", valeur entre 0.0 et 1.0
"""

from __future__ import annotations

import time

BUTTONS = (
    "cross", "circle", "square", "triangle",
    "l1", "r1", "l2", "r2", "l3", "r3",
    "options", "create", "ps", "touchpad",
)
DPAD = (
    "none", "up", "down", "left", "right",
    "up_left", "up_right", "down_left", "down_right",
)
STICKS = ("left", "right")
TRIGGERS = ("l2", "r2")


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, float(value)))


class Controller:
    """Interface commune. Les sous-classes implémentent les méthodes _set_*."""

    def press(self, button: str) -> None:
        self._check_button(button)
        self._set_button(button, True)

    def release(self, button: str) -> None:
        self._check_button(button)
        self._set_button(button, False)

    def tap(self, button: str, duration: float = 0.08) -> None:
        self.press(button)
        time.sleep(duration)
        self.release(button)

    def stick(self, side: str, x: float, y: float) -> None:
        if side not in STICKS:
            raise ValueError(f"Stick inconnu : {side!r} (attendu : {STICKS})")
        self._set_stick(side, _clamp(x, -1, 1), _clamp(y, -1, 1))

    def trigger(self, side: str, value: float) -> None:
        if side not in TRIGGERS:
            raise ValueError(f"Gâchette inconnue : {side!r} (attendu : {TRIGGERS})")
        self._set_trigger(side, _clamp(value, 0, 1))

    def dpad(self, direction: str) -> None:
        if direction not in DPAD:
            raise ValueError(f"Direction inconnue : {direction!r} (attendu : {DPAD})")
        self._set_dpad(direction)

    def reset(self) -> None:
        """Relâche tout (boutons, sticks, gâchettes)."""
        raise NotImplementedError

    def close(self) -> None:
        self.reset()

    @staticmethod
    def _check_button(button: str) -> None:
        if button not in BUTTONS:
            raise ValueError(f"Bouton inconnu : {button!r} (attendu : {BUTTONS})")

    def _set_button(self, button: str, pressed: bool) -> None:
        raise NotImplementedError

    def _set_stick(self, side: str, x: float, y: float) -> None:
        raise NotImplementedError

    def _set_trigger(self, side: str, value: float) -> None:
        raise NotImplementedError

    def _set_dpad(self, direction: str) -> None:
        raise NotImplementedError


class DryRunController(Controller):
    """N'envoie rien : affiche (et mémorise) les commandes. Utile pour tester les règles."""

    def __init__(self, verbose: bool = True):
        self.verbose = verbose
        self.log: list[tuple] = []

    def _emit(self, *event) -> None:
        self.log.append(event)
        if self.verbose:
            print("  [manette]", *event)

    def _set_button(self, button, pressed):
        self._emit("press" if pressed else "release", button)

    def _set_stick(self, side, x, y):
        self._emit("stick", side, round(x, 2), round(y, 2))

    def _set_trigger(self, side, value):
        self._emit("trigger", side, round(value, 2))

    def _set_dpad(self, direction):
        self._emit("dpad", direction)

    def reset(self):
        self._emit("reset")


class VirtualDS4Controller(Controller):
    """Manette DualShock 4 virtuelle (Windows, pilote ViGEmBus via `vgamepad`).

    chiaki-ng (ou PS Remote Play) la voit comme une vraie manette et transmet
    les entrées à la PS5.
    """

    def __init__(self):
        try:
            import vgamepad as vg
        except ImportError as exc:  # pragma: no cover - dépend de Windows
            raise RuntimeError(
                "`vgamepad` n'est pas installé (pip install vgamepad). "
                "Il nécessite Windows et le pilote ViGEmBus."
            ) from exc

        self._vg = vg
        self._pad = vg.VDS4Gamepad()
        b = vg.DS4_BUTTONS
        s = vg.DS4_SPECIAL_BUTTONS
        d = vg.DS4_DPAD_DIRECTIONS
        self._buttons = {
            "cross": b.DS4_BUTTON_CROSS,
            "circle": b.DS4_BUTTON_CIRCLE,
            "square": b.DS4_BUTTON_SQUARE,
            "triangle": b.DS4_BUTTON_TRIANGLE,
            "l1": b.DS4_BUTTON_SHOULDER_LEFT,
            "r1": b.DS4_BUTTON_SHOULDER_RIGHT,
            "l2": b.DS4_BUTTON_TRIGGER_LEFT,
            "r2": b.DS4_BUTTON_TRIGGER_RIGHT,
            "l3": b.DS4_BUTTON_THUMB_LEFT,
            "r3": b.DS4_BUTTON_THUMB_RIGHT,
            "options": b.DS4_BUTTON_OPTIONS,
            "create": b.DS4_BUTTON_SHARE,
        }
        self._special = {
            "ps": s.DS4_SPECIAL_BUTTON_PS,
            "touchpad": s.DS4_SPECIAL_BUTTON_TOUCHPAD,
        }
        self._dpad = {
            "none": d.DS4_BUTTON_DPAD_NONE,
            "up": d.DS4_BUTTON_DPAD_NORTH,
            "down": d.DS4_BUTTON_DPAD_SOUTH,
            "left": d.DS4_BUTTON_DPAD_WEST,
            "right": d.DS4_BUTTON_DPAD_EAST,
            "up_left": d.DS4_BUTTON_DPAD_NORTHWEST,
            "up_right": d.DS4_BUTTON_DPAD_NORTHEAST,
            "down_left": d.DS4_BUTTON_DPAD_SOUTHWEST,
            "down_right": d.DS4_BUTTON_DPAD_SOUTHEAST,
        }
        self.reset()

    def _set_button(self, button, pressed):
        if button in self._special:
            fn = self._pad.press_special_button if pressed else self._pad.release_special_button
            fn(self._special[button])
        else:
            fn = self._pad.press_button if pressed else self._pad.release_button
            fn(self._buttons[button])
            # L2/R2 : on pousse aussi l'axe analogique, c'est ce que lisent les jeux.
            if button in TRIGGERS:
                self._apply_trigger(button, 1.0 if pressed else 0.0)
        self._pad.update()

    def _set_stick(self, side, x, y):
        if side == "left":
            self._pad.left_joystick_float(x_value_float=x, y_value_float=y)
        else:
            self._pad.right_joystick_float(x_value_float=x, y_value_float=y)
        self._pad.update()

    def _apply_trigger(self, side, value):
        if side == "l2":
            self._pad.left_trigger_float(value_float=value)
        else:
            self._pad.right_trigger_float(value_float=value)

    def _set_trigger(self, side, value):
        self._apply_trigger(side, value)
        self._pad.update()

    def _set_dpad(self, direction):
        self._pad.directional_pad(direction=self._dpad[direction])
        self._pad.update()

    def reset(self):
        self._pad.reset()
        self._pad.update()


def create_controller(kind: str) -> Controller:
    kind = (kind or "dry_run").lower()
    if kind in ("ds4", "virtual_ds4", "vgamepad"):
        return VirtualDS4Controller()
    if kind in ("dry_run", "dryrun", "none"):
        return DryRunController()
    raise ValueError(f"Type de manette inconnu : {kind!r} (attendu : virtual_ds4, dry_run)")
