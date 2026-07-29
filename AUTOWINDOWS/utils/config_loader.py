"""Centralized configuration loader with pathlib and caching."""

import json
from pathlib import Path

_CONFIG_PATH: Path = Path(__file__).resolve().parent.parent / "config.json"


def config_path() -> Path:
    """Return the path to the config file."""
    return _CONFIG_PATH


def load_config() -> dict:
    """Load config.json into a cached dict."""
    try:
        return json.loads(_CONFIG_PATH.read_text(encoding="utf-8"))
    except FileNotFoundError:
        return {}
    except json.JSONDecodeError:
        return {}


def reload_config():
    """Placeholder — load_config always reads fresh from disk."""


def get_commands() -> list:
    """Return the commands list from config."""
    return load_config().get("commands", [])


def get_rules() -> dict:
    """Return the rules dict from config."""
    return load_config().get("rules", {})


def get_projects() -> list:
    """Return the projects list from config."""
    return load_config().get("projects", [])


def get_macros() -> list:
    """Return the macros list from config."""
    return load_config().get("macros", [])


def get_gesture_map() -> list:
    """Return the gestures list from config."""
    return load_config().get("gestures", [])


def get_gesture_settings() -> dict:
    """Return gesture_settings dict with defaults for any missing keys."""
    DEFAULTS = {
        "pinch_threshold": 0.045,
        "point_x_threshold": 0.10,
        "thumb_ext_threshold": 0.02,
        "thumb_down_threshold": 0.04,
        "drag_delay_seconds": 5.0,
        "ok_threshold": 0.05,
        "peace_spread": 0.06,
        "smoothing": 0.55,
        "min_move_px": 1,
        "remap_x_min": 0.08,
        "remap_x_max": 0.92,
        "remap_y_min": 0.10,
        "remap_y_max": 0.80,
        "frame_skip": 2,
    }
    stored = load_config().get("gesture_settings", {})
    merged = dict(DEFAULTS)
    merged.update(stored)
    return merged


def get_watch_folder() -> str:
    """Return the folder to watch from config, or default Downloads."""
    folder = load_config().get("watchdog", {}).get("folder", "")
    if folder:
        return folder
    return str(Path.home() / "Downloads")


def save_config(config: dict):
    """Write config dict back to config.json."""
    _CONFIG_PATH.write_text(
        json.dumps(config, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    reload_config()
