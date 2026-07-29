"""File-type-to-folder mapping rules loaded from config."""

from utils.config_loader import get_rules, reload_config


def get_rule_for_extension(ext: str) -> str:
    """Return the destination folder name for a given file extension."""
    ext = ext.lower()
    for folder, extensions in get_rules().items():
        if ext in extensions:
            return folder
    return "Outros"
