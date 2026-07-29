"""GUI tab for managing favorite project directories."""

import os
import tkinter as tk
from tkinter import ttk, filedialog

import customtkinter as ctk

from utils.config_loader import load_config, save_config


class ProjectsTab(ctk.CTkFrame):
    """Tab that lists developer projects and allows CRUD operations."""

    def __init__(self, master, status_callback=None):
        super().__init__(master)
        self.status_callback = status_callback
        self.projects = []
        self._build_ui()
        self._load_projects()

    def _build_ui(self):
        header = ctk.CTkLabel(self, text="Projetos Favoritos", font=ctk.CTkFont(size=18, weight="bold"))
        header.pack(pady=(10, 5))
        ctk.CTkLabel(
            self, text="Projetos que podem ser abertos por comando:", font=ctk.CTkFont(size=13),
        ).pack(anchor="w", padx=15)

        container = ctk.CTkFrame(self)
        container.pack(fill="both", expand=True, padx=10, pady=5)
        columns = ("name", "path", "enabled")
        self.tree = ttk.Treeview(container, columns=columns, show="headings", selectmode="browse")
        self.tree.heading("name", text="Nome")
        self.tree.heading("path", text="Caminho")
        self.tree.heading("enabled", text="Ativo")
        self.tree.column("name", width=150)
        self.tree.column("path", width=400)
        self.tree.column("enabled", width=60)

        scrollbar = ttk.Scrollbar(container, orient="vertical", command=self.tree.yview)
        self.tree.configure(yscrollcommand=scrollbar.set)
        self.tree.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        self.tree.bind("<Double-1>", self._edit_project)

        btn_frame = ctk.CTkFrame(self)
        btn_frame.pack(fill="x", padx=10, pady=10)
        ctk.CTkButton(btn_frame, text="+ Adicionar", command=self._add_project, width=120).pack(side="left", padx=5)
        ctk.CTkButton(btn_frame, text="Remover", command=self._remove_project, width=120).pack(side="left", padx=5)
        ctk.CTkButton(btn_frame, text="Selecionar Pasta", command=self._browse_folder, width=150).pack(side="left", padx=5)
        ctk.CTkButton(btn_frame, text="Salvar", command=self._save_projects, width=120).pack(side="left", padx=5)

    def _load_projects(self):
        for item in self.tree.get_children():
            self.tree.delete(item)
        config = load_config()
        self.projects = config.get("projects", [])
        for proj in self.projects:
            self.tree.insert("", "end", values=(
                proj.get("name", ""), proj.get("path", ""),
                "✓" if proj.get("enabled", True) else "✗",
            ))

    def _add_project(self):
        dialog = ProjectDialog(self, title="Novo Projeto")
        if dialog.result:
            self.projects.append(dialog.result)
            self._save_projects()

    def _edit_project(self, event=None):
        selected = self.tree.selection()
        if not selected:
            return
        idx = self.tree.index(selected[0])
        if idx < len(self.projects):
            dialog = ProjectDialog(self, title="Editar Projeto", data=self.projects[idx])
            if dialog.result:
                self.projects[idx] = dialog.result
                self._save_projects()

    def _remove_project(self):
        selected = self.tree.selection()
        if not selected:
            return
        idx = self.tree.index(selected[0])
        if idx < len(self.projects):
            del self.projects[idx]
            self._save_projects()

    def _browse_folder(self):
        folder = filedialog.askdirectory(title="Selecionar Pasta do Projeto")
        if folder:
            self.projects.append({"name": os.path.basename(folder), "path": folder, "enabled": True})
            self._save_projects()

    def _save_projects(self):
        config = load_config()
        config["projects"] = self.projects
        save_config(config)
        self._load_projects()
        if self.status_callback:
            self.status_callback("Projetos salvos")


class ProjectDialog(ctk.CTkToplevel):
    """Dialog for adding/editing a project entry."""

    def __init__(self, parent, title="Projeto", data=None):
        super().__init__(parent)
        self.title(title)
        self.result = None
        self.transient(parent)
        self.grab_set()
        self._build_ui(data)
        self.geometry("450x250")

    def _build_ui(self, data):
        ctk.CTkLabel(self, text="Nome do projeto:").pack(pady=(15, 0))
        self.name_entry = ctk.CTkEntry(self, width=400)
        self.name_entry.pack(pady=5)
        if data:
            self.name_entry.insert(0, data.get("name", ""))

        ctk.CTkLabel(self, text="Caminho da pasta:").pack(pady=(10, 0))
        path_frame = ctk.CTkFrame(self)
        path_frame.pack(pady=5)
        self.path_entry = ctk.CTkEntry(path_frame, width=320)
        self.path_entry.pack(side="left", padx=(0, 5))
        ctk.CTkButton(path_frame, text="...", command=self._browse, width=40).pack(side="left")
        if data:
            self.path_entry.insert(0, data.get("path", ""))

        self.enabled_var = ctk.BooleanVar(value=data.get("enabled", True) if data else True)
        ctk.CTkCheckBox(self, text="Projeto ativo", variable=self.enabled_var).pack(pady=10)

        btn_frame = ctk.CTkFrame(self)
        btn_frame.pack(pady=10)
        ctk.CTkButton(btn_frame, text="Cancelar", command=self.destroy, width=100).pack(side="left", padx=10)
        ctk.CTkButton(btn_frame, text="Salvar", command=self._save, width=100).pack(side="left", padx=10)

    def _browse(self):
        folder = filedialog.askdirectory(title="Selecionar Pasta")
        if folder:
            self.path_entry.delete(0, "end")
            self.path_entry.insert(0, folder)

    def _save(self):
        name = self.name_entry.get().strip()
        path = self.path_entry.get().strip()
        if not name or not path:
            return
        self.result = {"name": name, "path": path, "enabled": self.enabled_var.get()}
        self.destroy()
