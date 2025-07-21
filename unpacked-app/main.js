    const { app, BrowserWindow, ipcMain } = require('electron');
    const path = require('path');
    const url = require('url');
    const { autoUpdater } = require('electron-updater');
    const log = require('electron-log'); // 1. Importa el logger

    // --- Configuración del Logger para el Auto-Updater ---
    // Esto creará un archivo de log para que podamos ver qué hace el actualizador
    autoUpdater.logger = log;
    autoUpdater.logger.transports.file.level = 'info';
    log.info('Iniciando aplicación...');

    // --- Dependencias y Rutas del Backend ---
    require('dotenv').config({ path: path.join(__dirname, '.env') });
    const express = require('express');
    const cors = require('cors');
    const { isAdmin } = require('./backend/middleware/auth.middleware');
    const providersRoutes = require('./backend/routes/providers.routes'); 
    const productsRoutes = require('./backend/routes/products.routes'); 
    const authRoutes = require('./backend/routes/auth.routes');
    const receptionsRoutes = require('./backend/routes/receptions.routes'); 
    const dashboardRoutes = require('./backend/routes/dashboard.routes');
    const inventoryRoutes = require('./backend/routes/inventory.routes');
    const reportsRoutes = require('./backend/routes/reports.routes');   
    const entitiesRoutes = require('./backend/routes/entities.routes'); 

    let mainWindow;

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
                pathname: path.join(__dirname, 'dist/browser/index.html'),
                protocol: 'file:',
                slashes: true
              })
            : 'http://localhost:4200';
    
        mainWindow.loadURL(startURL);
    
        if (!app.isPackaged) {
            mainWindow.webContents.openDevTools();
        }
    
        mainWindow.on('closed', function () {
            mainWindow = null;
        });
    
        // --- AÑADE ESTE BLOQUE DE CÓDIGO ---
        // Intercepta el comando de recarga para evitar el error.
        mainWindow.webContents.on('before-input-event', (event, input) => {
            if (input.key.toLowerCase() === 'r' && (input.control || input.meta)) {
                mainWindow.loadURL(startURL);
                event.preventDefault();
            }
        });
    }

    // --- Tu función startServer no necesita cambios ---
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
        });
    }

    app.on('ready', () => {
        createWindow();
        startServer();
        autoUpdater.checkForUpdatesAndNotify();
    });

    // --- El resto de los eventos de 'app' no necesitan cambios ---
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