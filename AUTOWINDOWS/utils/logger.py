"""Structured logging with colorized console output and daily log files."""

import logging
import sys
from datetime import datetime
from pathlib import Path

from logging.handlers import TimedRotatingFileHandler

_LOG_DIR = Path(__file__).resolve().parent.parent / "logs"
_LOG_DIR.mkdir(parents=True, exist_ok=True)

_LOG_FILE = str(_LOG_DIR / "autowindows.log")

_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_DATE_FORMAT = "%H:%M:%S"


class ColorFormatter(logging.Formatter):
    """Formatter that adds ANSI color codes based on log level."""

    COLORS = {
        "DEBUG": "\033[36m",
        "INFO": "\033[32m",
        "WARNING": "\033[33m",
        "ERROR": "\033[31m",
        "CRITICAL": "\033[41m",
    }
    RESET = "\033[0m"

    def format(self, record):
        color = self.COLORS.get(record.levelname, "")
        msg = super().format(record)
        return f"{color}{msg}{self.RESET}" if color else msg


def setup_logger(name: str = "autowindows") -> logging.Logger:
    """Create and return a configured logger with file and console handlers.

    Log files rotate daily and old files older than 7 days are cleaned up
    automatically.
    """
    logger = logging.getLogger(name)
    logger.setLevel(logging.DEBUG)

    file_handler = TimedRotatingFileHandler(
        _LOG_FILE,
        when="D",
        interval=1,
        backupCount=7,
        encoding="utf-8",
    )
    file_handler.setLevel(logging.DEBUG)
    file_handler.setFormatter(logging.Formatter(_FORMAT, _DATE_FORMAT))
    logger.addHandler(file_handler)

    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(ColorFormatter(_FORMAT, _DATE_FORMAT))
    logger.addHandler(console_handler)

    return logger


logger = setup_logger()
