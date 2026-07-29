"""Map system actions to pyautogui calls. Dispatched by gesture name from config."""

import subprocess

import pyautogui

from actions.open_app import _resolve_app
from utils.logger import logger

pyautogui.FAILSAFE = False
pyautogui.PAUSE = 0.0

_AVAILABLE_ACTIONS = [
    "move_mouse", "click", "right_click", "scroll",
    "screenshot", "volume_up", "volume_down", "alt_tab",
    "escape", "nothing",
    # new
    "open_app", "type_text",
    "shutdown", "restart", "lock",
    "play_pause", "next_track", "prev_track",
    "minimize", "maximize",
    "enter", "tab", "delete", "backspace",
    "custom_keys",
]


def available_actions() -> list[str]:
    return list(_AVAILABLE_ACTIONS)


def _parse_shortcut(combo: str) -> list[str]:
    """'Ctrl+Shift+S' -> ['ctrl','shift','s']"""
    keys = []
    for part in combo.split("+"):
        k = part.strip().lower()
        # pyautogui uses these names
        _map = {"ctrl": "ctrl", "shift": "shift", "alt": "alt", "win": "win"}
        keys.append(_map.get(k, k))
    return keys


from utils.config_loader import get_gesture_settings


def _remap(val: float, in_min: float, in_max: float) -> float:
    """Map [in_min, in_max] → [0, 1] and clamp."""
    return max(0.0, min(1.0, (val - in_min) / (in_max - in_min)))


class GestureActions:
    def __init__(self):
        self.screen_w, self.screen_h = pyautogui.size()
        self.prev_x, self.prev_y = 0.0, 0.0
        self.drift_x, self.drift_y = 0.0, 0.0
        self.smoothing = 0.55
        self._min_move = 1
        self._rx_min = 0.08
        self._rx_max = 0.92
        self._ry_min = 0.10
        self._ry_max = 0.80

    def update_settings(self):
        s = get_gesture_settings()
        self.smoothing = s["smoothing"]
        self._min_move = s["min_move_px"]
        self._rx_min = s["remap_x_min"]
        self._rx_max = s["remap_x_max"]
        self._ry_min = s["remap_y_min"]
        self._ry_max = s["remap_y_max"]

    # ---- internal mouse helpers ----

    def _move_mouse(self, x: float, y: float):
        # remap so the real finger range covers the full screen
        rx = _remap(x, self._rx_min, self._rx_max)
        ry = _remap(y, self._ry_min, self._ry_max)
        target_x = rx * self.screen_w
        target_y = ry * self.screen_h
        curr_x = self.prev_x + (target_x - self.prev_x) * self.smoothing
        curr_y = self.prev_y + (target_y - self.prev_y) * self.smoothing
        dx = abs(curr_x - self.prev_x)
        dy = abs(curr_y - self.prev_y)
        if dx >= self._min_move or dy >= self._min_move:
            # ordinary smoothing step
            pyautogui.moveTo(int(curr_x), int(curr_y))
            self.prev_x, self.prev_y = curr_x, curr_y
        else:
            # too close — snap directly to target so edges are reachable
            if abs(target_x - self.prev_x) > 1 or abs(target_y - self.prev_y) > 1:
                pyautogui.moveTo(int(target_x), int(target_y))
                self.prev_x, self.prev_y = target_x, target_y
            self.drift_x, self.drift_y = curr_x, curr_y

    def move_mouse_drift(self):
        if abs(self.drift_x) > 1 or abs(self.drift_y) > 1:
            curr_x = self.prev_x + (self.drift_x - self.prev_x) * self.smoothing
            curr_y = self.prev_y + (self.drift_y - self.prev_y) * self.smoothing
            pyautogui.moveTo(int(curr_x), int(curr_y))
            self.prev_x, self.prev_y = curr_x, curr_y
            self.drift_x, self.drift_y = 0.0, 0.0

    # ---- public dispatch ----

    def perform(self, action: str, **kwargs) -> None:
        """Execute `action` by name.
        Kwargs:
          x, y       (move_mouse)
          y_pos      (scroll)
          param      (open_app, type_text, custom_keys)
          shortcut   (custom_keys)
        """
        fn = getattr(self, f"_action_{action}", None)
        if fn is None:
            logger.warning(f"Ação desconhecida: {action}")
            return
        fn(**kwargs)

    # ---- action implementations (prefixed _action_) ----

    def _action_move_mouse(self, x=0.5, y=0.5, **kw):
        self._move_mouse(x, y)

    def mouse_down(self):
        pyautogui.mouseDown()
        logger.info("mouseDown (arrastar)")

    def mouse_up(self):
        pyautogui.mouseUp()
        logger.info("mouseUp (soltar)")

    def _action_click(self, **kw):
        pyautogui.click()
        logger.info("Click")

    def _action_right_click(self, **kw):
        pyautogui.rightClick()
        logger.info("Clique direito")

    def _action_scroll(self, y_pos=0.5, **kw):
        amount = 100 if y_pos < 0.45 else -100 if y_pos > 0.55 else 0
        if amount:
            pyautogui.scroll(amount)

    def _action_screenshot(self, **kw):
        pyautogui.hotkey("win", "printscreen")
        logger.info("Screenshot")

    def _action_volume_up(self, **kw):
        pyautogui.press("volumeup")
        logger.info("Volume +")

    def _action_volume_down(self, **kw):
        pyautogui.press("volumedown")
        logger.info("Volume -")

    def _action_alt_tab(self, **kw):
        pyautogui.hotkey("alt", "tab")
        logger.info("Alt+Tab")

    def _action_escape(self, **kw):
        pyautogui.press("escape")
        logger.info("Escape")

    def _action_nothing(self, **kw):
        pass

    # ---- new actions ----

    def _action_open_app(self, param="", **kw):
        if not param:
            logger.warning("open_app sem parâmetro")
            return
        path = _resolve_app(param)
        if path is None:
            logger.warning(f"App não encontrado: {param}")
            return
        try:
            subprocess.Popen(
                [str(path)],
                creationflags=subprocess.CREATE_NO_WINDOW,
            )
            logger.info(f"App aberto: {param} ({path})")
        except Exception as exc:
            logger.error(f"Erro ao abrir {param}: {exc}")

    def _action_type_text(self, param="", **kw):
        if not param:
            return
        try:
            import pyperclip
            pyperclip.copy(param)
            pyautogui.hotkey("ctrl", "v")
            logger.info(f"Texto digitado ({len(param)} chars)")
        except Exception as exc:
            logger.error(f"Erro ao digitar texto: {exc}")

    def _action_shutdown(self, **kw):
        logger.info("Desligando...")
        subprocess.Popen(["shutdown", "/s", "/t", "0"], creationflags=subprocess.CREATE_NO_WINDOW)

    def _action_restart(self, **kw):
        logger.info("Reiniciando...")
        subprocess.Popen(["shutdown", "/r", "/t", "0"], creationflags=subprocess.CREATE_NO_WINDOW)

    def _action_lock(self, **kw):
        logger.info("Travando tela")
        subprocess.Popen(["rundll32.exe", "user32.dll,LockWorkStation"], creationflags=subprocess.CREATE_NO_WINDOW)

    def _action_play_pause(self, **kw):
        pyautogui.press("playpause")
        logger.info("Play/Pause")

    def _action_next_track(self, **kw):
        pyautogui.press("nexttrack")
        logger.info("Próxima faixa")

    def _action_prev_track(self, **kw):
        pyautogui.press("prevtrack")
        logger.info("Faixa anterior")

    def _action_minimize(self, **kw):
        pyautogui.hotkey("alt", "space")
        pyautogui.press("n")
        logger.info("Minimizar")

    def _action_maximize(self, **kw):
        pyautogui.hotkey("alt", "space")
        pyautogui.press("x")
        logger.info("Maximizar")

    def _action_enter(self, **kw):
        pyautogui.press("enter")

    def _action_tab(self, **kw):
        pyautogui.press("tab")

    def _action_delete(self, **kw):
        pyautogui.press("delete")

    def _action_backspace(self, **kw):
        pyautogui.press("backspace")

    def _action_custom_keys(self, shortcut="", **kw):
        if not shortcut:
            return
        keys = _parse_shortcut(shortcut)
        pyautogui.hotkey(*keys)
        logger.info(f"Atalho: {'+'.join(keys)}")
