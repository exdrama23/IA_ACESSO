"""Git automation commands (status, add, commit, push, pull)."""

import os
import re
import subprocess

from actions.registry import register
from utils.logger import logger


def find_git_repo() -> str | None:
    """Walk up from CWD to find the nearest .git directory."""
    parts = os.getcwd().split(os.sep)
    for i in range(len(parts), 0, -1):
        path = os.sep.join(parts[:i])
        if os.path.isdir(os.path.join(path, ".git")):
            return path
    return None
def handle_git(cmd: str = "", text_param: str = ""):
    """Run a git command. `cmd` is 'status'|'add'|'push'|'pull'|'commit'."""
    repo = find_git_repo()
    if not repo:
        logger.warning("Nenhum repositório Git encontrado")
        return

    git_actions = {
        "status": ["git", "status"],
        "add": ["git", "add", "."],
        "push": ["git", "push"],
        "pull": ["git", "pull"],
    }

    if cmd in git_actions:
        try:
            result = subprocess.run(
                git_actions[cmd], cwd=repo, capture_output=True, text=True, shell=True,
            )
            output = (result.stdout or result.stderr).strip()
            logger.info(f"Git {cmd}: {output[:200]}")
        except Exception as exc:
            logger.error(f"Erro no git {cmd}: {exc}")

    elif cmd == "commit" and text_param:
        msg = text_param.strip().strip('"').strip("'")
        try:
            subprocess.run(["git", "commit", "-m", msg], cwd=repo, shell=True)
            logger.info("Commit realizado")
        except Exception as exc:
            logger.error(f"Erro no git commit: {exc}")

