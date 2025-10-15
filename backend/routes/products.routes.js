const express = require('express');
const router = express.Router();
const dbPool = require('../db');

router.post('/', async (req, res) => {
    try {
        const {
            barcode, name, description, unit_of_measure,
            category, brand, weight, created_by, min_stock_level, price
        } = req.body;

        if (!barcode || !name) {
            return res.status(400).json({ error: 'El código de barras y el nombre son requeridos.' });
        }

        const [result] = await dbPool.query(
            `INSERT INTO products 
             (barcode, name, description, unit_of_measure, category, brand, weight, created_by, updated_by, min_stock_level, price)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [barcode, name, description, unit_of_measure, category, brand, weight, created_by, created_by, min_stock_level, price]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        console.error("Error al crear producto:", error); 
        res.status(500).json({ error: 'Error al crear el producto.', details: error.message });
    }
});


// LEER todos los productos (CON paginación)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 15;
        const offset = (page - 1) * limit;

        const { search } = req.query;

        let whereClauses = [];
        let queryParams = [];

        if (search && search.trim() !== '') {
            const searchTerm = `%${search}%`;
            whereClauses.push('(name LIKE ? OR brand LIKE ? OR category LIKE ?)');
            queryParams.push(searchTerm, searchTerm, searchTerm);
        }

        const whereString = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

        const countQuery = `SELECT COUNT(*) as total FROM products ${whereString}`;
        const [countRows] = await dbPool.query(countQuery, queryParams);
        const totalItems = countRows[0].total;

        const dataQuery = `SELECT * FROM products ${whereString} ORDER BY name ASC LIMIT ? OFFSET ?`;
        const [products] = await dbPool.query(dataQuery, [...queryParams, limit, offset]);

        res.json({
            data: products,
            total: totalItems,
            currentPage: page,
            totalPages: Math.ceil(totalItems / limit)
        });
    } catch (error) {
        console.error("Error al obtener productos con filtros:", error);
        res.status(500).json({ error: 'Error al obtener los productos.' });
    }
});

//LEER TODOS los productos (sin paginación, para listas)
router.get('/all/list', async (req, res) => {
    try {
        const [products] = await dbPool.query('SELECT id, name, barcode FROM products ORDER BY name ASC');
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la lista de productos.' });
    }
});


// LEER un producto por código de barras
router.get('/barcode/:barcode', async (req, res) => {
    try {
        const { barcode } = req.params;
        const [product] = await dbPool.query('SELECT * FROM products WHERE barcode = ?', [barcode]);
        if (product.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        res.json(product[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el producto.' });
    }
});

// ACTUALIZAR un producto
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const {
            name, description, unit_of_measure, category,
            brand, weight, updated_by, min_stock_level, price
        } = req.body;
        
        await dbPool.query(
            `UPDATE products SET 
             name = ?, description = ?, unit_of_measure = ?, category = ?, 
             brand = ?, weight = ?, updated_by = ?, min_stock_level = ? , price = ?
             WHERE id = ?`,
            [name, description, unit_of_measure, category, brand, weight, updated_by, min_stock_level, price, id,]
        );
        res.json({ message: 'Producto actualizado exitosamente.' });
    } catch (error) {
        console.error("Error al actualizar producto:", error); // Loguea el error detallado
        res.status(500).json({ error: 'Error al actualizar el producto.', details: error.message });
    }
});

// ELIMINAR un producto
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await dbPool.query('DELETE FROM products WHERE id = ?', [id]);
        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el producto.' });
    }
});

module.exports = router;

router.get('/lookup/:barcode', async (req, res) => {
    try {
        const { barcode } = req.params;
        const [productRows] = await dbPool.query('SELECT * FROM products WHERE barcode = ?', [barcode]);

        if (productRows.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado.' });
        }
        const product = productRows[0];

        // Obtener stock por bodega
        const [stockByEntity] = await dbPool.query(`
            SELECT e.name as entity_name, 
                   COALESCE(SUM(CASE WHEN im.type LIKE 'entrada%' THEN im.quantity ELSE -im.quantity END), 0) as stock
            FROM entities e
            LEFT JOIN inventory_movements im ON e.id = im.entity_id AND im.product_id = ?
            GROUP BY e.id, e.name
            ORDER BY e.name;
        `, [product.id]);

        // Obtener los últimos 5 movimientos
        const [lastMovements] = await dbPool.query(`
            SELECT im.*, u.name as user_name, e.name as entity_name
            FROM inventory_movements im
            JOIN users u ON im.user_id = u.id
            JOIN entities e ON im.entity_id = e.id
            WHERE im.product_id = ?
            ORDER BY im.movement_timestamp DESC
            LIMIT 5;
        `, [product.id]);

        res.json({
            productDetails: product,
            stockDetails: stockByEntity,
            movements: lastMovements
        });
    } catch (error) {
        console.error('Error en lookup de producto:', error);
        res.status(500).json({ error: 'Error al buscar el producto.' });
    }
});