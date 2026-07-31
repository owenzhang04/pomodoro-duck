const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pomodoro', {
  getState: () => ipcRenderer.invoke('timer-get-state'),
  toggle: () => ipcRenderer.invoke('timer-toggle'),
  reset: () => ipcRenderer.invoke('timer-reset'),
  skip: () => ipcRenderer.invoke('timer-skip'),
  syncSettings: (settings) => ipcRenderer.invoke('timer-settings', settings),
  setPomodorosToday: (n) => ipcRenderer.invoke('timer-set-pomodoros', n),

  toggleFloat: () => ipcRenderer.invoke('toggle-float'),
  getFloatState: () => ipcRenderer.invoke('get-float-state'),
  quit: () => ipcRenderer.send('quit-app'),

  onUpdate: (cb) => {
    const handler = (_event, state) => cb(state);
    ipcRenderer.on('timer-update', handler);
    return () => ipcRenderer.removeListener('timer-update', handler);
  },
  onPhaseComplete: (cb) => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('phase-complete', handler);
    return () => ipcRenderer.removeListener('phase-complete', handler);
  },
});
