const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const log = require('electron-log');

log.info('--- Inicio de la Aplicación ---');

let mainWindow;

function createWindow() {
    log.info('Función createWindow: Iniciando...');
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            webSecurity: false,
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });
    log.info('Función createWindow: Ventana creada.');

    const startURL = url.format({
        pathname: path.join(__dirname, 'dist/browser/index.html'),
        protocol: 'file:',
        slashes: true
    });

    log.info(`Función createWindow: Intentando cargar URL: ${startURL}`);
    mainWindow.loadURL(startURL);

    mainWindow.webContents.openDevTools(); // Forzamos abrir DevTools

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log.error(`Fallo al cargar la URL: ${errorDescription}, Código: ${errorCode}`);
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', async () => {
    log.info("Evento 'ready': Disparado.");
    try {
        createWindow();
        log.info("Evento 'ready': createWindow llamado exitosamente.");
    } catch (error) {
        log.error("Evento 'ready': Error al llamar a createWindow:", error);
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});