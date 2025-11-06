const express = require('express');
const router = express.Router();
const dbPool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const log = require('electron-log');
const { checkRole } = require('../middleware/auth.middleware');

// Endpoint para autenticar un usuario
// Ruta: POST /api/auth/login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email y contraseña son requeridos.' });
    }

    try {
        const [users] = await dbPool.query('SELECT * FROM users WHERE email = ?', [email]);
        
        if (users.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        if (!user.is_active) {
            return res.status(403).json({ message: 'La cuenta se encuentra inactiva. Contacte al administrador.' });
        }

        const tokenPayload = { 
            id: user.id, 
            email: user.email, 
            name: user.name, // <-- Añade esta línea
            role: user.role, 
            entity_id: user.entity_id,
            status: user.status // <-- AÑADIR ESTA LÍNEA
          };
          
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.json({
            message: 'Login exitoso',
            token: token,
            user: tokenPayload
        });

    } catch (error) {
        log.error('!!! ERROR CRÍTICO DURANTE EL LOGIN (PROBABLEMENTE DB) !!!:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
        res.status(500).json({ message: 'Error interno del servidor.', details: error.code || error.message });
    }
});

router.put('/status', checkRole, async (req, res) => {
    const { userId, status } = req.body;
    const validStatuses = ['en linea', 'ausente', 'ocupado'];

    if (!userId || !status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Datos no válidos para actualizar el estado.' });
    }

    // Asegurarnos que el usuario que hace la petición es el mismo que se quiere actualizar, o es un admin.
    if (req.user.id !== userId && req.user.role !== 'admin') {
        return res.status(403).json({ error: 'No tienes permiso para cambiar el estado de otro usuario.' });
    }

    try {
        await dbPool.query('UPDATE users SET status = ? WHERE id = ?', [status, userId]);
        res.json({ message: 'Estado actualizado correctamente.' });
    } catch (error) {
        log.error('Error al actualizar el estado del usuario:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar el estado.' });
    }
});


module.exports = router;