const express = require('express');
const router = express.Router();
const dbPool = require('../db');
const { Parser } = require('json2csv');

// GET /api/reports/inventory-movements?entityId=1 (filtrado)
// GET /api/reports/inventory-movements (general)
router.get('/inventory-movements', async (req, res) => {
    try {
        const { entityId } = req.query; // Obtenemos el entityId de los parámetros de la URL

        let query = `
            SELECT 
                im.id, p.name as product_name, p.barcode, im.quantity,
                im.type, u.email as user_email, im.entity_id, im.notes,
                im.movement_timestamp
            FROM inventory_movements im
            JOIN products p ON im.product_id = p.id
            JOIN users u ON im.user_id = u.id
        `;
        
        const queryParams = [];

        if (entityId) {
            query += ' WHERE im.entity_id = ?';
            queryParams.push(entityId);
        }

        query += ' ORDER BY im.movement_timestamp DESC;';

        const [movements] = await dbPool.query(query, queryParams);

        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(movements);

        res.header('Content-Type', 'text/csv');
        res.attachment('reporte-movimientos.csv');
        res.send(csv);

    } catch (error) {
        console.error("Error al generar el reporte:", error);
        res.status(500).json({ error: 'Error al generar el reporte.' });
    }
});

module.exports = router;