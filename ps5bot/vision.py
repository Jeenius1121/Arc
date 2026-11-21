"""Détection à l'écran : recherche d'image (template matching) et couleur de pixels."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np


@dataclass
class Detection:
    """Résultat d'une condition : vraie/fausse + infos de debug."""
    ok: bool
    score: float = 0.0
    box: tuple[int, int, int, int] | None = None  # x, y, w, h (zone trouvée ou testée)
    label: str = ""
    children: list["Detection"] = field(default_factory=list)


def crop(frame: np.ndarray, region) -> tuple[np.ndarray, int, int]:
    """Découpe [x, y, w, h] dans l'image (bornée aux dimensions). Renvoie (image, x, y)."""
    if region is None:
        return frame, 0, 0
    x, y, w, h = (int(v) for v in region)
    fh, fw = frame.shape[:2]
    x0, y0 = max(0, x), max(0, y)
    x1, y1 = min(fw, x + w), min(fh, y + h)
    if x1 <= x0 or y1 <= y0:
        raise ValueError(f"Zone {region} en dehors de l'image ({fw}x{fh})")
    return frame[y0:y1, x0:x1], x0, y0


class TemplateCache:
    def __init__(self, base_dir: Path):
        self.base_dir = Path(base_dir)
        self._cache: dict[tuple[str, bool], np.ndarray] = {}

    def get(self, path: str, gray: bool) -> np.ndarray:
        key = (path, gray)
        if key not in self._cache:
            full = Path(path)
            if not full.is_absolute():
                full = self.base_dir / full
            img = cv2.imread(str(full), cv2.IMREAD_COLOR)
            if img is None:
                raise FileNotFoundError(f"Modèle introuvable ou illisible : {full}")
            if gray:
                img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            self._cache[key] = img
        return self._cache[key]


def match_template(frame: np.ndarray, template: np.ndarray, region=None,
                   threshold: float = 0.85) -> Detection:
    """Cherche `template` dans `frame` (ou dans la zone `region`)."""
    area, ox, oy = crop(frame, region)
    if template.ndim == 2 and area.ndim == 3:
        area = cv2.cvtColor(area, cv2.COLOR_BGR2GRAY)
    th, tw = template.shape[:2]
    if area.shape[0] < th or area.shape[1] < tw:
        raise ValueError(
            f"Le modèle ({tw}x{th}) est plus grand que la zone de recherche "
            f"({area.shape[1]}x{area.shape[0]})."
        )
    result = cv2.matchTemplate(area, template, cv2.TM_CCOEFF_NORMED)
    _, max_val, _, max_loc = cv2.minMaxLoc(result)
    score = float(np.nan_to_num(max_val))
    box = (ox + max_loc[0], oy + max_loc[1], tw, th)
    return Detection(ok=score >= threshold, score=score, box=box)


def match_color(frame: np.ndarray, rgb, region=None, at=None,
                tolerance: float = 30, min_ratio: float | None = None) -> Detection:
    """Vérifie la couleur d'un point (`at`) ou d'une zone (`region`).

    - `at: [x, y]` : la couleur du pixel doit être à moins de `tolerance` de `rgb`.
    - `region` sans `min_ratio` : la couleur MOYENNE de la zone est comparée.
    - `region` avec `min_ratio` (0..1) : au moins cette proportion des pixels
      de la zone doit être proche de `rgb` (ex. barre de vie rouge).
    `rgb` est donné en [R, G, B] (comme dans Paint / un sélecteur de couleur).
    """
    target = np.array([rgb[2], rgb[1], rgb[0]], dtype=np.float32)  # -> BGR
    if at is not None:
        x, y = int(at[0]), int(at[1])
        region = (x, y, 1, 1)
    area, ox, oy = crop(frame, region)
    box = (ox, oy, area.shape[1], area.shape[0])
    pixels = area.reshape(-1, 3).astype(np.float32)
    if min_ratio is None:
        dist = float(np.linalg.norm(pixels.mean(axis=0) - target))
        return Detection(ok=dist <= tolerance, score=dist, box=box)
    close = np.linalg.norm(pixels - target, axis=1) <= tolerance
    ratio = float(close.mean())
    return Detection(ok=ratio >= min_ratio, score=ratio, box=box)
