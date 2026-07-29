"""GUI tab for live-adjustable gesture parameters."""

import customtkinter as ctk

from utils.config_loader import load_config, save_config, get_gesture_settings
from utils.logger import logger
from gui.widgets import StatusToast


_PARAMS = [
    ("pinch_threshold",      "Limiar da pinça",        0.001, 0.15,  3),
    ("ok_threshold",         "Limiar do OK",           0.001, 0.15,  3),
    ("point_x_threshold",    "Sensibilidade direita/esq.", 0.01, 0.30, 2),
    ("thumb_ext_threshold",  "Limiar polegar esticado",0.001, 0.10,  3),
    ("thumb_down_threshold", "Limiar polegar invertido",0.001, 0.15,  3),
    ("peace_spread",         "Abertura do peace",      0.001, 0.20,  3),
    ("drag_delay_seconds",   "Segundos p/ virar garra",  0.5,  10.0, 1),
    ("smoothing",            "Suavização do cursor",   0.05,  0.95,  2),
    ("min_move_px",          "Pixel mínimo de movimento",1,     20,   0),
    ("remap_x_min",          "X mínimo do dedo",       0.001, 0.40,  3),
    ("remap_x_max",          "X máximo do dedo",       0.60,  0.99,  3),
    ("remap_y_min",          "Y mínimo do dedo",       0.001, 0.40,  3),
    ("remap_y_max",          "Y máximo do dedo",       0.60,  0.99,  3),
    ("frame_skip",           "Saltar frames (1 = sem skip)", 1, 10, 0),
]


class SettingsTab(ctk.CTkFrame):
    """Sliders and number inputs for all gesture parameters."""

    def __init__(self, master, controller=None, status_callback=None):
        super().__init__(master)
        self.controller = controller
        self.status_callback = status_callback
        self._widgets: dict[str, ctk.CTkSlider | ctk.CTkEntry] = {}
        self._build_ui()
        self._load_values()

    def _build_ui(self):
        header = ctk.CTkLabel(
            self, text="Ajustes dos Gestos",
            font=ctk.CTkFont(size=18, weight="bold"),
        )
        header.pack(pady=(10, 5))

        sub = ctk.CTkLabel(
            self, text="Altere e clique em Salvar — o controller recarrega na hora",
            font=ctk.CTkFont(size=12), text_color="gray",
        )
        sub.pack(pady=(0, 10))

        scroll = ctk.CTkScrollableFrame(self, height=340)
        scroll.pack(fill="both", expand=True, padx=20)

        for key, label, vmin, vmax, decimals in _PARAMS:
            row = ctk.CTkFrame(scroll, fg_color="transparent")
            row.pack(fill="x", pady=4)

            lbl = ctk.CTkLabel(row, text=label, width=200, anchor="w",
                                font=ctk.CTkFont(size=12))
            lbl.pack(side="left")

            slider = ctk.CTkSlider(
                row, from_=vmin, to=vmax, number_of_steps=200, width=200,
            )
            slider.pack(side="left", padx=(10, 10))
            self._widgets[key] = slider

            entry_var = ctk.StringVar()
            entry = ctk.CTkEntry(row, textvariable=entry_var, width=70)
            entry.pack(side="left")
            self._widgets[key + "_entry"] = entry_var

            # Sync slider ↔ entry
            def make_sync(k=key, dec=decimals):
                def slider_to_entry(val):
                    self._widgets[k + "_entry"].set(f"{val:.{dec}f}")
                return slider_to_entry
            slider.configure(command=make_sync())

        # buttons
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(pady=(8, 5))

        ctk.CTkButton(
            btn_frame, text="Salvar e Aplicar", command=self._save,
            width=150, height=36,
        ).pack(side="left", padx=(0, 10))

        ctk.CTkButton(
            btn_frame, text="Recarregar", command=self._load_values,
            width=120, height=36,
        ).pack(side="left")

        self.status_label = StatusToast(self)
        self.status_label.pack(pady=(0, 5))

    def _load_values(self):
        try:
            s = get_gesture_settings()
        except Exception as exc:
            self.status_label.show(f"Erro: {exc}", "red")
            return

        for key, _, vmin, vmax, decimals in _PARAMS:
            val = s.get(key, vmin)
            slider = self._widgets[key]
            slider.set(val)
            self._widgets[key + "_entry"].set(f"{val:.{decimals}f}")
        self.status_label.show("", "green", duration=0)

    def _save(self):
        try:
            config = load_config()
            gs = config.setdefault("gesture_settings", {})

            for key, _, _, _, decimals in _PARAMS:
                val = float(self._widgets[key].get())
                gs[key] = round(val, decimals)

            save_config(config)
            self.status_label.show("✓ Salvo — aplicado em tempo real", "green")
            if self.controller:
                self.controller.reload_now()
            if self.status_callback:
                self.status_callback("Ajustes salvos")
            logger.info("Ajustes de gestos salvos e aplicados")
        except Exception as exc:
            self.status_label.show(f"Erro ao salvar: {exc}", "red")
            logger.error(f"Erro ao salvar ajustes: {exc}")
