const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lossDamageAPI', {
  onData: (callback) => ipcRenderer.on('loss-damage-data', (event, ...args) => callback(...args))
});