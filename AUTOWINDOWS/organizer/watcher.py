"""Watchdog that monitors the Downloads folder and organizes new files."""

import time
from pathlib import Path

from watchdog.events import FileSystemEventHandler
from watchdog.observers import Observer

from organizer.mover import organize_file
from utils.config_loader import get_watch_folder, load_config
from utils.logger import logger


def _get_delay() -> int:
    """Return the watchdog delay in seconds from config."""
    return load_config().get("watchdog", {}).get("delay_seconds", 3)


def _get_temp_extensions() -> set:
    """Return set of temporary file extensions to ignore."""
    return set(
        load_config().get("watchdog", {}).get(
            "temp_extensions",
            [".crdownload", ".part", ".tmp", ".download", ".opdownload"],
        )
    )


class DownloadHandler(FileSystemEventHandler):
    """Handles file creation/modification events in the Downloads folder."""

    def __init__(self, base_folder: str):
        super().__init__()
        self._base_folder = base_folder

    def _is_temp(self, path: str) -> bool:
        ext = Path(path).suffix.lower()
        return ext in _get_temp_extensions()

    def on_created(self, event):
        if event.is_directory or self._is_temp(event.src_path):
            return
        time.sleep(_get_delay())
        organize_file(event.src_path, base_folder=self._base_folder)

    def on_modified(self, event):
        if event.is_directory or self._is_temp(event.src_path):
            return
        time.sleep(_get_delay())
        organize_file(event.src_path, base_folder=self._base_folder)


class DownloadWatcher:
    """Manages the watchdog Observer lifecycle."""

    def __init__(self):
        self._observer: Observer | None = None
        self._folder: str = get_watch_folder()

    @property
    def is_active(self) -> bool:
        """Return True if the observer is running."""
        return self._observer is not None and self._observer.is_alive()

    def start(self):
        """Start monitoring the download folder."""
        if self.is_active:
            return
        Path(self._folder).mkdir(parents=True, exist_ok=True)
        self._observer = Observer()
        handler = DownloadHandler(base_folder=self._folder)
        self._observer.schedule(handler, self._folder, recursive=False)
        self._observer.start()
        logger.info(f"Watchdog iniciado: {self._folder}")

    def stop(self):
        """Stop monitoring."""
        if self._observer:
            self._observer.stop()
            try:
                self._observer.join(timeout=2)
            except Exception:
                pass
            self._observer = None
            logger.info("Watchdog parado")
