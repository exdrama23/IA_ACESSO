"""Multi-step macro sequencer for chaining actions."""

import threading
from utils.config_loader import get_macros
from utils.logger import logger
from actions.open_app import open_app, open_project
from actions.close_app import close_app, close_all
from actions.system import handle_system_action, execute_shell
from actions.search import search_web, search_youtube
from actions.type_text import type_text

def run_macro(macro_id: str = ""):
    """Execute a pre-defined macro by its ID (from config.json 'macros' key)."""
    if not macro_id:
        return
    macro = None
    for m in get_macros():
        if m.get("id") == macro_id and m.get("enabled", True):
            macro = m
            break
    if not macro:
        logger.warning(f"Macro não encontrada: {macro_id}")
        return

    logger.info(f"Executando macro: {macro_id}")

    def _execute():
        for step in macro["steps"]:
            action = step.get("action", "")
            params = step.get("params", {})
            try:
                if action == "open_app":
                    open_app(**params)
                elif action == "close_app":
                    close_app(**params)
                elif action == "close_all":
                    close_all()
                elif action == "system":
                    handle_system_action(**params)
                elif action == "execute":
                    execute_shell(**params)
                # Adicione outras ações conforme necessário
            except Exception as exc:
                logger.error(f"Erro no passo da macro {action}: {exc}")

    threading.Thread(target=_execute, daemon=True).start()


def force_organize():
    """Force organization of all loose files in Downloads."""
    from organizer.mover import force_organize as _org
    _org()
