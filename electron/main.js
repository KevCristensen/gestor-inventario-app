const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');

// --- Single Instance Lock (Buena práctica) ---
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

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
const analysisRoutes = require('../backend/routes/analysis.routes');

let mainWindow;

// 1. La función ahora recibe la información de la versión
function createWindow() {
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
    backendApp.use('/api/analysis', analysisRoutes); 

    const PORT = 3000;
    backendApp.listen(PORT, () => {
        console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
        log.info(`Servidor Express corriendo en http://localhost:${PORT}`);
    });
}

// --- NUEVA FUNCIÓN PARA MANEJAR ACTUALIZACIONES ---
function handleUpdates() {
    autoUpdater.on('update-available', (info) => {
        log.info('Actualización disponible.', info);
        dialog.showMessageBox({
            type: 'info',
            title: 'Actualización Disponible',
            message: `Hay una nueva versión (${info.version}) disponible. ¿Deseas descargarla y reiniciar la aplicación ahora?`,
            buttons: ['Sí', 'No']
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('Actualización descargada. Se instalará al salir.');
        autoUpdater.quitAndInstall();
    });

    autoUpdater.on('error', (err) => {
        log.error('Error en el auto-updater. ' + err);
    });
    
    autoUpdater.checkForUpdates();
}

app.on('ready', async () => {
    await startServer();
    createWindow();
    handleUpdates(); 
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

ipcMain.on('print-analysis', (event, analysisData) => {
    const printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    });

    printWindow.loadFile(path.join(__dirname, '../analysis-template.html'));

    printWindow.webContents.on('did-finish-load', () => {
        printWindow.webContents.send('analysis-data', analysisData);
    });
});