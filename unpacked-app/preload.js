const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getAppVersion: () => ipcRenderer.send('get-app-version'),
    onAppVersion: (callback) => ipcRenderer.on('app-version', (_event, value) => callback(value))
});