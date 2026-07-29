"""Close applications by name or kill all user processes."""

import psutil

from actions.registry import register
from utils.logger import logger

_APP_ALIASES: dict[str, str] = {
    "chrome": "chrome.exe",
    "google": "chrome.exe",
    "vscode": "code.exe",
    "visual studio": "code.exe",
    "code": "code.exe",
    "vs code": "code.exe",
    "terminal": "cmd.exe",
    "cmd": "cmd.exe",
    "explorer": "explorer.exe",
    "explorador": "explorer.exe",
    "spotify": "spotify.exe",
    "discord": "discord.exe",
    "whatsapp": "whatsapp.exe",
    "slack": "slack.exe",
    "telegram": "telegram.exe",
    "obsidian": "obsidian.exe",
    "notion": "notion.exe",
    "figma": "figma.exe",
    "docker": "Docker Desktop.exe",
    "postman": "postman.exe",
    "outlook": "outlook.exe",
    "word": "WINWORD.EXE",
    "excel": "EXCEL.EXE",
    "powerpoint": "POWERPNT.EXE",
    "steam": "steam.exe",
    "calculadora": "calculator.exe",
}

_KEEP: set[str] = {"explorer.exe", "taskmgr.exe", "autowindows.exe"}
def close_app(name: str = ""):
    """Kill a running application by its alias."""
    if not name:
        return
    exe_name = _APP_ALIASES.get(name.lower().strip())
    if exe_name is None:
        logger.warning(f"Alias não encontrado para fechar: {name}")
        return

    killed = False
    for proc in psutil.process_iter(["pid", "name"]):
        try:
            if proc.info["name"] and proc.info["name"].lower() == exe_name.lower():
                proc.kill()
                killed = True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    if killed:
        logger.info(f"Fechado: {name}")
    else:
        logger.info(f"{name} não estava em execução")


def close_all():
    """Kill all user processes except critical system processes."""
    count = 0
    for proc in psutil.process_iter(["pid", "name"]):
        try:
            proc_name = proc.info["name"]
            if proc_name and proc_name.lower() not in _KEEP:
                proc.kill()
                count += 1
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            continue

    logger.info(f"Fechados {count} processos")

