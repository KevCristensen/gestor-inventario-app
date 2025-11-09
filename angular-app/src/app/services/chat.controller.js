const db = require('../db');

/**
 * Obtiene todos los usuarios, excluyendo al usuario actual.
 */
exports.getUsers = async (req, res) => {
  try {
    const [users] = await db.query('SELECT id, name, role, entity_id FROM users WHERE is_active = 1');
    res.json(users);
  } catch (error) {
    console.error('Error al obtener usuarios para el chat:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/**
 * Obtiene el historial de una conversación entre dos usuarios.
 */
exports.getConversation = async (req, res) => {
  const { userId1, userId2 } = req.params;
  try {
    const [messages] = await db.query(`
      SELECT m.id, m.from_user_id, m.to_user_id, m.content, m.created_at, u.name as user_name
       FROM chat_messages m
       JOIN users u ON m.from_user_id = u.id
       WHERE (m.from_user_id = ? AND m.to_user_id = ?) OR (m.from_user_id = ? AND m.to_user_id = ?)
       ORDER BY m.created_at ASC`,
      [userId1, userId2, userId2, userId1]
    );
    res.json(messages);
  } catch (error) {
    console.error('Error al obtener la conversación:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/**
 * Guarda un nuevo mensaje en la base de datos.
 */
exports.postMessage = async (req, res) => {
  const { from_user_id, to_user_id, content, entity_id } = req.body;
  try {
    const [result] = await db.query(`
      INSERT INTO chat_messages (from_user_id, to_user_id, content, entity_id) VALUES (?, ?, ?, ?)`,
      [from_user_id, to_user_id, content, entity_id]
    );
    // Devolvemos el mensaje completo para poder reenviarlo por socket si es necesario.
    const [message] = await db.query('SELECT * FROM chat_messages WHERE id = ?', [result.insertId]);
    res.status(201).json(message[0]);
  } catch (error) {
    console.error('Error al guardar el mensaje:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/**
 * Obtiene el conteo de mensajes no leídos para un usuario.
 */
exports.getUnreadCount = async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await db.query(
      'SELECT COUNT(id) as count FROM chat_messages WHERE to_user_id = ? AND is_read = 0',
      [userId]
    );
    res.json({ count: rows[0].count });
  } catch (error) {
    console.error('Error al obtener mensajes no leídos:', error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};