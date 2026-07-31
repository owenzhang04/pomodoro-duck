# 🦆 Pomodoro Duck

A warm, minimal Pomodoro timer that lives in your Mac menu bar.

## Features

- **Menu bar timer** — shows remaining time in your Mac menu bar (e.g. `⏱ 25:00`)
- **Click to open** — popup with full controls, duck mascot, and history
- **Adjustable timers** — work / short break / long break durations
- **Sound & notifications** — chime + duck quack when phases end
- **Auto-start next phase** — break/work begins immediately when a phase completes
- **Session counter** — track pomodoros today with streak dots (restored after relaunch)
- **Daily history** — localStorage-persisted session log
- **Keyboard shortcuts** — `Space` = start/pause, `R` = reset, `S` = skip
- **Dark mode** — matches system preference on first launch, or manual toggle
- **Float on top** — keep the popup visible over other windows
- **Right-click tray** — quick open / start-pause / quit from menu bar
- **Footer quit button** — close app from the popup UI

## Tech

- Electron (menu-bar tray app)
- Main-process wall-clock timer (accurate while the popup is hidden)
- Preload `contextBridge` (no Node integration in the renderer)
- Pure HTML/CSS/JS, no frameworks
- Web Audio API for sounds
- localStorage for persistence

## Run

```bash
cd ~/Projects/pomodoro
npm start
```

The app starts in your menu bar. Click the duck to open the timer.

## Global shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd+Shift+P` | Open / focus popup (does not toggle the timer) |
| `Cmd+Shift+Space` | Start / pause timer |
| `Cmd+Shift+R` | Reset current phase |

## Build (optional)

```bash
npm run build
```

Creates:
- `dist/mac-arm64/Pomodoro Duck.app` — unsigned native app
- `dist/Pomodoro-Duck-v1.2.0-macOS-arm64.zip` — shareable zip
- `dist/Pomodoro-Duck-v1.2.0-macOS-arm64.dmg` — shareable disk image

To share: send the `.zip`. Recipients unzip, then **Right-click → Open** the `.app` to bypass Gatekeeper (unsigned).

## Design

Warm cream `#f8f4ec`, sienna `#b14a25`, same palette as 5418 Book Club.
