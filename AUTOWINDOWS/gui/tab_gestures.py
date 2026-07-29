"""GUI tab for configuring which action each hand gesture triggers."""

import customtkinter as ctk

from gesture.actions import available_actions
from utils.config_loader import get_gesture_map, save_config, load_config
from utils.logger import logger
from gui.widgets import StatusToast

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


class GesturesTab(ctk.CTkFrame):
    """Scrollable table: gesture → action mapping + param/shortcut/enable."""

    def __init__(self, master, controller=None, status_callback=None):
        super().__init__(master)
        self.controller = controller
        self.status_callback = status_callback
        self._rows: list[dict] = []
        self._build_ui()
        self._load_gestures()

    def _build_ui(self):
        header = ctk.CTkLabel(
            self, text="Configurar Gestos",
            font=ctk.CTkFont(size=18, weight="bold"),
        )
        header.pack(pady=(10, 2))

        # --- live indicator ---
        ind = ctk.CTkFrame(self, fg_color="transparent")
        ind.pack(pady=(0, 5))
        ctk.CTkLabel(ind, text="Gesto agora:", font=ctk.CTkFont(size=12),
                      text_color="gray").pack(side="left", padx=(0, 6))
        self._live_label = ctk.CTkLabel(
            ind, text="---", font=ctk.CTkFont(size=14, weight="bold"),
            text_color="#00cc66",
        )
        self._live_label.pack(side="left")
        self._live_action = ctk.CTkLabel(
            ind, text="", font=ctk.CTkFont(size=12),
            text_color="gray",
        )
        self._live_action.pack(side="left", padx=(10, 0))
        self._update_live()

        # table header
        head_frame = ctk.CTkFrame(self, fg_color="transparent")
        head_frame.pack(fill="x", padx=20, pady=(3, 0))

        cols = [
            ("Gesto", 100), ("Descrição", 130), ("Ação", 130),
            ("Parâmetro", 120), ("Atalho", 120), ("Ativo", 55),
        ]
        for text, w in cols:
            ctk.CTkLabel(
                head_frame, text=text, width=w, anchor="w",
                font=ctk.CTkFont(size=12, weight="bold"),
            ).pack(side="left", padx=(0, 4))

        self._scroll = ctk.CTkScrollableFrame(self, height=290)
        self._scroll.pack(fill="both", expand=True, padx=20, pady=5)

        self._actions_list = available_actions()

        # buttons row
        btn_frame = ctk.CTkFrame(self, fg_color="transparent")
        btn_frame.pack(pady=(3, 3))

        ctk.CTkButton(
            btn_frame, text="Salvar e Aplicar Agora", command=self._save_apply,
            width=180, height=36,
        ).pack(side="left", padx=(0, 10))

        ctk.CTkButton(
            btn_frame, text="Recarregar", command=self._load_gestures,
            width=120, height=36,
        ).pack(side="left")

        self.status_label = StatusToast(self)
        self.status_label.pack(pady=(0, 4))

    def _update_live(self):
        if self.controller:
            g = self.controller.last_gesture_name
            a = self.controller.last_gesture_action
            if g:
                emoji = GESTURE_EMOJIS.get(g, "")
                label = f"{emoji}  {g}" if emoji else g
                self._live_label.configure(text=label)
                self._live_action.configure(
                    text=f"→  {a}" if a else "→  (nenhuma)")
            else:
                self._live_label.configure(text="---")
                self._live_action.configure(text="")
        self.after(200, self._update_live)

    def _load_gestures(self):
        for widget in self._scroll.winfo_children():
            widget.destroy()
        self._rows.clear()

        try:
            entries = get_gesture_map()
        except Exception as exc:
            self.status_label.show(f"Erro ao carregar gestos: {exc}", "red")
            return

        for g in entries:
            gid = g.get("id", "")
            desc = g.get("description", "")
            current_action = g.get("action", "nothing")
            param = g.get("param", "")
            shortcut = g.get("shortcut", "")
            enabled = g.get("enabled", True)

            row = {"id": gid}
            frame = ctk.CTkFrame(self._scroll)
            frame.pack(fill="x", pady=2)

            emoji = GESTURE_EMOJIS.get(gid, "")
            label_text = f"{emoji}  {gid}" if emoji else gid
            ctk.CTkLabel(frame, text=label_text, width=100, anchor="w",
                          font=ctk.CTkFont(size=12)).pack(side="left", padx=(5, 4))

            ctk.CTkLabel(frame, text=desc, width=130, anchor="w",
                          font=ctk.CTkFont(size=11)).pack(side="left", padx=(0, 4))

            var_action = ctk.StringVar(value=current_action)
            dropdown = ctk.CTkOptionMenu(
                frame, values=self._actions_list, variable=var_action,
                width=130, dynamic_resizing=False,
            )
            dropdown.pack(side="left", padx=(0, 4))
            row["var_action"] = var_action

            var_param = ctk.StringVar(value=param)
            ctk.CTkEntry(frame, textvariable=var_param, width=120).pack(
                side="left", padx=(0, 4))
            row["var_param"] = var_param

            var_shortcut = ctk.StringVar(value=shortcut)
            ctk.CTkEntry(frame, textvariable=var_shortcut, width=120).pack(
                side="left", padx=(0, 4))
            row["var_shortcut"] = var_shortcut

            cb_var = ctk.BooleanVar(value=enabled)
            ctk.CTkCheckBox(frame, text="", variable=cb_var, width=55).pack(
                side="left")
            row["cb_var"] = cb_var

            self._rows.append(row)

        self.status_label.show("", "green", duration=0)

    def _save_config(self):
        """Write current _rows to config dict and return it."""
        config = load_config()
        gestures = config.get("gestures", [])
        for row in self._rows:
            gid = row["id"]
            for g in gestures:
                if g["id"] == gid:
                    g["action"] = row["var_action"].get()
                    g["param"] = row["var_param"].get()
                    g["shortcut"] = row["var_shortcut"].get()
                    g["enabled"] = row["cb_var"].get()
                    break
        save_config(config)
        return config

    def _save_apply(self):
        try:
            self._save_config()
            if self.controller:
                self.controller.reload_now()
            self.status_label.show("✓ Salvo e aplicado em tempo real", "green")
            if self.status_callback:
                self.status_callback("Gestos aplicados")
            logger.info("Gestos salvos e aplicados")
        except Exception as exc:
            self.status_label.show(f"Erro ao salvar: {exc}", "red")
            logger.error(f"Erro ao salvar gestos: {exc}")
