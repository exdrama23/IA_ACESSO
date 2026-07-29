"""Central action registry — dispatch actions without circular imports."""

from typing import Callable

_ACTIONS: dict[str, Callable] = {}


def register(action: str, fn: Callable):
    _ACTIONS[action] = fn


def registered_actions() -> list[str]:
    return list(_ACTIONS.keys())


def execute(action: str, **params) -> None:
    fn = _ACTIONS.get(action)
    if fn is None:
        raise KeyError(f"Ação não registrada: {action}")
    fn(**params)
