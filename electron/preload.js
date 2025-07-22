const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getAppVersion: () => ipcRenderer.send('get-app-version'),
    onAppVersion: (callback) => ipcRenderer.on('app-version', (_event, value) => callback(value)),
    // --- AÑADE ESTA NUEVA FUNCIÓN ---
    // Permite enviar cualquier tipo de mensaje desde el frontend al backend
    send: (channel, data) => {
        ipcRenderer.send(channel, data);
    },
    on: (channel, callback) => {
        ipcRenderer.on(channel, (event, ...args) => callback(...args));
      }
});