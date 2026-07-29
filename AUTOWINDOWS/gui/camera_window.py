"""Floating camera preview window — independent of the main GUI."""

import cv2
import customtkinter as ctk
from PIL import Image

from utils.logger import logger

GESTURE_EMOJIS: dict[str, str] = {
    "move": "\U0001F446",
    "click": "\U0001F90F",
    "right_click": "\U0001F590",
    "scroll": "\U0001F4DC",
    "fist": "\u270A",
    "thumbs_up": "\U0001F44D",
    "thumbs_down": "\U0001F44E",
    "four_fingers": "\U0001F91A",
    "open_palm": "\U0001F91A",
    "peace": "\u270C\uFE0F",
    "ok": "\U0001F44C",
    "rock": "\U0001F918",
    "point_left": "\U0001F448",
    "point_right": "\U0001F449",
    "thumb_index_up": "\u270B",
}

PREVIEW_W, PREVIEW_H = 320, 240


class CameraWindow(ctk.CTkToplevel):
    """Floating window showing the webcam feed with hand landmarks.

    Created without a master so it does NOT minimise when the main window
    minimises.  Call ``close()`` to destroy it.
    """

    def __init__(self, controller):
        super().__init__()          # no master → fully independent
        self.controller = controller
        self._update_running = True

        self.title("👁️ Câmera - AUTOWINDOWS")
        self.resizable(False, False)
        self.transient(None)                 # break any parent relationship
        self.attributes("-topmost", True)    # stay visible even when clicking elsewhere

        # bottom-right corner
        screen_w = self.winfo_screenwidth()
        screen_h = self.winfo_screenheight()
        x = screen_w - PREVIEW_W - 40
        y = screen_h - PREVIEW_H - 120
        self.geometry(f"{PREVIEW_W + 40}x{PREVIEW_H + 90}+{x}+{y}")

        self._build_ui()

        # close = hide, not destroy
        self.protocol("WM_DELETE_WINDOW", self.hide)

        # fade in
        self.attributes("-alpha", 0.0)
        self.after(20, self._fade_in)

        # bring to front after creation
        self.after(100, self.lift)

        logger.info("CameraWindow criada")

    def _build_ui(self):
        # preview area
        pf = ctk.CTkFrame(self, width=PREVIEW_W, height=PREVIEW_H,
                          corner_radius=8)
        pf.pack(pady=(10, 5))
        pf.pack_propagate(False)

        self._cam_label = ctk.CTkLabel(pf, text="🎥 Aguardando câmera…",
                                        font=ctk.CTkFont(size=13))
        self._cam_label.pack(expand=True, fill="both")

        # gesture / action info
        info = ctk.CTkFrame(self, fg_color="transparent")
        info.pack(fill="x", padx=15, pady=(0, 5))

        self._gesture_label = ctk.CTkLabel(
            info, text="", font=ctk.CTkFont(size=16, weight="bold"),
        )
        self._gesture_label.pack()

        self._action_label = ctk.CTkLabel(
            info, text="", font=ctk.CTkFont(size=13),
            text_color="gray",
        )
        self._action_label.pack()

        # hide / close button
        ctk.CTkButton(
            self, text="Ocultar", command=self.hide,
            width=100, height=28,
            font=ctk.CTkFont(size=12),
        ).pack(pady=(0, 8))

        # start the update loop
        self.after(30, self._update)

    def _update(self):
        if not self._update_running:
            return
        if self.controller:
            if not self.controller.running or not self.controller.camera_ok:
                self._cam_label.configure(image="", text="⚠️ Câmera indisponível")
                self._gesture_label.configure(text="")
                self._action_label.configure(text="")
            else:
                bgr = self.controller.last_annotated_frame
                if bgr is not None:
                    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
                    pil_img = Image.fromarray(rgb).resize(
                        (PREVIEW_W, PREVIEW_H), Image.LANCZOS,
                    )
                    ctk_img = ctk.CTkImage(
                        light_image=pil_img, dark_image=pil_img,
                        size=(PREVIEW_W, PREVIEW_H),
                    )
                    self._cam_label.configure(image=ctk_img, text="")

                gesture = self.controller.last_gesture_name
                action = self.controller.last_gesture_action
                if gesture:
                    emoji = GESTURE_EMOJIS.get(gesture, "")
                    gtext = f"{emoji}  {gesture}" if emoji else gesture
                    self._gesture_label.configure(text=gtext)
                    self._action_label.configure(
                        text=f"Ação: {action}" if action else "Ação: (nenhuma)")
                else:
                    self._gesture_label.configure(text="")
                    self._action_label.configure(text="")

        self.after(30, self._update)

    def _fade_in(self):
        a = self.attributes("-alpha")
        if a < 1.0:
            self.attributes("-alpha", min(a + 0.08, 1.0))
            self.after(20, self._fade_in)

    def hide(self):
        self.withdraw()

    def show(self):
        self.deiconify()
        self.lift()

    def close(self):
        """Destroy the window for good."""
        self._update_running = False
        self.destroy()
