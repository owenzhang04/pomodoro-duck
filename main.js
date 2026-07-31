const { app, Tray, BrowserWindow, ipcMain, globalShortcut, nativeImage, screen, Menu } = require('electron');
const path = require('path');
const { createTimer } = require('./timer');

const POPUP_W = 380;
const POPUP_H = 520;

let tray = null;
let popup = null;
let timer = null;

if (process.platform === 'darwin' && app.dock) {
  app.dock.hide();
}

function sendToPopup(channel, payload) {
  if (popup && !popup.isDestroyed()) {
    popup.webContents.send(channel, payload);
  }
}

function updateTrayTitle() {
  if (tray && timer) {
    tray.setTitle(timer.trayTitle());
  }
}

function positionPopup(win) {
  const trayBounds = tray.getBounds();
  const display = screen.getDisplayNearestPoint({
    x: Math.round(trayBounds.x + trayBounds.width / 2),
    y: Math.round(trayBounds.y + trayBounds.height / 2),
  });
  const { x: wx, y: wy, width: ww, height: wh } = display.workArea;

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - POPUP_W / 2);
  let y = Math.round(trayBounds.y + trayBounds.height);

  // Tray along the bottom (e.g. Windows): open upward
  if (trayBounds.y > wy + wh / 2) {
    y = Math.round(trayBounds.y - POPUP_H);
  }

  x = Math.min(Math.max(x, wx), wx + ww - POPUP_W);
  y = Math.min(Math.max(y, wy), wy + wh - POPUP_H);
  win.setPosition(x, y);
}

function showPopup() {
  const win = createPopup();
  positionPopup(win);
  win.show();
  win.focus();
  return win;
}

function createPopup() {
  if (popup && !popup.isDestroyed()) {
    return popup;
  }

  popup = new BrowserWindow({
    width: POPUP_W,
    height: POPUP_H,
    show: false,
    frame: false,
    resizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
    vibrancy: 'sidebar',
    backgroundColor: '#f8f4ec',
  });

  popup.loadFile('index.html');
  positionPopup(popup);

  popup.on('blur', () => {
    if (!popup || popup.isDestroyed()) return;
    if (popup.webContents.isDevToolsOpened()) return;
    if (popup.isAlwaysOnTop()) return;
    popup.hide();
  });

  popup.on('closed', () => {
    popup = null;
  });

  return popup;
}

function createTray() {
  const emptyIcon = nativeImage.createEmpty();
  tray = new Tray(emptyIcon);
  tray.setTitle('🦆 Pomodoro');
  tray.setToolTip('Pomodoro Duck — click to open');

  tray.on('click', () => showPopup());

  tray.on('right-click', () => {
    const contextMenu = Menu.buildFromTemplate([
      { label: 'Open', click: () => showPopup() },
      { label: 'Start / Pause', click: () => timer && timer.toggle() },
      { type: 'separator' },
      { label: 'Quit', click: () => app.quit() },
    ]);
    tray.popUpContextMenu(contextMenu);
  });
}

function createTimerEngine() {
  timer = createTimer({
    onUpdate: (state) => {
      updateTrayTitle();
      sendToPopup('timer-update', state);
    },
    onComplete: (data) => {
      updateTrayTitle();
      sendToPopup('phase-complete', data);
    },
  });
  updateTrayTitle();
}

// ── IPC ──
ipcMain.handle('timer-get-state', () => timer.snapshot());
ipcMain.handle('timer-toggle', () => timer.toggle());
ipcMain.handle('timer-reset', () => timer.reset());
ipcMain.handle('timer-skip', () => timer.skip());

ipcMain.handle('timer-settings', (_event, settings) => {
  timer.setSettings(settings);
  return timer.snapshot();
});

ipcMain.handle('timer-set-pomodoros', (_event, n) => {
  timer.setPomodorosToday(n);
  return timer.snapshot();
});

ipcMain.handle('toggle-float', () => {
  if (!popup || popup.isDestroyed()) return false;
  popup.setAlwaysOnTop(!popup.isAlwaysOnTop());
  return popup.isAlwaysOnTop();
});

ipcMain.handle('get-float-state', () => {
  return popup && !popup.isDestroyed() ? popup.isAlwaysOnTop() : false;
});

ipcMain.on('quit-app', () => {
  app.quit();
});

app.whenReady().then(() => {
  createTimerEngine();
  createTray();
  // Load renderer hidden so history/notifications work even if the tray popup was never opened
  createPopup();

  // Open popup only — does not toggle the timer
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    showPopup();
  });

  // Global play/pause
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    if (timer) timer.toggle();
  });

  // Global reset
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    if (timer) timer.reset();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      showPopup();
    }
  });
});

app.on('window-all-closed', () => {
  // Keep tray running
});

app.on('will-quit', () => {
  if (timer) timer.dispose();
  globalShortcut.unregisterAll();
});
