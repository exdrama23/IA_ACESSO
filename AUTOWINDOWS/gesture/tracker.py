"""MediaPipe Hand Tracking — Tasks API with downscaled input for speed."""

from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.vision.core.vision_task_running_mode import VisionTaskRunningMode

from utils.logger import logger

# Downscale long side to this many px before inference — huge FPS gain
_PROCESS_SIZE = 320
_MODEL_PATH = str(Path(__file__).resolve().parent.parent / "hand_landmarker.task")


class HandTracker:
    """Hand landmark detector using Tasks API with small-input optimization."""

    def __init__(self, model_path=_MODEL_PATH):
        base = python.BaseOptions(model_asset_path=model_path)
        opts = vision.HandLandmarkerOptions(
            base_options=base,
            running_mode=VisionTaskRunningMode.VIDEO,
            num_hands=1,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.detector = vision.HandLandmarker.create_from_options(opts)
        self._timestamp = 0
        self._scale_x = 1.0
        self._scale_y = 1.0
        logger.info(f"HandTracker iniciado (process_size={_PROCESS_SIZE}, VIDEO mode)")

    def find_hands(self, frame, timestamp_ms=None):
        """Detect hand landmarks. Frame is BGR.

        Returns:
            landmarks: list of hands, each a list of 21 NormalizedLandmark
                       (coordinates relative to the ORIGINAL frame).
            results: raw result object.
        """
        h, w = frame.shape[:2]

        # ----- downscale for inference -----
        longest = max(h, w)
        if longest > _PROCESS_SIZE:
            scale = _PROCESS_SIZE / longest
            new_w, new_h = int(w * scale), int(h * scale)
            small = cv2.resize(frame, (new_w, new_h), interpolation=cv2.INTER_LINEAR)
            inv_scale_x = w / new_w
            inv_scale_y = h / new_h
        else:
            small = frame
            inv_scale_x = inv_scale_y = 1.0

        self._scale_x = inv_scale_x
        self._scale_y = inv_scale_y

        rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

        if timestamp_ms is None:
            self._timestamp += 33
            timestamp_ms = self._timestamp

        results = self.detector.detect_for_video(mp_image, timestamp_ms)

        # ----- landmarks are already normalized 0-1, aspect ratio preserved -----
        landmarks = []
        if results.hand_landmarks:
            for hand in results.hand_landmarks:
                landmarks.append(hand)

        return landmarks, results

    def close(self):
        self.detector.close()


def draw_landmarks(frame: cv2.Mat, landmarks, connection_dots: bool = True) -> cv2.Mat:
    """Draw hand landmarks + connections on a BGR frame (modifies in place)."""
    h, w = frame.shape[:2]
    if not landmarks:
        return frame

    # MediaPipe hand connections (index pairs)
    connections = [
        (0,1), (1,2), (2,3), (3,4),           # thumb
        (0,5), (5,6), (6,7), (7,8),           # index
        (0,9), (9,10), (10,11), (11,12),      # middle
        (0,13), (13,14), (14,15), (15,16),    # ring
        (0,17), (17,18), (18,19), (19,20),    # pinky
        (5,9), (9,13), (13,17),               # palm
    ]

    for hand in landmarks:
        pts = [(int(l.x * w), int(l.y * h)) for l in hand]

        # draw connections
        for a, b in connections:
            if a < len(pts) and b < len(pts):
                cv2.line(frame, pts[a], pts[b], (0, 255, 0), 2)

        # draw dots
        for cx, cy in pts:
            cv2.circle(frame, (cx, cy), 4, (255, 0, 0), -1)
            cv2.circle(frame, (cx, cy), 4, (255, 255, 255), 1)

    return frame
