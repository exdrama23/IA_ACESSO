# AUTOWINDOWS — Guia para IA (Gemini / OpenCode)

## Visão Geral

Projeto de automação para Windows com **controle por gestos via webcam** (MediaPipe + OpenCV) e **organizador automático de Downloads**.

**Pilares:**
1. **Reconhecimento de gestos** — 14 gestos de mão, 25 ações disponíveis, configuração por gesture → action map
2. **Organizador de Downloads** — watchdog que move arquivos por tipo automaticamente
3. **GUI CustomTkinter** — configuração visual completa, preview da câmera
4. **Hot-reload** — config.json recarregado em tempo real (polling por mtime + `reload_now()`)

**Tecnologias:** Python 3.14, CustomTkinter, MediaPipe 0.10.33 (Tasks API), OpenCV, watchdog, pathlib.

**100% offline, sem API keys, sem voz.**

---

## Estrutura do Projeto

```
AUTOWINDOWS/
├── main.py                      # Orquestrador (inicia gesture controller, watchdog, GUI)
├── config.json                  # Configurações persistentes + gesture × action map
├── requirements.txt
├── hand_landmarker.task         # Modelo MediaPipe (pré-treinado, incluso no repo)
│
├── gesture/
│   ├── capture.py               # Câmera CV2 com reconexão automática
│   ├── tracker.py               # Hand landmark detector (Tasks API, downscale 320px)
│   ├── recognizer.py            # 14 classificadores de gesto (thresholds configuráveis)
│   ├── controller.py            # Loop principal: camera → tracker → recognizer → action
│   └── actions.py               # 25 ações: mouse, teclado, sistema, apps, etc.
│
├── organizer/
│   ├── watcher.py               # Watchdog da pasta configurada (FileSystemEventHandler)
│   ├── rules.py                 # Regras extensão → pasta (lê de config.json)
│   └── mover.py                 # Lógica de mover arquivos (usa pasta configurada)
│
├── actions/
│   ├── registry.py              # Registro central de ações (register/execute)
│   ├── open_app.py              # Abrir programas + projetos
│   ├── close_app.py             # Fechar aplicativos
│   ├── system.py                # Desligar, hibernar, volume, shell
│   ├── search.py                # Pesquisa web, YouTube
│   ├── git_commands.py          # Automação Git
│   ├── type_text.py             # Digitar texto
│   └── macros.py                # Sequências multi-ação (passo a passo)
│
├── gui/
│   ├── app.py                   # Janela principal CustomTkinter (800×550)
│   ├── camera_window.py         # Preview flutuante da câmera (CTkToplevel)
│   ├── widgets.py               # Widgets reutilizáveis (StatusToast)
│   ├── tab_gestures.py          # Aba: mapeamento gesto → ação + indicador ao vivo
│   ├── tab_settings.py          # Aba: sensibilidade/limiares de cada gesto
│   ├── tab_rules.py             # Aba: regras de organização (extensão → pasta)
│   ├── tab_projects.py          # Aba: projetos favoritos
│   └── tab_general.py           # Aba: watchdog, pasta vigiada, startup
│
└── utils/
    ├── config_loader.py         # Load/save config.json (sem cache, sempre fresco)
    ├── logger.py                # Logging colorido + arquivo rotativo (7 dias)
    └── scheduler.py             # Registro no startup do Windows

logs/
    └── autowindows.log          # Últimos 7 dias (rotação automática)
```

---

## Regras de Código

1. Usar `pathlib.Path` para caminhos, evitar `os.path`
2. Logging com `logging` + `TimedRotatingFileHandler` (7 dias) em todos os módulos
3. Docstring em funções/classes públicas
4. Tratamento de exceções específicas (evitar `except Exception` genérico)
5. Config carregada de `config.json` via `utils.config_loader` (sempre fresco, sem cache)
6. Nunca usar `input()` — tudo via GUI ou macros
7. Thread separada para o loop de gestos (não bloquear a GUI)
8. Nomes em inglês para código, português para feedback ao usuário
9. Compatibilidade com MediaPipe Tasks API (0.10.33) — `mp.solutions` NÃO funciona
10. Downscale do frame para 320px antes da inferência (ganho de FPS no N97)

---

## APIs e Bibliotecas

### MediaPipe Tasks (Hand Landmarker)

```python
from mediapipe.tasks import python
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.vision.core.vision_task_running_mode import VisionTaskRunningMode

base = python.BaseOptions(model_asset_path="hand_landmarker.task")
opts = vision.HandLandmarkerOptions(
    base_options=base,
    running_mode=VisionTaskRunningMode.VIDEO,  # obrigatório para timestamp
    num_hands=1,
    min_hand_detection_confidence=0.5,
    min_hand_presence_confidence=0.5,
    min_tracking_confidence=0.5,
)
detector = vision.HandLandmarker.create_from_options(opts)
```

### OpenCV (captura + resize)

```python
import cv2
cap = cv2.VideoCapture(0)
ret, frame = cap.read()
frame = cv2.flip(frame, 1)        # espelho (selfie view)
small = cv2.resize(frame, (w, h), interpolation=cv2.INTER_LINEAR)
```

### Watchdog

```python
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class Handler(FileSystemEventHandler):
    def on_created(self, event):
        if not event.is_directory:
            mover.organize_file(event.src_path)
```

### CustomTkinter

```python
import customtkinter as ctk
ctk.set_appearance_mode("dark")
ctk.set_default_color_theme("blue")
app = ctk.CTk()
```

---

## Fluxo do Reconhecimento de Gestos

```
1. CameraCapture.get_frame() → frame BGR (flip horizontal)
2. DOWNSCALE: resize para 320px no lado maior (tracker.py)
3. hand_landmarker.detect_for_video() → 21 landmarks normalizados
4. UPSCALE: coordenadas re-mapeadas para o frame original
5. GestureRecognizer.get_gesture(hand) → string (ex: "click", "peace")
6. Controller consulta _gesture_entries[gesture] → nome da ação
7. Se ação é contínua (move_mouse, scroll, click) → executa a cada frame
8. Se ação é discreta → executa apenas na transição (gesture != _prev_gesture)
9. CLICK vs DRAG: pinça < drag_delay_seconds → click(); ≥ → mouseDown() + drag
```

---

## Estrutura do config.json

### gestures[] — Mapeamento gesto → ação (14 entradas)

Cada entrada:
| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | Nome interno do gesto (ex: `"click"`, `"peace"`) |
| `description` | string | Texto em português |
| `action` | string | Ação a executar (ex: `"click"`, `"open_app"`) |
| `param` | string | Parâmetro extra (ex: nome do app) |
| `shortcut` | string | Atalho de teclado (ex: `ctrl+c`) |
| `enabled` | boolean | Se o gesto está ativo |

### gesture_settings — Limiares e parâmetros (14 chaves)

| Chave | Default | Descrição |
|---|---|---|
| `pinch_threshold` | 0.045 | Distância polegar→indicador para pinça |
| `point_x_threshold` | 0.10 | Sensibilidade direita/esquerda |
| `thumb_ext_threshold` | 0.02 | Polegar esticado |
| `thumb_down_threshold` | 0.04 | Polegar invertido |
| `drag_delay_seconds` | 5.0 | Segundos até virar garra (drag) |
| `ok_threshold` | 0.05 | Tolerância do gesto OK |
| `peace_spread` | 0.06 | Abertura mínima entre dedos do peace |
| `smoothing` | 0.55 | Suavização do cursor (0=nada, 0.95=muito) |
| `min_move_px` | 1 | Pixel mínimo para mover (anti-tremor) |
| `remap_x_min` | 0.08 | Limite X inferior do remap |
| `remap_x_max` | 0.92 | Limite X superior do remap |
| `remap_y_min` | 0.10 | Limite Y inferior do remap |
| `remap_y_max` | 0.80 | Limite Y superior do remap |
| `frame_skip` | 2 | Saltar frames (1=sem skip, 2=metade) |

### watchdog
| Campo | Descrição |
|---|---|
| `enabled` | boolean |
| `folder` | Pasta a vigiar (vazio = Downloads) |
| `delay_seconds` | Tempo de espera antes de mover |
| `temp_extensions` | Extensões temporárias a ignorar |

### rules — Extensão → pasta de destino (dicionário)

### projects — Lista de projetos favoritos

---

## Sistema de Ações

### Ações de Mouse
| Ação | Descrição |
|---|---|
| `move_mouse` | Move cursor com suavização + remap |
| `click` | Click simples (curto) ou mouseDown + mouseUp (longo) |
| `right_click` | Botão direito |
| `scroll` | Scroll vertical |

### Ações de Sistema
| Ação | Descrição |
|---|---|
| `volume_up` / `volume_down` | Controle de volume |
| `screenshot` | Print da tela |
| `alt_tab` | Alternar janelas |
| `escape` | Tecla Esc |
| `shutdown` / `restart` / `lock` | Sistema |
| `minimize` / `maximize` | Janela ativa |
| `enter` / `tab` / `delete` / `backspace` | Teclas comuns |

### Ações de Aplicativos
| Ação | Descrição | Parâmetro |
|---|---|---|
| `open_app` | Abre programa | `param="chrome"` |
| `type_text` | Digita texto | `param="Hello"` |
| `custom_keys` | Atalho de teclado | `shortcut="ctrl+c"` |

---

## Hot-Reload (tempo real)

- Controller **polla** `config_path().stat().st_mtime` a cada 30 frames
- Se detecta mudança → recarrega gesture map, settings, recognizer thresholds, action params
- GUI chama `controller.reload_now()` ao salvar — força recarga imediata
- `load_config()` NÃO tem cache — sempre lê do disco

## Click vs Drag

- `pinch_threshold` define a distância polegar→indicador para ativar pinça
- Pinça curta (< `drag_delay_seconds`) → `pyautogui.click()`
- Pinça longa (≥ `drag_delay_seconds`) → `mouseDown()` + move + `mouseUp()`
- `_end_pinch()` é chamado quando a mão sai da pinça ou perde landmark

## Comportamento da Câmera

- `CameraCapture.start()` → idempotente, `restart()` em caso de falha (max 5 tentativas)
- Se `get_frame()` retorna `None` por 30+ ciclos → tenta `restart()`
- `GestureController.camera_ok` → expõe status para GUI
- GUI abre mesmo sem câmera (mostra "Câmera indisponível" no preview + footer vermelho)

## FPS no Intel N97

- Downscale para 320px no lado maior (tracker.py)
- `frame_skip=2` → processa 1 frame a cada 2 capturados, efetivo ~40-60 FPS tracking
- Controle: `gesture_settings.frame_skip` no config.json

## Observações Importantes

- **MediaPipe Tasks API** (0.10.33): usar `vision.HandLandmarker`, NÃO `mp.solutions.hands`
- **pyautogui.FAILSAFE = False** — necessário para mouse chegar na borda da tela sem exception
- **Remap + snap-to-target**: [finger_min, finger_max] → [0, screen_max]; snap quando `delta < min_move_px` para alcançar cantos
- Gesto só executa uma vez por mudança (discrete actions), evitando repetição
- Watchdog + mover usam a **mesma pasta configurada** (corrigido: antes o mover ignorava pasta customizada)
- Logs rotativos: `TimedRotatingFileHandler(when="D", backupCount=7)` — arquivo único, 7 dias de histórico
