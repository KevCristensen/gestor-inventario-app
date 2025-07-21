const express = require('express');
const router = express.Router();
const dbPool = require('../db');

// Ruta para crear una nueva recepción de mercadería

// POST /api/receptions
router.post('/', async (req, res) => {
    // 1. Obtén el entity_id del cuerpo de la petición
    const { provider_id, user_id, invoice_number, transport_temp, items, entity_id } = req.body;

    // 2. Valida que el entity_id exista
    if (!provider_id || !user_id || !items || items.length === 0 || !entity_id) {
        return res.status(400).json({ error: 'Faltan datos requeridos (entity_id incluido).' });
    }

    let connection;
    try {
        // Obtenemos una conexión del pool para manejar la transacción
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        // 3. Añade entity_id al insertar en reception_logs
        const [receptionLogResult] = await connection.query(
            'INSERT INTO reception_logs (provider_id, user_id, invoice_number, transport_temp, entity_id) VALUES (?, ?, ?, ?, ?)',
            [provider_id, user_id, invoice_number, transport_temp, entity_id]
        );
        const receptionLogId = receptionLogResult.insertId;

        for (const item of items) {
            // Insertar en la tabla de detalle 'reception_items'
            await connection.query(
                'INSERT INTO reception_items (reception_log_id, product_id, quantity, lot_number, product_temp, expiration_date) VALUES (?, ?, ?, ?, ?, ?)',
                [receptionLogId, item.product_id, item.quantity, item.lot_number, item.product_temp, item.expiration_date]
            );

            // Insertar el movimiento de 'entrada' en el inventario
            await connection.query(
                'INSERT INTO inventory_movements (product_id, quantity, type, user_id, notes, entity_id) VALUES (?, ?, ?, ?, ?, ?)',
                [item.product_id, item.quantity, 'entrada', user_id, `Recepción ID: ${receptionLogId}`, entity_id]
            );
        }

        // Si todo salió bien, confirmamos la transacción
        await connection.commit();
        res.status(201).json({ message: 'Recepción registrada exitosamente.', receptionId: receptionLogId });

    } catch (error) {
        // Si algo falló, deshacemos todos los cambios
        if (connection) {
            await connection.rollback();
        }
        console.error("Error en la transacción de recepción:", error);
        res.status(500).json({ error: 'Error al registrar la recepción.', details: error.message });
    } finally {
        // Siempre liberamos la conexión al final
        if (connection) {
            connection.release();
        }
    }
});

module.exports = router;