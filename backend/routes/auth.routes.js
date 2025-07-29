const express = require('express');
const router = express.Router();
const dbPool = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

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
            entity_id: user.entity_id 
          };
          
        const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '8h' });

        res.json({
            message: 'Login exitoso',
            token: token,
            user: tokenPayload
        });

    } catch (error) {
        console.error('Error en el login:', error);
        res.status(500).json({ error: 'Error interno del servidor.' });
    }
});

module.exports = router;