const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { autoUpdater } = require('electron-updater');

// --- Dependencias del Backend ---
const express = require('express');
const cors = require('cors'); 
const mysql = require('mysql2/promise');
require('dotenv').config();

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
    backendApp.use(cors()); // Habilita CORS para todas las rutas
    backendApp.use(express.json());

    // Configuración de la conexión a la base de datos
    const dbPool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    });

    // Endpoint de prueba para verificar la conexión
    backendApp.get('/api/test-db', async (req, res) => {
        try {
            const [rows] = await dbPool.query('SELECT "Conexión Exitosa" as message');
            res.json(rows[0]);
        } catch (error) {
            console.error('Error al conectar a la DB:', error);
            res.status(500).json({ error: 'Error de base de datos' });
        }
    });

    // --- Aquí irán todos tus futuros endpoints (login, productos, etc.) ---

    const PORT = 3000;
    backendApp.listen(PORT, () => {
        console.log(`Servidor Express corriendo en http://localhost:${PORT}`);
    });
}


app.on('ready', () => {
    createWindow();
    startServer(); // <-- Inicia el backend cuando la app está lista
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