"""Camera capture module for gesture recognition with recovery support."""

import cv2
from utils.logger import logger

_MAX_RESTART_ATTEMPTS = 5
_RESTART_DELAY_MS = 2000  # milliseconds between restart attempts


class CameraCapture:
    """Webcam wrapper with idempotent start/stop and reconnection support."""

    def __init__(self, width=640, height=480):
        self.width = width
        self.height = height
        self.cap = None
        self._restart_attempts = 0
        self.camera_available = False

    @property
    def connected(self) -> bool:
        """Return True if the camera is currently open and readable."""
        return self.cap is not None and self.cap.isOpened()

    def start(self) -> bool:
        """Open the webcam.  Idempotent — safe to call multiple times."""
        self.stop()  # close previous handle if any
        self.cap = cv2.VideoCapture(0)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, self.width)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self.height)
        if not self.cap.isOpened():
            logger.error("Não foi possível abrir a webcam")
            self.camera_available = False
            return False
        self.camera_available = True
        self._restart_attempts = 0
        logger.info("Câmera aberta")
        return True

    def restart(self) -> bool:
        """Close and re-open the camera.  Respects max-attempt cap."""
        if self._restart_attempts >= _MAX_RESTART_ATTEMPTS:
            logger.warning(
                f"Número máximo de tentativas ({_MAX_RESTART_ATTEMPTS}) atingido"
            )
            return False
        self._restart_attempts += 1
        import time
        time.sleep(_RESTART_DELAY_MS / 1000)
        logger.info(
            f"Tentando reiniciar câmera (tentativa {self._restart_attempts}/{_MAX_RESTART_ATTEMPTS})"
        )
        return self.start()

    def get_frame(self):
        """Read and return a horizontally flipped BGR frame, or None."""
        if self.connected:
            ret, frame = self.cap.read()
            if ret:
                return cv2.flip(frame, 1)
        return None

    def stop(self):
        """Release the camera handle.  Idempotent."""
        if self.cap is not None:
            try:
                self.cap.release()
            except Exception:
                pass
            self.cap = None
        self.camera_available = False
