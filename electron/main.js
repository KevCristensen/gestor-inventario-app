const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const url = require('url');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const http = require('http'); 
const { Server } = require("socket.io"); 
const chatRoutes = require('../backend/routes/chat.routes'); // <-- 1. IMPORTA

// --- Capturador Global de Errores de Promesa ---
process.on('unhandledRejection', (reason, promise) => {
  log.error('Unhandled Rejection at:', promise, 'reason:', reason);
});


// --- Single Instance Lock ---
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
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
const dotenvPath = app.isPackaged
  ? path.join(process.resourcesPath, '.env')
  : path.join(__dirname, '../.env');
require('dotenv').config({ path: dotenvPath });
const express = require('express');
// --- LOG DE DEBUG PARA VARIABLES DE ENTORNO ---
log.info('--- Variables de Entorno Cargadas ---');
log.info(`Cargando .env desde: ${dotenvPath}`);
log.info(`DB_HOST: ${process.env.DB_HOST}`);
log.info(`DB_USER: ${process.env.DB_USER}`);
log.info(`DB_PASSWORD: ${process.env.DB_PASSWORD ? '******' : 'NO CARGADA'}`);
log.info(`DB_DATABASE: ${process.env.DB_DATABASE}`);
log.info('------------------------------------');
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
const assetsRoutes = require('../backend/routes/assets.routes');
const assetMovementsRoutes = require('../backend/routes/asset-movements.routes'); 

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

    const PORT = 3000;
    const startURL = app.isPackaged
        ? `http://localhost:${PORT}` // En producción, apunta a nuestro propio servidor
        : 'http://localhost:4200';

    mainWindow.loadURL(startURL);

    if (!app.isPackaged) {
     // mainWindow.webContents.openDevTools();
    }

    mainWindow.on('closed', function () {
        mainWindow = null;
    });
}

async function startServer() {
    const backendApp = express();
    const httpServer = http.createServer(backendApp); // 3. Crea un servidor http desde express
    const io = new Server(httpServer, {
        cors: {
            origin: app.isPackaged
                ? false // En producción, el origen es `file://` y no necesita CORS explícito
                : "http://localhost:4200", // Permite la conexión desde el frontend de Angular en desarrollo
            methods: ["GET", "POST"]
        }
    });
    backendApp.use(cors());
    backendApp.use(express.json());
    
    // --- SIRVE LOS ARCHIVOS DE ANGULAR EN PRODUCCIÓN ---
    if (app.isPackaged) {
        // Sirve los archivos estáticos (js, css, etc.) desde la carpeta dist/browser
        backendApp.use(express.static(path.join(__dirname, '../dist/browser')));
    }

    backendApp.use('/api/providers', providersRoutes);
    backendApp.use('/api/products', productsRoutes);
    backendApp.use('/api/auth', authRoutes);
    backendApp.use('/api/receptions', receptionsRoutes); 
    backendApp.use('/api/dashboard', dashboardRoutes);
    backendApp.use('/api/inventory', inventoryRoutes); 
    backendApp.use('/api/reports', reportsRoutes); 
    backendApp.use('/api/entities', entitiesRoutes);
    backendApp.use('/api/analysis', analysisRoutes);
    backendApp.use('/api/assets', isAdmin, assetsRoutes);
    backendApp.use('/api/asset-movements', assetMovementsRoutes); 
    backendApp.use('/api/chat', chatRoutes); 

    // --- Global Error Handler ---
    backendApp.use((err, req, res, next) => {
      log.error('Error no controlado en el backend:', err); // Log the full error
      res.status(500).json({ message: 'Error interno del servidor', error: err.message });
    });

    // --- RUTA FALLBACK PARA ANGULAR ROUTING ---
    if (app.isPackaged) {
        backendApp.get('*', (req, res) => {
            res.sendFile(path.join(__dirname, '../dist/browser/index.html'));
        });
    }

    // --- LÓGICA DEL CHAT SIMPLIFICADA ---
    const onlineUsers = new Map();

    io.on('connection', (socket) => {
        socket.on('join', (user) => {
            log.info(`Usuario ${user.name} (${socket.id}) se unió.`);
            onlineUsers.set(user.id.toString(), { socketId: socket.id });
        });

        // Este evento ahora es solo una notificación
        socket.on('sendMessage', (data) => {
            const recipient = onlineUsers.get(data.to_user_id.toString());
            if (recipient) {
                io.to(recipient.socketId).emit('newMessage', data);
            }
        });

        socket.on('disconnect', () => {
            for (let [userId, userData] of onlineUsers.entries()) {
                if (userData.socketId === socket.id) {
                    onlineUsers.delete(userId);
                    log.info(`Usuario con ID ${userId} se desconectó.`);
                    break;
                }
            }
        });
    });


    const PORT = 3000;
    httpServer.listen(PORT, () => {
        console.log(`Servidor Express y Socket.IO corriendo en http://localhost:${PORT}`);
        log.info(`Servidor Express y Socket.IO corriendo en http://localhost:${PORT}`);
    });
}

function handleUpdates() {
    autoUpdater.on('update-available', (info) => {
        log.info('Actualización disponible.', info);
        dialog.showMessageBox({
            type: 'info',
            title: 'Actualización Disponible',
            message: `Hay una nueva versión (${info.version}) disponible. ¿Deseas descargarla ahora?`,
            buttons: ['Sí', 'No']
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
            }
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('Actualización descargada. Se instalará al reiniciar.');
        dialog.showMessageBox({
            type: 'info',
            title: 'Actualización Lista',
            message: `La nueva versión ha sido descargada. Reinicia la aplicación para instalarla.`,
            buttons: ['Reiniciar Ahora']
        }).then(() => {
            autoUpdater.quitAndInstall();
        });
    });

    autoUpdater.on('error', (err) => {
        log.error('Error en el auto-updater. ' + err);
    });
    
    // Inicia la búsqueda de actualizaciones
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

ipcMain.on('print-receipt', async (event, receiptData) => {
    const printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload-receipt.js') // Preload para recibos de alimentos
        }
    });

    try {
        await printWindow.loadFile(path.join(__dirname, '../receipt-template.html'));
        printWindow.webContents.send('receipt-data', receiptData);
    } catch (error) {
        console.error('Fallo al cargar la ventana de impresión de recibo:', error);
        log.error('Fallo al cargar la ventana de impresión de recibo:', error);
    }
});

ipcMain.on('print-analysis', async (event, analysisData) => {
    const printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload-analysis.js')
        }
    });

    try {
        await printWindow.loadFile(path.join(__dirname, '../analysis-template.html'));
        printWindow.webContents.send('analysis-data', analysisData);
    } catch (error) {
        log.error('Fallo al cargar la ventana de impresión de análisis:', error);
    }
});

ipcMain.on('print-asset-movement', async (event, movementData) => {
    const printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload-print.js')
        }
    });

    try {
        await printWindow.loadFile(path.join(__dirname, '../asset-movement-template.html'));
        printWindow.webContents.send('asset-movement-data', movementData);
    } catch (error) {
        console.error('Fallo al cargar la ventana de impresión de activos:', error);
        log.error('Fallo al cargar la ventana de impresión de activos:', error);
    }
});

ipcMain.on('print-loss-damage-report', async (event, reportData) => {
    const printWindow = new BrowserWindow({
        width: 800,
        height: 600,
        show: true,
        webPreferences: {
            contextIsolation: true,
            preload: path.join(__dirname, 'preload-loss-damage.js') // Usa el nuevo preload
        }
    });

    try {
        await printWindow.loadFile(path.join(__dirname, '../loss-damage-template.html'));
        printWindow.webContents.send('loss-damage-data', reportData); // Usa el canal correcto
    } catch (error) {
        console.error('Fallo al cargar la ventana de impresión:', error);
        log.error('Fallo al cargar la ventana de impresión:', error);
    }
});