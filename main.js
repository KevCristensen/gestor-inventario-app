const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// --- Dependencias del Backend ---
const express = require('express');
const cors = require('cors'); 
// Ya no necesitas 'mysql2' ni 'dotenv' aquí, porque se manejan en db.js

// --- Importar middleware ---
const { isAdmin } = require('./backend/middleware/auth.middleware');

// --- Importar rutas del backend ---
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
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js')
        }
    });

    if (app.isPackaged) {
        mainWindow.loadFile(path.join(__dirname, 'angular-app/dist/angular-app/browser/index.html'));
    } else {
        mainWindow.loadURL('http://localhost:4200');
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// --- Función para iniciar el servidor Backend ---
async function startServer() {
    const backendApp = express();
    backendApp.use(cors());
    backendApp.use(express.json());

    // --- Endpoints de la API ---
    // Simplemente "usamos" los módulos de rutas que hemos creado
    // Estas rutas ahora requieren un token de admin válido
    backendApp.use('/api/providers', isAdmin, providersRoutes);
    backendApp.use('/api/products', isAdmin, productsRoutes);

    backendApp.use('/api/auth', authRoutes);
    backendApp.use('/api/receptions', receptionsRoutes); 
    backendApp.use('/api/dashboard', dashboardRoutes);
    backendApp.use('/api/inventory', inventoryRoutes); 
    backendApp.use('/api/reports', reportsRoutes); 
    backendApp.use('/api/entities', entitiesRoutes);
    // Más adelante añadiremos más:
    // backendApp.use('/api/products', productsRoutes);
    // backendApp.use('/api/auth', authRoutes);

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