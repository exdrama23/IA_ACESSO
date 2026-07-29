"""Subprocess helpers for Windows, including CREATE_NO_WINDOW flag."""

import subprocess
from pathlib import Path

CREATE_NO_WINDOW = 0x08000000


def run_hidden(args: list[str | Path], **kwargs) -> subprocess.CompletedProcess:
    """Run a subprocess with CREATE_NO_WINDOW to suppress console flashes."""
    kwargs.setdefault("creationflags", CREATE_NO_WINDOW)
    kwargs.setdefault("shell", True)
    kwargs.setdefault("capture_output", True)
    return subprocess.run([str(a) for a in args], **kwargs)


def run_powershell(script: str) -> subprocess.CompletedProcess:
    """Run a PowerShell script with hidden window."""
    return run_hidden(["powershell", "-NoProfile", "-NonInteractive", "-c", script])
