"""Web search actions that open Google/YouTube in the browser."""

import subprocess
import urllib.parse

from actions.registry import register
from utils.logger import logger

_CHROME = r"C:\Program Files\Google\Chrome\Application\chrome.exe"


def _open_url(url: str):
    try:
        subprocess.Popen([_CHROME, url], shell=True)
    except Exception as exc:
        logger.error(f"Erro ao abrir URL: {exc}")


def search_web(query: str = ""):
    """Search Google for the given query."""
    if not query:
        return
    encoded = urllib.parse.quote_plus(query.strip().strip('"'))
    _open_url(f"https://www.google.com/search?q={encoded}")
    logger.info(f"Pesquisa Google: {query}")
def search_youtube(query: str = ""):
    """Search YouTube for the given query."""
    if not query:
        return
    encoded = urllib.parse.quote_plus(query.strip().strip('"'))
    _open_url(f"https://www.youtube.com/results?search_query={encoded}")
    logger.info(f"Pesquisa YouTube: {query}")

