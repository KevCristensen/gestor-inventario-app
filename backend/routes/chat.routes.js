const express = require('express');
const router = express.Router();
const dbPool = require('../db');

// Obtener todos los usuarios con los que se puede chatear
router.get('/users', async (req, res) => {
    try {
        const [users] = await dbPool.query('SELECT id, name, email, entity_id FROM users');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener usuarios.' });
    }
});

// Obtener la conversación entre el usuario actual y otro usuario
router.get('/conversation/:userId/:otherUserId', async (req, res) => {
    try {
        const { userId, otherUserId } = req.params;
        const [messages] = await dbPool.query(
            `SELECT * FROM chat_messages 
             WHERE (from_user_id = ? AND to_user_id = ?) OR (from_user_id = ? AND to_user_id = ?)
             ORDER BY created_at ASC`,
            [userId, otherUserId, otherUserId, userId]
        );
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la conversación.' });
    }
});

// POST /api/chat/message
router.post('/message', async (req, res) => {
    try {
        const { from_user_id, to_user_id, message_text, entity_id } = req.body;
        await dbPool.query(
            'INSERT INTO chat_messages (from_user_id, to_user_id, entity_id, message_text) VALUES (?, ?, ?, ?)',
            [from_user_id, to_user_id, entity_id, message_text]
        );
        res.status(201).json({ message: 'Message saved' });
    } catch (error) {
        res.status(500).json({ error: 'Error saving message.' });
    }
});


// OBTENER EL CONTEO DE MENSAJES NO LEÍDOS
router.get('/unread-count/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const [[{ total }]] = await dbPool.query(
            'SELECT COUNT(*) as total FROM chat_messages WHERE to_user_id = ? AND is_read = FALSE',
            [userId]
        );
        res.json({ count: total });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el conteo de no leídos.' });
    }
});

// MARCAR MENSAJES COMO LEÍDOS
router.post('/messages/mark-as-read', async (req, res) => {
    try {
        const { userId, otherUserId } = req.body;
        await dbPool.query(
            'UPDATE chat_messages SET is_read = TRUE WHERE from_user_id = ? AND to_user_id = ?',
            [otherUserId, userId]
        );
        res.sendStatus(200);
    } catch (error) {
        res.status(500).json({ error: 'Error al marcar mensajes como leídos.' });
    }
});


module.exports = router;