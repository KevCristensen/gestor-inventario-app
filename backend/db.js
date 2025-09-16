const mysql = require('mysql2/promise');

const dbPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 30000 // Aumenta el tiempo de espera a 30 segundos
});

// --- Keep-Alive para la Conexión ---
// Cada 4 minutos, ejecuta una consulta simple para mantener la conexión activa.
setInterval(() => {
    dbPool.query('SELECT 1')
        .then(() => {
            // console.log('Ping a la base de datos exitoso.'); // Puedes descomentar esto para depurar
        })
        .catch(err => {
            console.error('Error en el ping a la base de datos:', err);
        });
}, 240000); // 240000 milisegundos = 4 minutos

module.exports = dbPool;
