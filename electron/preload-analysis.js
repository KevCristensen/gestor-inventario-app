const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('analysisAPI', {
  onData: (callback) => ipcRenderer.on('analysis-data', (event, ...args) => callback(...args))
});