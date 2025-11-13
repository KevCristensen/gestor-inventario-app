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
        const { search } = req.query;

        let query = `
            SELECT 
                p.id, p.name, p.barcode, p.min_stock_level, -- Añade min_stock_level
                e.id as entity_id,
                e.short_name as entity_name, -- ¡CAMBIO CLAVE! Usamos la abreviatura
                SUM(CASE WHEN im.type = 'entrada' THEN im.quantity ELSE -im.quantity END) as stock
            FROM products p
            JOIN inventory_movements im ON p.id = im.product_id
            JOIN entities e ON im.entity_id = e.id
        `;
        const params = [];

        query += `
            GROUP BY p.id, p.name, p.barcode, p.min_stock_level, e.id, e.short_name
        `;

        if (search && search.trim() !== '') {
            query += ' HAVING p.name LIKE ? OR p.barcode LIKE ?'; // Usamos HAVING en lugar de WHERE
            const searchTerm = `%${search}%`;
            params.push(searchTerm, searchTerm);
        }

        query += ' ORDER BY p.name, e.short_name;';

        const [inventory] = await dbPool.query(query, params); // Pasamos los params a la consulta
        res.json(inventory);
    } catch (error) {
        console.error("Error al obtener inventario global:", error);
        res.status(500).json({ error: 'Error al obtener inventario global.' });
    }
});
router.get('/summary', async (req, res) => {
    const user = req.user; // ¡NUEVO! Obtenemos el usuario de la petición

    try {
        const [[productsCount]] = await dbPool.query("SELECT COUNT(*) as total FROM products");
        const [[providersCount]] = await dbPool.query("SELECT COUNT(*) as total FROM providers");

        // --- ¡MODIFICADO! Stock total por bodega (condicional por rol) ---
        let stockByEntityQuery = `
            SELECT
                e.short_name as entity_name, -- Usamos short_name
                COALESCE(SUM(CASE WHEN im.type = 'entrada' THEN im.quantity ELSE -im.quantity END), 0) as total_stock
            FROM 
                entities e
            LEFT JOIN 
                inventory_movements im ON e.id = im.entity_id`;
        
        const queryParams = [];

        if (user.role !== 'admin') {
            stockByEntityQuery += ` WHERE e.id = ?`;
            queryParams.push(user.entity_id);
        }

        stockByEntityQuery += ` GROUP BY e.id, e.short_name ORDER BY e.name;`;
        const [stockByEntity] = await dbPool.query(stockByEntityQuery, queryParams);

        // --- ¡MODIFICADO! Movimientos del día para TODAS las bodegas (o una si no es admin) ---
        let dailySummaryQuery = `
            SELECT
                e.id,
                e.short_name as entityName,
                (SELECT COALESCE(SUM(ri.quantity), 0) 
                 FROM reception_items ri
                 JOIN reception_logs rl ON ri.reception_log_id = rl.id
                 WHERE rl.entity_id = e.id AND DATE(rl.reception_timestamp) = CURDATE()) as todayEntries,
                (SELECT COALESCE(SUM(quantity), 0) 
                 FROM inventory_movements 
                 WHERE entity_id = e.id AND type = 'salida' AND DATE(movement_timestamp) = CURDATE()) as todayExits
            FROM entities e
        `;

        const dailySummaryParams = [];
        if (user.role !== 'admin') {
            dailySummaryQuery += ` WHERE e.id = ?`;
            dailySummaryParams.push(user.entity_id);
        }

        const [dailySummaries] = await dbPool.query(dailySummaryQuery, dailySummaryParams);

        res.json({
            products: productsCount.total,
            providers: providersCount.total,
            stockByEntity: stockByEntity,
            // ¡MODIFICADO! Ahora es un array
            dailySummaries: dailySummaries
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el resumen.' });
    }
});

module.exports = router;