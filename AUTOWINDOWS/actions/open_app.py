"""Launch applications and open projects by name."""

import subprocess
from pathlib import Path

from actions.registry import register
from utils.config_loader import get_projects
from utils.logger import logger

APPS: dict[str, str] = {
    "chrome": r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "google": r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "vscode": "code",
    "visual studio": "code",
    "visual studio code": "code",
    "vs code": "code",
    "code": "code",
    "terminal": "cmd.exe",
    "cmd": "cmd.exe",
    "prompt": "cmd.exe",
    "explorer": "explorer",
    "explorador": "explorer",
    "arquivos": "explorer",
    "spotify": "spotify",
    "discord": "discord",
    "whatsapp": "whatsapp",
    "slack": "slack",
    "telegram": "telegram",
    "obsidian": str(Path.home() / "AppData/Local/Obsidian/Obsidian.exe"),
    "notion": "notion",
    "figma": "figma",
    "docker": r"C:\Program Files\Docker\Docker\Docker Desktop.exe",
    "github desktop": str(Path.home() / "AppData/Local/GitHubDesktop/GitHubDesktop.exe"),
    "postman": "postman",
    "insomnia": "insomnia",
    "outlook": "outlook",
    "email": "outlook",
    "word": "winword",
    "excel": "excel",
    "powerpoint": "powerpoint",
    "calculadora": "calc",
    "calendário": "outlookcal",
    "steam": "steam",
    "youtube": "chrome",
}


def _resolve_app(name: str) -> str | None:
    """Resolve an app alias to an executable path, checking common Windows locations."""
    target = name.lower().strip()
    path = APPS.get(target)
    
    if target == "chrome" or target == "google":
        # Check standard locations for Chrome
        possible_paths = [
            Path(r"C:\Program Files\Google\Chrome\Application\chrome.exe"),
            Path(r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe"),
            Path(Path.home() / r"AppData\Local\Google\Chrome\Application\chrome.exe")
        ]
        for p in possible_paths:
            if p.exists():
                return str(p)
    
    return path


def open_app(name: str = ""):
    """Launch an application by name alias."""
    if not name:
        return
    path = _resolve_app(name)
    if path is None:
        logger.warning(f"App não encontrado: {name}")
        return
    
    try:
        # Using list for Popen to handle spaces in paths correctly without shell=True issues
        subprocess.Popen([str(path)], creationflags=subprocess.CREATE_NO_WINDOW if path.endswith(".exe") else 0)
        logger.info(f"Aberto: {name} ({path})")
    except Exception as exc:
        # Fallback to shell=True with quotes if list execution fails
        try:
            subprocess.Popen(f'"{path}"', shell=True)
            logger.info(f"Aberto via shell: {name} ({path})")
        except Exception:
            logger.error(f"Erro ao abrir {name}: {exc}")


def open_project(name: str = ""):
    """Open a project folder in VS Code by name (partial match)."""
    if not name:
        return
    for proj in get_projects():
        if not proj.get("enabled", True):
            continue
        proj_name = proj["name"].lower()
        if name.lower() in proj_name or proj_name in name.lower():
            path = Path(proj["path"])
            if path.is_dir():
                try:
                    subprocess.Popen(["code", str(path)], shell=True)
                    logger.info(f"Projeto aberto: {proj['name']} ({path})")
                    return
                except Exception as exc:
                    logger.error(f"Erro ao abrir projeto {proj['name']}: {exc}")
                    return
    
    logger.warning(f"Projeto {name} não encontrado")


register("open_app", open_app)
register("open_project", open_project)
