const express = require('express');
const router = express.Router();
const dbPool = require('../db');

// Ruta para registrar una salida de inventario
// en backend/routes/inventory.routes.js

router.post('/exit', async (req, res) => {
    const { user_id, entity_id, notes, items } = req.body;

    if (!user_id || !entity_id || !items || items.length === 0) {
        return res.status(400).json({ error: 'Faltan datos requeridos.' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        // --- NUEVO BLOQUE DE VALIDACIÓN DE STOCK ---
        for (const item of items) {
            // 1. Obtener el stock actual del producto en la bodega correcta
            const [[stockData]] = await connection.query(
                `SELECT COALESCE(SUM(CASE WHEN type = 'entrada' THEN quantity ELSE -quantity END), 0) as current_stock
                 FROM inventory_movements
                 WHERE product_id = ? AND entity_id = ?`,
                [item.product_id, entity_id]
            );

            // 2. Comparar el stock actual con la cantidad que se quiere retirar
            if (stockData.current_stock < item.quantity) {
                // Si no hay suficiente stock, revertir la transacción y enviar un error
                await connection.rollback();
                return res.status(400).json({
                    error: `Stock insuficiente para el producto ID ${item.product_id}. Stock actual: ${stockData.current_stock}, Salida solicitada: ${item.quantity}.`
                });
            }
        }
        // --- FIN DEL BLOQUE DE VALIDACIÓN ---

        // Si todas las validaciones pasan, proceder a registrar la salida
        for (const item of items) {
            await connection.query(
                'INSERT INTO inventory_movements (product_id, quantity, type, user_id, notes, entity_id) VALUES (?, ?, ?, ?, ?, ?)',
                [item.product_id, item.quantity, 'salida', user_id, notes, entity_id]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'Salida de inventario registrada exitosamente.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error en la transacción de salida:", error);
        res.status(500).json({ error: 'Error al registrar la salida.', details: error.message });
    } finally {
        if (connection) connection.release();
    }
});

// LEER SALIDAS POR RANGO DE FECHAS
router.get('/exits-by-date', async (req, res) => {
  try {
    const { startDate, endDate, entityId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'Se requieren fechas de inicio y fin.' });
    }

    const endOfDay = `${endDate} 23:59:59`;
    
    let query = `
      SELECT 
        im.id,
        im.notes,
        im.movement_timestamp,
        u.name as user_name,
        p.name as product_name,
        im.quantity
      FROM inventory_movements im
      JOIN users u ON im.user_id = u.id
      JOIN products p ON im.product_id = p.id
      WHERE im.type = 'salida'
        AND im.movement_timestamp BETWEEN ? AND ?
    `;
    const params = [startDate, endOfDay];

    if (entityId && entityId !== 'all') {
      query += ' AND im.entity_id = ?';
      params.push(entityId);
    }

    query += ' ORDER BY im.movement_timestamp DESC';

    const [rows] = await dbPool.query(query, params);

    res.json(rows);
  } catch (error) {
    console.error("Error al obtener las salidas por fecha:", error);
    res.status(500).json({ error: 'Error al obtener las salidas.' });
  }
});

module.exports = router;