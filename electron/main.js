const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// --- Configuración del Logger ---
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('Iniciando aplicación...');

// --- Dependencias y Rutas del Backend ---
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const express = require('express');
const cors = require('cors');
const { isAdmin } = require('../backend/middleware/auth.middleware');
const providersRoutes = require('../backend/routes/providers.routes'); 
const productsRoutes = require('../backend/routes/products.routes'); 
const authRoutes = require('../backend/routes/auth.routes');
const receptionsRoutes = require('../backend/routes/receptions.routes'); 
const dashboardRoutes = require('../backend/routes/dashboard.routes');
const inventoryRoutes = require('../backend/routes/inventory.routes');
const reportsRoutes = require('../backend/routes/reports.routes');   
const entitiesRoutes = require('../backend/routes/entities.routes'); 

let mainWindow;

// 1. La función ahora recibe la información de la versión
function createWindow(versionInfo) {
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

    const startURL = app.isPackaged
        ? url.format({
            pathname: path.join(__dirname, '../dist/browser/index.html'),
            protocol: 'file:',
            slashes: true
          })
        : 'http://localhost:4200';

    mainWindow.loadURL(startURL);

    if (!app.isPackaged) {
        mainWindow.webContents.openDevTools();
    }

    // 2. La lógica de las notas se mueve aquí, dentro de un listener seguro
    mainWindow.webContents.on('did-finish-load', () => {
        if (versionInfo.isNewVersion && versionInfo.notes) {
            mainWindow.webContents.send('show-release-notes', versionInfo.currentVersion, versionInfo.notes);
        }
    });

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

// --- Función startServer (Re-activada) ---
async function startServer() {
    const backendApp = express();
    backendApp.use(cors());
    backendApp.use(express.json());
    
    backendApp.use('/api/providers', isAdmin, providersRoutes);
    backendApp.use('/api/products', isAdmin, productsRoutes);
    backendApp.use('/api/auth', authRoutes);
    backendApp.use('/api/receptions', receptionsRoutes); 
    backendApp.use('/api/dashboard', dashboardRoutes);
    backendApp.use('/api/inventory', inventoryRoutes); 
    backendApp.use('/api/reports', reportsRoutes); 
    backendApp.use('/api/entities', entitiesRoutes);

    const PORT = 3000;
    backendApp.listen(PORT, () => {
        console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
        log.info(`Servidor Express corriendo en http://localhost:${PORT}`);
    });
}

app.on('ready', async () => {
    // 3. Primero, preparamos toda la información
    const { default: Store } = await import('electron-store');
    const store = new Store();
    const releaseNotes = require('../release-notes.json');
    const currentVersion = app.getVersion();
    const lastRunVersion = store.get('lastRunVersion');

    const versionInfo = {
        isNewVersion: currentVersion !== lastRunVersion,
        currentVersion: currentVersion,
        notes: releaseNotes[currentVersion]
    };
    
    if (versionInfo.isNewVersion) {
        store.set('lastRunVersion', currentVersion);
    }

    // 4. Iniciamos los procesos y pasamos la información a la ventana
    await startServer();
    createWindow(versionInfo);
    autoUpdater.checkForUpdatesAndNotify();
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

ipcMain.on('get-app-version', (event) => {
    event.sender.send('app-version', { version: app.getVersion() });
});

ipcMain.on('print-receipt', (event, receiptData) => {
    const printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    printWindow.loadFile(path.join(__dirname, '../receipt-template.html'));

    printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.send('receipt-data', receiptData);
    });
});