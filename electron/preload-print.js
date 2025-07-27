const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('printAPI', {
  onData: (callback) => ipcRenderer.on('asset-movement-data', (event, ...args) => callback(...args))
});