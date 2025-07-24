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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const offset = (page - 1) * limit;

        const [products] = await dbPool.query(
            'SELECT * FROM products ORDER BY name ASC LIMIT ? OFFSET ?',
            [limit, offset]
        );
        const [[{ total }]] = await dbPool.query('SELECT COUNT(*) as total FROM products');

        res.json({
            data: products,
            total: total
        });
    } catch (error) {
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