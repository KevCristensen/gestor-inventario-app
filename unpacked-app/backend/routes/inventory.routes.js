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

module.exports = router;