const express = require('express');
const router = express.Router();
const dbPool = require('../db');

// Ruta para alertas de stock de UNA BODEGA ESPECÍFICA
// GET /api/dashboard/all-low-stock-alerts
router.get('/all-low-stock-alerts', async (req, res) => {
    try {
        // Opciones de ordenamiento
        const sortBy = req.query.sortBy || 'current_stock'; // Ordenar por stock por defecto
        const order = req.query.order === 'desc' ? 'DESC' : 'ASC'; // Ascendente por defecto

        const query = `
            SELECT 
                p.id, p.name, p.barcode, p.min_stock_level,
                e.name as entity_name,
                COALESCE(SUM(CASE WHEN im.type = 'entrada' THEN im.quantity ELSE -im.quantity END), 0) as current_stock
            FROM products p
            LEFT JOIN inventory_movements im ON p.id = im.product_id
            JOIN entities e ON im.entity_id = e.id
            GROUP BY p.id, p.name, p.barcode, p.min_stock_level, e.name
            HAVING current_stock <= p.min_stock_level
            ORDER BY ${sortBy} ${order}, e.name ASC;
        `;
        const [products] = await dbPool.query(query);
        res.json(products);
    } catch (error) {
        console.error("Error al obtener alertas de stock:", error);
        res.status(500).json({ error: 'Error al obtener alertas de stock.' });
    }
});


// Ruta para ver el INVENTARIO GENERAL (todas las bodegas)
// GET /api/dashboard/global-inventory
router.get('/global-inventory', async (req, res) => {
    try {
        const query = `
            SELECT 
                p.id, p.name, p.barcode, 
                e.id as entity_id, -- AÑADE ESTA LÍNEA
                e.name as entity_name,
                SUM(CASE WHEN im.type = 'entrada' THEN im.quantity ELSE -im.quantity END) as stock
            FROM products p
            JOIN inventory_movements im ON p.id = im.product_id
            JOIN entities e ON im.entity_id = e.id
            GROUP BY p.id, p.name, p.barcode, e.id, e.name
            ORDER BY p.name, e.name;
        `;
        const [inventory] = await dbPool.query(query);
        res.json(inventory);
    } catch (error) {
        console.error("Error al obtener inventario global:", error);
        res.status(500).json({ error: 'Error al obtener inventario global.' });
    }
});
router.get('/summary', async (req, res) => {
    try {
        const [[productsCount]] = await dbPool.query("SELECT COUNT(*) as total FROM products");
        const [[providersCount]] = await dbPool.query("SELECT COUNT(*) as total FROM providers");

        res.json({
            products: productsCount.total,
            providers: providersCount.total
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el resumen.' });
    }
});

module.exports = router;