"""Sources d'image : fenêtre (chiaki-ng / PS Remote Play), écran entier,
carte d'acquisition HDMI, ou fichier (pour tester hors ligne).

Toutes les sources renvoient une image BGR (format OpenCV) redimensionnée à
la résolution de référence (1280x720 par défaut). Les coordonnées des règles
et les modèles (templates) sont donc toujours exprimés dans cette résolution,
quelle que soit la taille réelle de la fenêtre.
"""

from __future__ import annotations

import sys
from pathlib import Path

import cv2
import numpy as np

DEFAULT_SIZE = (1280, 720)


class FrameSource:
    def __init__(self, size: tuple[int, int] = DEFAULT_SIZE):
        self.size = tuple(size)

    def grab(self) -> np.ndarray | None:
        frame = self._grab_raw()
        if frame is None:
            return None
        if (frame.shape[1], frame.shape[0]) != self.size:
            frame = cv2.resize(frame, self.size, interpolation=cv2.INTER_AREA)
        return frame

    def _grab_raw(self) -> np.ndarray | None:
        raise NotImplementedError

    def close(self) -> None:
        pass


# --------------------------------------------------------------------------- #
# Fenêtre Windows (zone client, sans la barre de titre)
# --------------------------------------------------------------------------- #

def _enable_dpi_awareness() -> None:
    """Sans ça, Windows renvoie des coordonnées « mises à l'échelle » (125 %, 150 %...)."""
    if sys.platform != "win32":
        return
    import ctypes
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass


def find_window_client_rect(title_part: str) -> dict | None:
    """Renvoie {left, top, width, height} de la zone client de la première
    fenêtre visible dont le titre contient `title_part` (insensible à la casse)."""
    if sys.platform != "win32":
        raise RuntimeError("La capture de fenêtre par titre n'est disponible que sous Windows.")
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32
    found: list[int] = []
    needle = title_part.lower()

    @ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)
    def callback(hwnd, _lparam):
        if not user32.IsWindowVisible(hwnd):
            return True
        length = user32.GetWindowTextLengthW(hwnd)
        if length == 0:
            return True
        buf = ctypes.create_unicode_buffer(length + 1)
        user32.GetWindowTextW(hwnd, buf, length + 1)
        if needle in buf.value.lower():
            found.append(hwnd)
            return False
        return True

    user32.EnumWindows(callback, 0)
    if not found:
        return None
    hwnd = found[0]
    rect = wintypes.RECT()
    user32.GetClientRect(hwnd, ctypes.byref(rect))
    origin = wintypes.POINT(0, 0)
    user32.ClientToScreen(hwnd, ctypes.byref(origin))
    width, height = rect.right - rect.left, rect.bottom - rect.top
    if width <= 0 or height <= 0:  # fenêtre réduite
        return None
    return {"left": origin.x, "top": origin.y, "width": width, "height": height}


class ScreenSource(FrameSource):
    """Capture d'écran via `mss`, d'une fenêtre (par titre), d'un écran, ou d'une zone fixe."""

    def __init__(self, window_title: str | None = None, monitor: int = 1,
                 region: dict | None = None, size=DEFAULT_SIZE):
        super().__init__(size)
        import mss

        _enable_dpi_awareness()
        self._sct = mss.mss()
        self.window_title = window_title
        self.monitor = monitor
        self.region = region
        self._warned = False

    def _area(self) -> dict | None:
        if self.window_title:
            area = find_window_client_rect(self.window_title)
            if area is None and not self._warned:
                print(f"[capture] Fenêtre « {self.window_title} » introuvable ou réduite...")
                self._warned = True
            elif area is not None:
                self._warned = False
            return area
        if self.region:
            return {k: int(self.region[k]) for k in ("left", "top", "width", "height")}
        return self._sct.monitors[self.monitor]

    def _grab_raw(self):
        area = self._area()
        if area is None:
            return None
        shot = np.asarray(self._sct.grab(area))  # BGRA
        return cv2.cvtColor(shot, cv2.COLOR_BGRA2BGR)

    def close(self):
        self._sct.close()


# --------------------------------------------------------------------------- #
# Carte d'acquisition HDMI (ou toute webcam / caméra virtuelle OBS)
# --------------------------------------------------------------------------- #

class CaptureCardSource(FrameSource):
    def __init__(self, device: int = 0, size=DEFAULT_SIZE, capture_size=(1920, 1080)):
        super().__init__(size)
        backend = cv2.CAP_DSHOW if sys.platform == "win32" else cv2.CAP_ANY
        self._cap = cv2.VideoCapture(int(device), backend)
        self._cap.set(cv2.CAP_PROP_FRAME_WIDTH, capture_size[0])
        self._cap.set(cv2.CAP_PROP_FRAME_HEIGHT, capture_size[1])
        self._cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # toujours l'image la plus récente
        if not self._cap.isOpened():
            raise RuntimeError(f"Impossible d'ouvrir le périphérique vidéo n°{device}.")

    def _grab_raw(self):
        ok, frame = self._cap.read()
        return frame if ok else None

    def close(self):
        self._cap.release()


# --------------------------------------------------------------------------- #
# Fichier image / dossier d'images / vidéo (tests hors ligne)
# --------------------------------------------------------------------------- #

class FileSource(FrameSource):
    IMAGE_EXT = {".png", ".jpg", ".jpeg", ".bmp"}

    def __init__(self, path: str, loop: bool = True, size=DEFAULT_SIZE):
        super().__init__(size)
        self.path = Path(path)
        self.loop = loop
        self._video = None
        self._images: list[np.ndarray] = []
        self._index = 0
        if self.path.is_dir():
            files = sorted(p for p in self.path.iterdir() if p.suffix.lower() in self.IMAGE_EXT)
            self._images = [cv2.imread(str(p)) for p in files]
        elif self.path.suffix.lower() in self.IMAGE_EXT:
            self._images = [cv2.imread(str(self.path))]
        else:
            self._video = cv2.VideoCapture(str(self.path))
            if not self._video.isOpened():
                raise RuntimeError(f"Impossible d'ouvrir {self.path} (fichier introuvable ou format inconnu)")
        if self._video is None and (not self._images or any(i is None for i in self._images)):
            raise RuntimeError(f"Impossible de lire les images de {self.path}")

    def _grab_raw(self):
        if self._video is not None:
            ok, frame = self._video.read()
            if not ok and self.loop:
                self._video.set(cv2.CAP_PROP_POS_FRAMES, 0)
                ok, frame = self._video.read()
            return frame if ok else None
        if self._index >= len(self._images):
            if not self.loop:
                return None
            self._index = 0
        frame = self._images[self._index]
        self._index += 1
        return frame.copy()

    def close(self):
        if self._video is not None:
            self._video.release()


def create_source(cfg: dict, base_dir: str | Path = ".") -> FrameSource:
    """`base_dir` : dossier du fichier de config (les chemins relatifs partent de là)."""
    cfg = dict(cfg or {})
    kind = cfg.pop("type", "window")
    size = tuple(cfg.pop("size", DEFAULT_SIZE))
    if kind == "window":
        return ScreenSource(window_title=cfg.get("window_title", "chiaki"), size=size)
    if kind == "monitor":
        return ScreenSource(monitor=int(cfg.get("monitor", 1)), size=size)
    if kind == "region":
        return ScreenSource(region=cfg["region"], size=size)
    if kind == "capture_card":
        return CaptureCardSource(device=int(cfg.get("device", 0)), size=size,
                                 capture_size=tuple(cfg.get("capture_size", (1920, 1080))))
    if kind == "file":
        path = Path(cfg["path"])
        if not path.is_absolute():
            path = Path(base_dir) / path
        return FileSource(str(path), loop=cfg.get("loop", True), size=size)
    raise ValueError(f"Source inconnue : {kind!r} (window, monitor, region, capture_card, file)")
