const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const url = require('url');
const log = require('electron-log');

// --- Dependencias y Rutas del Backend (Re-activadas) ---
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

    const startURL = app.isPackaged
        ? url.format({
            pathname: path.join(__dirname, '../dist/browser/index.html'), // <-- CAMBIO
            protocol: 'file:',
            slashes: true
          })
        : 'http://localhost:4200';

    log.info(`Función createWindow: Intentando cargar URL: ${startURL}`);
    mainWindow.loadURL(startURL);

    mainWindow.webContents.openDevTools();

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        log.error(`Fallo al cargar la URL: ${errorDescription}, Código: ${errorCode}`);
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
    log.info("Evento 'ready': Disparado.");
    try {
        createWindow();
        log.info("Evento 'ready': createWindow llamado exitosamente.");
        
        await startServer(); // <-- Re-activado
        log.info("Evento 'ready': startServer llamado exitosamente.");

    } catch (error) {
        log.error("Evento 'ready': Error durante el inicio:", error);
    }
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