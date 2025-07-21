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

router.get('/receptions', async (req, res) => {
    try {
        const query = `
            SELECT 
                rl.id as reception_id,
                rl.invoice_number,
                pvd.name as provider_name,
                rl.reception_timestamp,
                usr.email as received_by,
                ent.name as entity_name,
                prod.name as product_name,
                prod.barcode,
                ri.quantity,
                ri.lot_number,
                ri.expiration_date,
                ri.product_temp,
                rl.transport_temp
            FROM 
                reception_logs rl
            JOIN 
                reception_items ri ON rl.id = ri.reception_log_id
            JOIN 
                providers pvd ON rl.provider_id = pvd.id
            JOIN 
                users usr ON rl.user_id = usr.id
            JOIN 
                entities ent ON rl.entity_id = ent.id
            JOIN 
                products prod ON ri.product_id = prod.id
            ORDER BY 
                rl.reception_timestamp DESC, rl.id DESC;
        `;
        const [receptions] = await dbPool.query(query);

        const json2csvParser = new Parser();
        const csv = json2csvParser.parse(receptions);

        res.header('Content-Type', 'text/csv');
        res.attachment('reporte-recepciones.csv');
        res.send(csv);

    } catch (error) {
        console.error("Error al generar el reporte de recepciones:", error);
        res.status(500).json({ error: 'Error al generar el reporte.' });
    }
});

module.exports = router;