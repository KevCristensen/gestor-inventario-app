const express = require('express');
const router = express.Router();
const dbPool = require('../db');


router.post('/', async (req, res) => {
    // Ahora esperamos un objeto que contiene una lista de 'items'
    const { type, from_entity_id, to_entity_id, event_details, user_id, items } = req.body;

    if (!type || !user_id || !items || items.length === 0) {
        return res.status(400).json({ error: 'Faltan datos requeridos.' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        // Iteramos sobre la lista de items que nos envía el frontend
        for (const item of items) {
            // Registrar el movimiento en el historial
            await connection.query(
                `INSERT INTO asset_movements 
                 (asset_id, quantity, type, from_entity_id, to_entity_id, event_details, user_id) 
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [item.asset_id, item.quantity, type, from_entity_id, to_entity_id, event_details, user_id]
            );

            // Actualizar el inventario de la bodega de origen
            if (from_entity_id) {
                await connection.query(
                    `UPDATE asset_inventory SET quantity = quantity - ? WHERE asset_id = ? AND entity_id = ?`,
                    [item.quantity, item.asset_id, from_entity_id]
                );
            }

            // Actualizar el inventario de la bodega de destino
            if (to_entity_id) {
                await connection.query(
                    `INSERT INTO asset_inventory (asset_id, entity_id, quantity)
                     VALUES (?, ?, ?)
                     ON DUPLICATE KEY UPDATE quantity = quantity + ?`,
                    [item.asset_id, to_entity_id, item.quantity, item.quantity]
                );
            }
        }

        await connection.commit();
        res.status(201).json({ message: 'Movimiento registrado exitosamente.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error en la transacción de movimiento de activos:", error);
        res.status(500).json({ error: 'Error al registrar el movimiento.', details: error.message });
    } finally {
        if (connection) connection.release();
    }
});


// RUTA PARA VER EL HISTORIAL DE MOVIMIENTOS
router.get('/', async (req, res) => {
    try {
        const query = `
            SELECT 
                am.*, 
                a.name as asset_name,
                u.email as user_email,
                from_e.name as from_entity_name,
                to_e.name as to_entity_name
            FROM asset_movements am
            JOIN assets a ON am.asset_id = a.id
            JOIN users u ON am.user_id = u.id
            LEFT JOIN entities from_e ON am.from_entity_id = from_e.id
            LEFT JOIN entities to_e ON am.to_entity_id = to_e.id
            ORDER BY am.movement_date DESC;
        `;
        const [movements] = await dbPool.query(query);
        res.json(movements);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el historial de movimientos.' });
    }
});


module.exports = router;