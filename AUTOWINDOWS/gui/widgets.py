"""Reusable GUI widgets for AUTOWINDOWS."""

import customtkinter as ctk


class StatusToast(ctk.CTkLabel):
    """A status label that auto-clears its message after a timeout.

    Drop-in replacement for ``ctk.CTkLabel(text="", font=...)``.
    Call ``.show(msg, color, duration)`` instead of ``.configure(text=, text_color=)``.
    """

    def __init__(self, master, **kwargs):
        kwargs.setdefault("text", "")
        kwargs.setdefault("font", ctk.CTkFont(size=12))
        super().__init__(master, **kwargs)
        self._clear_id: str | None = None

    def show(self, message: str, color: str = "green", duration: int = 4):
        """Display *message* in *color* and auto-clear after *duration* seconds."""
        if self._clear_id:
            self.after_cancel(self._clear_id)
        self.configure(text=message, text_color=color)
        self._clear_id = self.after(duration * 1000, self._clear)

    def _clear(self):
        self.configure(text="")
        self._clear_id = None
