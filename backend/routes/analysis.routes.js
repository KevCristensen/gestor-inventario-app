const express = require('express');
const router = express.Router();
const dbPool = require('../db');

router.get('/consumption', async (req, res) => {
    try {
        const { startDate, endDate, entityId } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Las fechas de inicio y fin son requeridas.' });
        }

        let query = `
            SELECT 
                p.name as productName,
                p.barcode,
                e.name as entityName,
                SUM(im.quantity) as totalExits,
                COALESCE(SUM(im.quantity * p.price), 0) as totalValue
            FROM 
                inventory_movements im
            JOIN 
                products p ON im.product_id = p.id
            JOIN
                entities e ON im.entity_id = e.id
            WHERE 
                im.type = 'salida' AND 
                im.movement_timestamp BETWEEN ? AND ?
        `;
        const params = [startDate, `${endDate} 23:59:59`];

        // Si se especifica una bodega, se añade al filtro
        if (entityId && entityId !== 'all') {
            query += ' AND im.entity_id = ?';
            params.push(entityId);
        }

        query += ' GROUP BY p.name, p.barcode, e.name ORDER BY e.name, totalExits DESC;';

      

        const [results] = await dbPool.query(query, params);
        res.json(results);
    } catch (error) {
        console.error("Error al generar el reporte de consumo:", error);
        res.status(500).json({ error: 'Error al generar el reporte.' });
    }
});

router.get('/consumption-details', async (req, res) => {
    try {
        const { startDate, endDate, entityId } = req.query;
        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Las fechas de inicio y fin son requeridas.' });
        }

        let query = `
            SELECT 
                im.movement_timestamp,
                p.name as productName,
                im.quantity,
                im.notes,
                u.email as userEmail
            FROM inventory_movements im
            JOIN products p ON im.product_id = p.id
            JOIN users u ON im.user_id = u.id
            WHERE 
                im.type = 'salida' AND 
                im.movement_timestamp BETWEEN ? AND ?
        `;
        const params = [startDate, `${endDate} 23:59:59`];
        if (entityId) {
            query += ' AND im.entity_id = ?';
            params.push(entityId);
        }

        query += ' ORDER BY im.movement_timestamp DESC;';
        const [results] = await dbPool.query(query, params);
        res.json(results);
    } catch (error) {
        console.error("Error al generar el reporte de consumo:", error);
        res.status(500).json({ error: 'Error al generar el reporte.' });
    }
});

module.exports = router;