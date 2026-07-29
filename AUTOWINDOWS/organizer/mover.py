"""File-moving logic for organizing downloads by type."""

import shutil
from pathlib import Path

from organizer.rules import get_rule_for_extension
from utils.config_loader import get_watch_folder
from utils.logger import logger


def organize_file(file_path: str, base_folder: str | None = None) -> bool:
    """Move a single file to its type-matching subfolder.

    Args:
        file_path: Absolute path to the file to organize.
        base_folder: Parent folder where type subfolders live.
                     Defaults to the configured watch folder (or Downloads).

    Returns:
        True if the file was moved, False otherwise.
    """
    src = Path(file_path)
    if not src.is_file():
        return False

    ext = src.suffix.lower()
    if not ext:
        return False

    if base_folder is None:
        base_folder = get_watch_folder()
    target_base = Path(base_folder)
    dest_folder_name = get_rule_for_extension(ext)
    target_dir = target_base / dest_folder_name
    target_dir.mkdir(parents=True, exist_ok=True)

    target = target_dir / src.name
    counter = 1
    while target.exists():
        target = target_dir / f"{src.stem}_{counter}{src.suffix}"
        counter += 1

    try:
        shutil.move(str(src), str(target))
        logger.info(f"Movido: {file_path} -> {target}")
        return True
    except Exception as exc:
        logger.error(f"Erro ao mover {file_path}: {exc}")
        return False


def force_organize(base_folder: str | None = None):
    """Move all loose files in the watch folder to their type folders.

    Args:
        base_folder: Parent folder to scan and organize.
                     Defaults to the configured watch folder (or Downloads).
    """
    if base_folder is None:
        base_folder = get_watch_folder()
    folder = Path(base_folder)
    if not folder.is_dir():
        logger.error(f"Pasta não encontrada: {folder}")
        return

    moved = 0
    for entry in folder.iterdir():
        if entry.is_file():
            if organize_file(str(entry), base_folder=base_folder):
                moved += 1

    logger.info(f"Organização forçada: {moved} arquivos movidos em {folder}")
