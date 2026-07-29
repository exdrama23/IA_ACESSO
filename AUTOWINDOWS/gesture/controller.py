"""Main controller — camera → tracker → recognizer → action loop."""

import threading
import time
from pathlib import Path

from gesture.capture import CameraCapture
from gesture.tracker import HandTracker, draw_landmarks
from gesture.recognizer import GestureRecognizer
from gesture.actions import GestureActions
from utils.config_loader import (
    get_gesture_map,
    get_gesture_settings,
    config_path,
    reload_config,
)
from utils.logger import logger


class GestureController:
    CONTINUOUS = frozenset({"move_mouse", "scroll", "click"})

    def __init__(self):
        self.capture = CameraCapture()
        self.tracker = HandTracker()
        self.recognizer = GestureRecognizer()
        self.actions = GestureActions()
        self.running = False
        self._thread = None
        self._frame_count = 0
        self._gesture_entries: dict[str, dict] = {}
        self._prev_gesture = ""
        self._pinching = False
        self._pinch_start = 0.0
        self._pinch_is_drag = False
        self._drag_delay = 5.0
        self._frame_skip = 2
        self._config_mtime = 0.0
        self._camera_failures = 0
        self._camera_recovering = False
        self.last_annotated_frame = None
        self.last_gesture_name = ""
        self.last_gesture_action = ""

        self._load_settings()
        self._reload_map()

    # ---- settings -------------------------------------------------------

    def _load_settings(self):
        s = get_gesture_settings()
        self._drag_delay = s["drag_delay_seconds"]
        self._frame_skip = s["frame_skip"]
        self.recognizer.update_settings()
        self.actions.update_settings()

    # ---- config hot-reload -----------------------------------------------

    def _check_config_reload(self):
        """Poll config mtime every 30 frames — if changed, reload everything."""
        if self._frame_count % 30 != 0:
            return
        try:
            mtime = config_path().stat().st_mtime
        except OSError:
            return
        if mtime > self._config_mtime:
            self._config_mtime = mtime
            reload_config()
            self._load_settings()
            self._reload_map()
            logger.info("Config recarregado automaticamente")

    def reload_now(self):
        """Force reload of config, gesture map, and settings (called from GUI)."""
        reload_config()
        self._load_settings()
        self._reload_map()
        # Update mtime so polling doesn't redo it
        try:
            self._config_mtime = config_path().stat().st_mtime
        except OSError:
            pass
        logger.info("Config recarregado via reload_now()")

    # ---- gesture map ----------------------------------------------------

    def _reload_map(self):
        self._gesture_entries = {
            g["id"]: g
            for g in get_gesture_map()
            if g.get("enabled", True)
        }
        logger.debug(f"Mapa de gestos: {len(self._gesture_entries)} entries")

    # ---- lifecycle ------------------------------------------------------

    @property
    def camera_ok(self) -> bool:
        """Return True if the camera is connected and delivering frames."""
        return self.capture.camera_available

    def start(self) -> bool:
        """Start the gesture-recognition loop.  Returns True on success."""
        if not self.capture.start():
            logger.error("Gesture Controller não iniciado — câmera indisponível")
            return False
        self.running = True
        self._thread = threading.Thread(target=self._loop, daemon=True)
        self._thread.start()
        logger.info("Gesture Controller iniciado")
        return True

    def stop(self):
        self.running = False
        self.capture.stop()
        self.tracker.close()
        logger.info("Gesture Controller parado")

    # ---- main loop ------------------------------------------------------

    def _loop(self):
        while self.running:
            frame = self.capture.get_frame()
            if frame is None:
                # camera may have been disconnected — try recovery
                self._camera_failures += 1
                self.last_annotated_frame = None
                if self._camera_failures >= 30 and not self._camera_recovering:
                    self._camera_recovering = True
                    logger.info("Câmera sem resposta — tentando reiniciar...")
                    ok = self.capture.restart()
                    if ok:
                        self._camera_failures = 0
                    else:
                        logger.warning("Reinicialização da câmera falhou")
                    self._camera_recovering = False
                time.sleep(0.01)
                continue
            self._camera_failures = 0

            self._frame_count += 1
            self._check_config_reload()

            skip = (self._frame_count % self._frame_skip) != 0
            if skip:
                self.actions.move_mouse_drift()
                continue

            landmarks, _ = self.tracker.find_hands(frame)
            annot = frame.copy()
            draw_landmarks(annot, landmarks)
            self.last_annotated_frame = annot

            if not landmarks:
                self.last_gesture_name = ""
                self.last_gesture_action = ""
                self._prev_gesture = ""
                if self._pinching:
                    self._end_pinch()
                self.actions.move_mouse_drift()
                continue

            hand = landmarks[0]
            gesture = self.recognizer.get_gesture(hand)
            index_tip = hand[8]

            self.last_gesture_name = gesture
            entry = self._gesture_entries.get(gesture)
            if entry is None:
                self.last_gesture_action = ""
                self._prev_gesture = ""
                if self._pinching:
                    self._end_pinch()
                self.actions.move_mouse_drift()
                continue

            action_name = entry["action"]
            self.last_gesture_action = action_name
            logger.debug(f"Gesto: {gesture} → Ação: {action_name}")

            # --- pinch release ---
            if self._pinching and action_name != "click":
                self._end_pinch()

            if action_name in self.CONTINUOUS:
                if action_name == "move_mouse":
                    self.actions.perform("move_mouse", x=index_tip.x, y=index_tip.y)
                elif action_name == "scroll":
                    self.actions.perform("scroll", y_pos=index_tip.y)
                elif action_name == "click":
                    if not self._pinching:
                        self._pinching = True
                        self._pinch_start = time.monotonic()
                        self._pinch_is_drag = False
                        logger.debug(
                            f"Pinça — esperando {self._drag_delay:.0f} s p/ decidir"
                        )
                    else:
                        elapsed = time.monotonic() - self._pinch_start
                        if elapsed >= self._drag_delay and not self._pinch_is_drag:
                            self.actions.mouse_down()
                            self._pinch_is_drag = True
                            logger.info(
                                f"Pinça > {self._drag_delay:.0f} s → mouseDown"
                            )
                    self.actions.perform("move_mouse", x=index_tip.x, y=index_tip.y)

            elif action_name == "nothing":
                pass

            else:
                if gesture != self._prev_gesture:
                    param = entry.get("param", "")
                    shortcut = entry.get("shortcut", "")
                    self.actions.perform(action_name, param=param, shortcut=shortcut)
                    logger.info(f"Gesto único: {gesture} → {action_name}")

            self._prev_gesture = gesture

    # ---- pinch helpers --------------------------------------------------

    def _end_pinch(self):
        if self._pinch_is_drag:
            self.actions.mouse_up()
            logger.info(f"Pinça longa (>={self._drag_delay:.0f} s) → mouseUp")
        else:
            self.actions.perform("click")
            logger.info("Pinça curta → click")
        self._pinching = False
        self._pinch_is_drag = False
