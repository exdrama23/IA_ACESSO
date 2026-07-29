"""Windows Registry startup management for AUTOWINDOWS."""

import sys
import winreg
from pathlib import Path

from utils.logger import logger

_REGISTRY_KEY = r"Software\Microsoft\Windows\CurrentVersion\Run"
_APP_NAME = "AUTOWINDOWS"


def is_startup_enabled() -> bool:
    """Check if AUTOWINDOWS is registered to run at startup."""
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, _REGISTRY_KEY, 0, winreg.KEY_READ)
        winreg.QueryValueEx(key, _APP_NAME)
        winreg.CloseKey(key)
        return True
    except FileNotFoundError:
        return False
    except Exception:
        return False


def enable_startup():
    """Register AUTOWINDOWS to run at Windows startup."""
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, _REGISTRY_KEY, 0, winreg.KEY_SET_VALUE)
        exe_path = Path(sys.executable)
        script_path = Path(__file__).resolve().parent.parent / "main.py"
        winreg.SetValueEx(key, _APP_NAME, 0, winreg.REG_SZ, f'"{exe_path}" "{script_path}"')
        winreg.CloseKey(key)
        logger.info("Startup ativado")
    except Exception as exc:
        logger.error(f"Erro ao ativar startup: {exc}")


def disable_startup():
    """Remove AUTOWINDOWS from Windows startup registration."""
    try:
        key = winreg.OpenKey(winreg.HKEY_CURRENT_USER, _REGISTRY_KEY, 0, winreg.KEY_SET_VALUE)
        try:
            winreg.DeleteValue(key, _APP_NAME)
        except FileNotFoundError:
            pass
        winreg.CloseKey(key)
        logger.info("Startup desativado")
    except Exception as exc:
        logger.error(f"Erro ao desativar startup: {exc}")
