const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('receiptAPI', {
  onData: (callback) => ipcRenderer.on('receipt-data', (event, ...args) => callback(...args))
});