const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('printAPI', {
  onData: (callback) => ipcRenderer.on('loss-damage-data', (event, ...args) => callback(...args))
});