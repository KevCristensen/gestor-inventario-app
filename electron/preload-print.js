const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('assetMovementAPI', {
  onData: (callback) => ipcRenderer.on('asset-movement-data', (event, ...args) => callback(...args))
});