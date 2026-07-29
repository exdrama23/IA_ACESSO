"""GUI tab for managing file-organization rules."""

import threading
from tkinter import ttk

import customtkinter as ctk

from utils.config_loader import load_config, save_config
from organizer.mover import force_organize
from gui.widgets import StatusToast


class RulesTab(ctk.CTkFrame):
    """Tab that displays and edits file-type → folder mapping rules."""

    def __init__(self, master, status_callback=None):
        super().__init__(master)
        self.status_callback = status_callback
        self.rules = {}
        self._build_ui()
        self._load_rules()

    def _build_ui(self):
        header = ctk.CTkLabel(
            self, text="Regras de Organização",
            font=ctk.CTkFont(size=18, weight="bold"),
        )
        header.pack(pady=(10, 5))
        ctk.CTkLabel(
            self, text="Extensão → Pasta de destino:",
            font=ctk.CTkFont(size=13),
        ).pack(anchor="w", padx=15)

        container = ctk.CTkFrame(self)
        container.pack(fill="both", expand=True, padx=10, pady=5)
        columns = ("extensions", "folder")
        self.tree = ttk.Treeview(
            container, columns=columns, show="headings", selectmode="browse",
        )
        self.tree.heading("extensions", text="Extensões")
        self.tree.heading("folder", text="Pasta de Destino")
        self.tree.column("extensions", width=350)
        self.tree.column("folder", width=200)

        scrollbar = ttk.Scrollbar(container, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        self.tree.bind("<Double-1>", self._edit_rule)

        btn_frame = ctk.CTkFrame(self)
        btn_frame.pack(fill="x", padx=10, pady=10)
        ctk.CTkButton(
            btn_frame, text="+ Adicionar Regra", command=self._add_rule, width=150,
        ).pack(side="left", padx=5)
        ctk.CTkButton(
            btn_frame, text="Remover", command=self._remove_rule, width=150,
        ).pack(side="left", padx=5)
        ctk.CTkButton(
            btn_frame, text="Salvar", command=self._save_rules, width=150,
        ).pack(side="left", padx=5)
        ctk.CTkButton(
            btn_frame, text="Organizar Agora", command=self._organize_now, width=150,
        ).pack(side="left", padx=5)

        self.status_label = StatusToast(self)
        self.status_label.pack(pady=(3, 0))

    def _load_rules(self):
        for item in self.tree.get_children():
            self.tree.delete(item)
        config = load_config()
        self.rules = config.get("rules", {})
        for folder, exts in self.rules.items():
            ext_str = ", ".join(exts) if exts else "(catch-all)"
            self.tree.insert("", "end", values=(ext_str, folder))

    def _add_rule(self):
        dialog = RuleDialog(self, title="Nova Regra")
        if dialog.result:
            folder, extensions = dialog.result
            self.rules[folder] = [e.strip().lower() for e in extensions.split(",") if e.strip()]
            self._save_rules()

    def _edit_rule(self, event=None):
        selected = self.tree.selection()
        if not selected:
            return
        idx = self.tree.index(selected[0])
        folders = list(self.rules.keys())
        if idx < len(folders):
            folder = folders[idx]
            exts = ", ".join(self.rules[folder])
            dialog = RuleDialog(self, title="Editar Regra", data=(folder, exts))
            if dialog.result:
                new_folder, new_exts = dialog.result
                if new_folder != folder:
                    del self.rules[folder]
                self.rules[new_folder] = [e.strip().lower() for e in new_exts.split(",") if e.strip()]
                self._save_rules()

    def _remove_rule(self):
        selected = self.tree.selection()
        if not selected:
            return
        idx = self.tree.index(selected[0])
        folders = list(self.rules.keys())
        if idx < len(folders):
            del self.rules[folders[idx]]
            self._save_rules()

    def _organize_now(self):
        """Run force_organize in a thread to avoid freezing the GUI."""
        self.status_label.show("Organizando...", "orange", duration=0)
        def _run():
            try:
                force_organize()
                self.after(0, lambda: self.status_label.show("✓ Organizado!", "green"))
                if self.status_callback:
                    self.status_callback("Organização concluída")
            except Exception as exc:
                self.after(0, lambda: self.status_label.show(f"Erro: {exc}", "red"))
        threading.Thread(target=_run, daemon=True).start()

    def _save_rules(self):
        config = load_config()
        config["rules"] = self.rules
        save_config(config)
        self._load_rules()
        self.status_label.show("✓ Regras salvas", "green")
        if self.status_callback:
            self.status_callback("Regras salvas")


class RuleDialog(ctk.CTkToplevel):
    """Dialog for adding/editing a file-type rule."""

    def __init__(self, parent, title="Regra", data=None):
        super().__init__(parent)
        self.title(title)
        self.result = None
        self.transient(parent)
        self.grab_set()
        self._build_ui(data)
        self.geometry("400x200")

    def _build_ui(self, data):
        ctk.CTkLabel(self, text="Nome da pasta:").pack(pady=(15, 0))
        self.folder_entry = ctk.CTkEntry(self, width=350)
        self.folder_entry.pack(pady=5)
        if data:
            self.folder_entry.insert(0, data[0])

        ctk.CTkLabel(self, text="Extensões (separadas por vírgula):").pack(pady=(10, 0))
        self.exts_entry = ctk.CTkEntry(self, width=350)
        self.exts_entry.pack(pady=5)
        if data:
            self.exts_entry.insert(0, data[1])

        btn_frame = ctk.CTkFrame(self)
        btn_frame.pack(pady=15)
        ctk.CTkButton(btn_frame, text="Cancelar", command=self.destroy, width=100).pack(side="left", padx=10)
        ctk.CTkButton(btn_frame, text="Salvar", command=self._save, width=100).pack(side="left", padx=10)

    def _save(self):
        folder = self.folder_entry.get().strip()
        exts = self.exts_entry.get().strip()
        if not folder:
            return
        self.result = (folder, exts)
        self.destroy()
