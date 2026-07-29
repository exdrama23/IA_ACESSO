"""Classify hand landmarks into gesture names."""

import math

from utils.config_loader import get_gesture_settings


class GestureRecognizer:
    """Recognises gestures from a list of 21 MediaPipe NormalizedLandmarks."""

    def __init__(self):
        self.update_settings()

    def update_settings(self):
        s = get_gesture_settings()
        self.pinch_th = s["pinch_threshold"]
        self.ok_th = s["ok_threshold"]
        self.point_x_th = s["point_x_threshold"]
        self.thumb_ext_th = s["thumb_ext_threshold"]
        self.thumb_down_th = s["thumb_down_threshold"]
        self.peace_spread = s["peace_spread"]

    def get_gesture(self, hand_landmarks) -> str:
        """Return gesture name or 'none'."""

        lms = hand_landmarks

        t_tip = lms[4]; t_ip  = lms[3]; t_mcp = lms[2]
        i_tip = lms[8]; i_pip = lms[6]; i_mcp = lms[5]
        m_tip = lms[12]; m_pip = lms[10]
        r_tip = lms[16]; r_pip = lms[14]
        p_tip = lms[20]; p_pip = lms[18]

        # ---- finger-state helpers ----
        def up(tip, pip):
            return tip.y < pip.y

        i_up  = up(i_tip, i_pip)
        m_up  = up(m_tip, m_pip)
        r_up  = up(r_tip, r_pip)
        p_up  = up(p_tip, p_pip)

        # thumb — lateral comparison works for both hands
        thumb_ext = t_tip.x < t_ip.x - self.thumb_ext_th
        thumb_down = t_tip.x > t_ip.x + self.thumb_down_th

        extended = [i_up, m_up, r_up, p_up]
        ext_cnt = sum(extended)

        # ---- helpers ----
        def tip_dist(a, b):
            return math.hypot(a.x - b.x, a.y - b.y)

        pinch = tip_dist(t_tip, i_tip)

        # ---- gesture matching (priority order) ----

        # 1. Fist — nothing up
        if not thumb_ext and ext_cnt == 0:
            return "fist"

        # 2. Open palm — all 5
        if thumb_ext and ext_cnt == 4:
            return "open_palm"

        # 3. Thumbs up — only thumb
        if thumb_ext and ext_cnt == 0:
            return "thumbs_up"

        # 4. Thumbs down — thumb reversed
        if thumb_down and ext_cnt == 0:
            return "thumbs_down"

        # 5. OK — thumb+index circle, other 3 straight
        if pinch < self.ok_th and m_up and r_up and p_up:
            return "ok"

        # 6. Rock — index + pinky, middle + ring curled
        if i_up and p_up and not m_up and not r_up:
            return "rock"

        # 7. Pinch (click) — thumb+index close, only index up
        if pinch < self.pinch_th and i_up and not m_up and not r_up and not p_up:
            return "click"

        # 8. Thumb + index up (both extended, others curled)
        if thumb_ext and i_up and not m_up and not r_up and not p_up:
            return "thumb_index_up"

        # 9. Point left/right/move — only index up (thumb curled)
        if not thumb_ext and i_up and not m_up and not r_up and not p_up:
            if i_tip.x < i_mcp.x - self.point_x_th:
                return "point_left"
            if i_tip.x > i_mcp.x + self.point_x_th:
                return "point_right"
            return "move"

        # 10. Right-click vs Peace — index + middle up
        if i_up and m_up and not r_up and not p_up:
            spread = abs(i_tip.x - m_tip.x)
            if spread > self.peace_spread:
                return "peace"
            return "right_click"

        # 11. Four fingers (no thumb)
        if not thumb_ext and ext_cnt == 4:
            return "four_fingers"

        # 12. Scroll — 3+ fingers
        if ext_cnt >= 3:
            return "scroll"

        return "none"
