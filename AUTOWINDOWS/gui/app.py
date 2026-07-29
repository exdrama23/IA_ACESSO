import customtkinter as ctk

from gui.camera_window import CameraWindow
from gui.tab_general import GeneralTab
from gui.tab_gestures import GesturesTab
from gui.tab_projects import ProjectsTab
from gui.tab_rules import RulesTab
from gui.tab_settings import SettingsTab
from utils.logger import logger


class MainWindow(ctk.CTk):
    def __init__(self, gesture_controller=None, download_watcher=None):
        super().__init__()

        self.gesture_controller = gesture_controller
        self.download_watcher = download_watcher

        ctk.set_appearance_mode("dark")
        ctk.set_default_color_theme("blue")

        self.title("AUTOWINDOWS")
        self.geometry("800x550")
        self.minsize(700, 450)

        self._build_ui()

        # open the floating camera preview
        self.camera_window = CameraWindow(self.gesture_controller) if self.gesture_controller else None

        self.protocol("WM_DELETE_WINDOW", self._on_close)

    def _build_ui(self):
        # Header
        header_frame = ctk.CTkFrame(self, height=50, corner_radius=0)
        header_frame.pack(fill="x", padx=0, pady=0)
        header_frame.pack_propagate(False)

        ctk.CTkLabel(
            header_frame,
            text="⚡ AUTOWINDOWS",
            font=ctk.CTkFont(size=22, weight="bold"),
        ).pack(side="left", padx=20)

        self.status_bar = ctk.CTkLabel(
            header_frame,
            text="Pronto",
            font=ctk.CTkFont(size=12),
            text_color="gray",
        )
        self.status_bar.pack(side="right", padx=20)

        # Tabs
        self.tab_view = ctk.CTkTabview(self)
        self.tab_view.pack(fill="both", expand=True, padx=10, pady=10)

        self.tab_gestures = self.tab_view.add("Gestos")
        self.tab_settings = self.tab_view.add("Sensibilidade")
        self.tab_rules = self.tab_view.add("Organização")
        self.tab_projects = self.tab_view.add("Projetos")
        self.tab_general = self.tab_view.add("Geral")

        self.gestures_tab = GesturesTab(self.tab_gestures, controller=self.gesture_controller, status_callback=self._set_status)
        self.gestures_tab.pack(fill="both", expand=True)

        self.settings_tab = SettingsTab(self.tab_settings, controller=self.gesture_controller, status_callback=self._set_status)
        self.settings_tab.pack(fill="both", expand=True)

        self.rules_tab = RulesTab(self.tab_rules, status_callback=self._set_status)
        self.rules_tab.pack(fill="both", expand=True)

        self.projects_tab = ProjectsTab(self.tab_projects, status_callback=self._set_status)
        self.projects_tab.pack(fill="both", expand=True)

        self.general_tab = GeneralTab(self.tab_general, status_callback=self._set_status)
        self.general_tab.pack(fill="both", expand=True)

        # Footer
        footer_frame = ctk.CTkFrame(self, height=35, corner_radius=0)
        footer_frame.pack(fill="x", padx=0, pady=0)
        footer_frame.pack_propagate(False)

        self.footer_label = ctk.CTkLabel(
            footer_frame,
            text="",
            font=ctk.CTkFont(size=11),
        )
        self.footer_label.pack(side="left", padx=15)

        # Status indicators
        indicator_frame = ctk.CTkFrame(footer_frame)
        indicator_frame.pack(side="right", padx=15)

        self.vision_indicator = ctk.CTkLabel(indicator_frame, text="👁️ Visão: Ativa", font=ctk.CTkFont(size=11))
        self.vision_indicator.pack(side="left", padx=10)

        self.wd_indicator = ctk.CTkLabel(indicator_frame, text="📁 Watchdog: Ativo", font=ctk.CTkFont(size=11))
        self.wd_indicator.pack(side="left", padx=10)

    def _set_status(self, message: str):
        self.status_bar.configure(text=message)
        logger.info(f"GUI: {message}")

    def update_indicators(self, gesture_active: bool = None, watchdog_active: bool = None,
                           camera_ok: bool = None):
        if gesture_active is not None:
            status = "Ativa" if gesture_active else "Inativa"
            self.vision_indicator.configure(text=f"👁️ Visão: {status}")
        if camera_ok is not None:
            if camera_ok:
                self.vision_indicator.configure(text_color="white")
            else:
                self.vision_indicator.configure(text="👁️ Câmera: Indisponível",
                                                 text_color="red")
        if watchdog_active is not None:
            status = "Ativo" if watchdog_active else "Inativo"
            self.wd_indicator.configure(text=f"📁 Watchdog: {status}")

    def _on_close(self):
        if hasattr(self, "camera_window") and self.camera_window:
            self.camera_window.close()
        self.destroy()
