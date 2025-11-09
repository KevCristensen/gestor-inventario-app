const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chat.controller');

// Rutas para el chat
router.get('/users', chatController.getUsers);
router.get('/conversation/:userId1/:userId2', chatController.getConversation);
router.post('/messages', chatController.postMessage);
router.get('/unread-count/:userId', chatController.getUnreadCount);
// La ruta para marcar como leído la crearemos después, ya que es más compleja.

module.exports = router;