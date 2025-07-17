const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false, // Es más seguro
            contextIsolation: true, // Protege contra vulnerabilidades
            preload: path.join(__dirname, 'preload.js') // Carga un script de puente
        }
    });

    // En desarrollo, carga el servidor de Angular. En producción, carga el build.
    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, 'angular-app/dist/angular-app/browser/index.html'));
    } else {
        mainWindow.loadURL('http://localhost:4200');
        mainWindow.webContents.openDevTools(); // Abrir herramientas de desarrollador
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

app.on('ready', () => {
    createWindow();
    // Una vez que la ventana está lista, busca actualizaciones
    autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', function () {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function () {
    if (mainWindow === null) {
        createWindow();
    }
});

// Escucha un evento desde el renderer para obtener la versión de la app
ipcMain.on('get-app-version', (event) => {
    event.sender.send('app-version', { version: app.getVersion() });
});