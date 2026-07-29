"""GUI tab for general settings: watchdog, watch folder, startup."""

import tkinter as tk
from tkinter import filedialog

import customtkinter as ctk

from utils.config_loader import load_config, save_config
from utils.logger import logger
from utils.scheduler import enable_startup, disable_startup, is_startup_enabled
from gui.widgets import StatusToast


class GeneralTab(ctk.CTkFrame):
    """Tab with global configuration options."""

    def __init__(self, master, status_callback=None):
        super().__init__(master)
        self.status_callback = status_callback
        self._build_ui()
        self._load_config()

    def _build_ui(self):
        header = ctk.CTkLabel(
            self, text="Configurações Gerais",
            font=ctk.CTkFont(size=18, weight="bold"),
        )
        header.pack(pady=(10, 15))

        # --- Watchdog section ---
        wd_frame = ctk.CTkFrame(self)
        wd_frame.pack(fill="x", padx=20, pady=5)
        ctk.CTkLabel(
            wd_frame, text="Organizador de Downloads (Watchdog):",
            font=ctk.CTkFont(size=13),
        ).pack(anchor="w")

        wd_row = ctk.CTkFrame(wd_frame)
        wd_row.pack(fill="x", pady=5)
        self.wd_var = ctk.BooleanVar(value=True)
        ctk.CTkCheckBox(
            wd_row, text="Watchdog ativo", variable=self.wd_var,
        ).pack(side="left", padx=(0, 20))
        ctk.CTkLabel(wd_row, text="Delay (s):").pack(side="left")
        self.delay_entry = ctk.CTkEntry(wd_row, width=60)
        self.delay_entry.pack(side="left", padx=5)

        # --- Watch folder ---
        folder_frame = ctk.CTkFrame(self)
        folder_frame.pack(fill="x", padx=20, pady=5)
        ctk.CTkLabel(
            folder_frame, text="Pasta vigiada:",
            font=ctk.CTkFont(size=13),
        ).pack(anchor="w")

        folder_row = ctk.CTkFrame(folder_frame)
        folder_row.pack(fill="x", pady=5)
        self.folder_var = ctk.StringVar()
        self.folder_entry = ctk.CTkEntry(
            folder_row, textvariable=self.folder_var, width=350,
        )
        self.folder_entry.pack(side="left", padx=(0, 5))
        ctk.CTkButton(
            folder_row, text="...", command=self._browse_folder, width=40,
        ).pack(side="left")
        ctk.CTkButton(
            folder_row, text="Usar Downloads",
            command=self._reset_folder, width=120,
        ).pack(side="left", padx=(5, 0))

        # --- Startup ---
        startup_frame = ctk.CTkFrame(self)
        startup_frame.pack(fill="x", padx=20, pady=5)
        ctk.CTkLabel(
            startup_frame, text="Inicialização:",
            font=ctk.CTkFont(size=13),
        ).pack(anchor="w")
        self.startup_var = ctk.BooleanVar(value=False)
        ctk.CTkCheckBox(
            startup_frame, text="Iniciar com o Windows",
            variable=self.startup_var,
        ).pack(anchor="w", pady=5)

        # --- Save button ---
        ctk.CTkButton(
            self, text="Salvar Configurações",
            command=self._save_config, width=200, height=40,
        ).pack(pady=20)

        self.status_label = StatusToast(self)
        self.status_label.pack()

    def _load_config(self):
        config = load_config()

        wd = config.get("watchdog", {})
        self.wd_var.set(wd.get("enabled", True))
        self.delay_entry.delete(0, "end")
        self.delay_entry.insert(0, str(wd.get("delay_seconds", 3)))
        self.folder_var.set(wd.get("folder", ""))

        startup = config.get("startup", {})
        self.startup_var.set(startup.get("enabled", False) or is_startup_enabled())

    def _browse_folder(self):
        folder = filedialog.askdirectory(title="Selecionar pasta para vigiar")
        if folder:
            self.folder_var.set(folder)

    def _reset_folder(self):
        """Reset to default Downloads folder."""
        from pathlib import Path
        self.folder_var.set(str(Path.home() / "Downloads"))

    def _save_config(self):
        config = load_config()

        try:
            delay = int(self.delay_entry.get().strip())
        except ValueError:
            delay = 3

        folder = self.folder_var.get().strip()

        config["watchdog"] = {
            "enabled": self.wd_var.get(),
            "folder": folder,
            "delay_seconds": delay,
            "temp_extensions": config.get("watchdog", {}).get(
                "temp_extensions",
                [".crdownload", ".part", ".tmp", ".download", ".opdownload"],
            ),
        }

        config.setdefault("startup", {})["enabled"] = self.startup_var.get()

        if self.startup_var.get():
            enable_startup()
        else:
            disable_startup()

        save_config(config)
        self.status_label.show("✓ Configurações salvas e aplicadas", "green")
        if self.status_callback:
            self.status_callback("Configurações salvas")
        logger.info("Configurações gerais salvas")
