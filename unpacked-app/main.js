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
    const PORT = 3000;

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
            ? `http://localhost:${PORT}` // En producción, apunta a nuestro propio servidor
            : 'http://localhost:4200'; // En desarrollo, apunta al servidor de Angular

        mainWindow.loadURL(startURL);
    
        if (!app.isPackaged) {
            mainWindow.webContents.openDevTools();
        }
    
        mainWindow.on('closed', () => {
            mainWindow = null;
        });
    
       
    }

    // --- Tu función startServer no necesita cambios ---
    async function startServer() {
        const backendApp = express();
        backendApp.use(cors());
        backendApp.use(express.json());
    
        // --- SIRVE LOS ARCHIVOS DE ANGULAR EN PRODUCCIÓN ---
        if (app.isPackaged) {
            const angularAppPath = path.join(__dirname, 'dist/browser');
            backendApp.use(express.static(angularAppPath));
        }
        
        backendApp.use('/api/providers', isAdmin, providersRoutes);
        backendApp.use('/api/products', isAdmin, productsRoutes);
        backendApp.use('/api/auth', authRoutes);
        backendApp.use('/api/receptions', receptionsRoutes); 
        backendApp.use('/api/dashboard', dashboardRoutes);
        backendApp.use('/api/inventory', inventoryRoutes); 
        backendApp.use('/api/reports', reportsRoutes); 
        backendApp.use('/api/entities', entitiesRoutes);

        

        // --- RUTA FALLBACK ---
        // Si la app está empaquetada, cualquier ruta que no sea de la API debe servir el index.html
        if (app.isPackaged) {
            backendApp.get('*', (req, res) => {
                res.sendFile(path.join(__dirname, 'dist/browser/index.html'));
            });
        }

        backendApp.listen(PORT, () => {
            console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
        });
    }

    app.on('ready', async () => {
        // Es importante iniciar el servidor ANTES de crear la ventana en producción
        await startServer();
        createWindow();
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