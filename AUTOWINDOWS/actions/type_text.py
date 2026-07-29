"""Type text into the currently focused window."""

import time

import pyperclip

from actions.registry import register
from utils.logger import logger
def type_text(text: str = ""):
    """Paste the given text via clipboard + Ctrl+V."""
    if not text:
        return
    try:
        pyperclip.copy(text)
        time.sleep(0.3)
        import pyautogui
        pyautogui.hotkey("ctrl", "v")
        logger.info(f"Texto digitado: {text[:50]}...")
    except Exception as exc:
        logger.error(f"Erro ao digitar texto: {exc}")

