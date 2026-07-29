"""System-level actions: shutdown, volume, screenshot, battery, time, etc."""

import re
import subprocess
from datetime import datetime
from pathlib import Path

import psutil
import pyautogui
import requests

from utils.logger import logger

_HANDLERS: dict[str, callable] = {}


def handle_system_action(action: str = "", text_param: str = ""):
    """Dispatch a system action by name."""
    handler = _HANDLERS.get(action)
    if handler:
        handler(text_param)
    else:
        logger.warning(f"Ação de sistema desconhecida: {action}")


# ---------- helpers ----------

def _shutdown(_=None):
    subprocess.run(["shutdown", "/s", "/t", "5"], shell=True)


def _shutdown_timer(minutes_str=""):
    match = re.search(r"(\d+)", str(minutes_str))
    if match:
        seconds = int(match.group(1)) * 60
        subprocess.run(["shutdown", "/s", "/t", str(seconds)], shell=True)


def _cancel_shutdown(_=None):
    subprocess.run(["shutdown", "/a"], shell=True)


def _restart(_=None):
    subprocess.run(["shutdown", "/r", "/t", "5"], shell=True)


def _hibernate(_=None):
    subprocess.run(["shutdown", "/h"], shell=True)


def _sleep(_=None):
    subprocess.run(["rundll32.exe", "powrprof.dll,SetSuspendState", "0", "1", "0"], shell=True)


def _lock(_=None):
    subprocess.run(["rundll32.exe", "user32.dll,LockWorkStation"], shell=True)


def _set_volume(level_str=""):
    match = re.search(r"(\d+)", str(level_str))
    if match:
        level = min(100, max(0, int(match.group(1))))
        subprocess.run(
            ["powershell", "-NoProfile", "-c", f"Set-Volume -Volume {level}"],
            shell=True, capture_output=True,
        )


def _volume_up(_=None):
    subprocess.run(
        ["powershell", "-NoProfile", "-c",
         "(New-Object -ComObject WScript.Shell).SendKeys([char]175)"],
        shell=True, capture_output=True,
    )


def _volume_down(_=None):
    subprocess.run(
        ["powershell", "-NoProfile", "-c",
         "(New-Object -ComObject WScript.Shell).SendKeys([char]174)"],
        shell=True, capture_output=True,
    )


def _mute(_=None):
    subprocess.run(
        ["powershell", "-NoProfile", "-c",
         "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"],
        shell=True, capture_output=True,
    )


def _unmute(_=None):
    subprocess.run(
        ["powershell", "-NoProfile", "-c",
         "(New-Object -ComObject WScript.Shell).SendKeys([char]173)"],
        shell=True, capture_output=True,
    )


def _screenshot(_=None):
    timestamp = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    path = Path.home() / "Desktop" / f"screenshot_{timestamp}.png"
    try:
        pyautogui.screenshot(str(path))
        logger.info(f"Print salvo: {path}")
    except Exception as exc:
        logger.error(f"Erro ao tirar print: {exc}")


def _dark_mode(_=None):
    import winreg
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
            0, winreg.KEY_SET_VALUE,
        )
        winreg.SetValueEx(key, "AppsUseLightTheme", 0, winreg.REG_DWORD, 0)
        winreg.SetValueEx(key, "SystemUsesLightTheme", 0, winreg.REG_DWORD, 0)
        winreg.CloseKey(key)
    except Exception as exc:
        logger.error(f"Erro ao ativar modo escuro: {exc}")


def _light_mode(_=None):
    import winreg
    try:
        key = winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            r"Software\Microsoft\Windows\CurrentVersion\Themes\Personalize",
            0, winreg.KEY_SET_VALUE,
        )
        winreg.SetValueEx(key, "AppsUseLightTheme", 0, winreg.REG_DWORD, 1)
        winreg.SetValueEx(key, "SystemUsesLightTheme", 0, winreg.REG_DWORD, 1)
        winreg.CloseKey(key)
    except Exception as exc:
        logger.error(f"Erro ao ativar modo claro: {exc}")


def _show_desktop(_=None):
    try:
        import pygetwindow as gw
        for window in gw.getAllWindows():
            if window.title:
                window.minimize()
    except Exception:
        subprocess.run(
            ["powershell", "-NoProfile", "-c",
             "(New-Object -ComObject Shell.Application).MinimizeAll()"],
            shell=True,
        )


def _speak_time(_=None):
    now = datetime.now()
    logger.info(f"Hora: {now.hour}:{now.minute}")


def _speak_date(_=None):
    now = datetime.now()
    logger.info(f"Data: {now.day}/{now.month}/{now.year}")


def _speak_ip(_=None):
    try:
        ip = requests.get("https://api.ipify.org", timeout=5).text.strip()
        logger.info(f"IP: {ip}")
    except requests.RequestException:
        logger.warning("Não foi possível obter o IP")


def _speak_battery(_=None):
    try:
        battery = psutil.sensors_battery()
        if battery:
            plugged = "conectado" if battery.power_plugged else "desconectado"
            logger.info(f"Bateria: {battery.percent}%, {plugged}")
        else:
            logger.warning("Não foi detectada bateria")
    except Exception:
        logger.error("Erro ao verificar bateria")


def _speak_help(_=None):
    logger.info("Gestos disponíveis: move=dedo indicador, click=pinça, right_click=2 dedos, scroll=3+ dedos, fist=print, thumbs_up=volume+, thumbs_down=volume-, four_fingers=alt+tab, palm=esc")


def _wifi_on(_=None):
    subprocess.run(
        ["netsh", "interface", "set", "interface", "Wi-Fi", "enabled"],
        shell=True, capture_output=True,
    )


def _wifi_off(_=None):
    subprocess.run(
        ["netsh", "interface", "set", "interface", "Wi-Fi", "disabled"],
        shell=True, capture_output=True,
    )


# ----- register sub-actions -----
_HANDLERS.update({
    "shutdown": _shutdown,
    "shutdown_timer": _shutdown_timer,
    "cancel_shutdown": _cancel_shutdown,
    "restart": _restart,
    "hibernate": _hibernate,
    "sleep": _sleep,
    "lock": _lock,
    "volume": _set_volume,
    "volume_up": _volume_up,
    "volume_down": _volume_down,
    "mute": _mute,
    "unmute": _unmute,
    "screenshot": _screenshot,
    "dark_mode": _dark_mode,
    "light_mode": _light_mode,
    "show_desktop": _show_desktop,
    "time": _speak_time,
    "date": _speak_date,
    "ip": _speak_ip,
    "battery": _speak_battery,
    "help": _speak_help,
    "wifi_on": _wifi_on,
    "wifi_off": _wifi_off,
})


def execute_shell(cmd: str = ""):
    """Execute an arbitrary shell command."""
    if not cmd:
        return
    try:
        subprocess.Popen(cmd, shell=True)
        logger.info(f"Executado: {cmd}")
    except Exception as exc:
        logger.error(f"Erro ao executar {cmd}: {exc}")
