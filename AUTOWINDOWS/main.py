"""AUTOWINDOWS — entry point that starts gesture controller, download watcher, and GUI."""

import sys
import threading

from gesture.controller import GestureController
from gui.app import MainWindow
from organizer.watcher import DownloadWatcher
from utils.config_loader import load_config
from utils.logger import logger


class AutoWindows:
    """Orchestrates all AUTOWINDOWS subsystems."""

    def __init__(self):
        self.gesture_controller = GestureController()
        self.download_watcher = DownloadWatcher()
        self.gui: MainWindow | None = None
        self._running = True

    def start(self):
        """Start watchdog, gesture controller, and GUI (blocks on GUI mainloop)."""
        logger.info("=" * 50)
        logger.info("AUTOWINDOWS iniciando (Modo Visão Computacional)...")
        logger.info("=" * 50)

        if load_config().get("watchdog", {}).get("enabled", True):
            self.download_watcher.start()

        # Start gesture controller; if camera is unavailable we log a warning
        # but still open the GUI so the user can configure settings.
        if not self.gesture_controller.start():
            logger.warning(
                "Gesture Controller não iniciou — câmera indisponível. "
                "Conecte uma webcam e reinicie o app."
            )

        self.gui = MainWindow(
            gesture_controller=self.gesture_controller,
            download_watcher=self.download_watcher,
        )

        self._update_indicators()
        logger.info("AUTOWINDOWS pronto")
        self.gui.mainloop()

        # mainloop returned → GUI closed → stop everything
        self.stop()

    def stop(self):
        """Clean shutdown of all subsystems."""
        self._running = False
        self.gesture_controller.stop()
        self.download_watcher.stop()
        logger.info("AUTOWINDOWS encerrado")

    def _update_indicators(self):
        """Periodically refresh GUI status indicators."""
        if not self._running:
            return
        if self.gui:
            self.gui.update_indicators(
                gesture_active=self.gesture_controller.running,
                camera_ok=self.gesture_controller.camera_ok,
                watchdog_active=self.download_watcher.is_active,
            )
        threading.Timer(2.0, self._update_indicators).start()


def main():
    """Entry point."""
    app = AutoWindows()
    try:
        app.start()
    except KeyboardInterrupt:
        logger.info("Encerrando... (Ctrl+C)")
        app.stop()
        sys.exit(0)


if __name__ == "__main__":
    main()
