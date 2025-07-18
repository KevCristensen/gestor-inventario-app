const express = require('express');
const router = express.Router();
const dbPool = require('../db');

// CREAR un nuevo producto
router.post('/', async (req, res) => {
    try {
        const {
            barcode, name, description, unit_of_measure,
            category, brand, weight, created_by
        } = req.body;

        if (!barcode || !name) {
            return res.status(400).json({ error: 'El código de barras y el nombre son requeridos.' });
        }

        const [result] = await dbPool.query(
            `INSERT INTO products (barcode, name, description, unit_of_measure, category, brand, weight, created_by, updated_by)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [barcode, name, description, unit_of_measure, category, brand, weight, created_by, created_by]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el producto.', details: error.message });
    }
});

// LEER todos los productos
router.get('/', async (req, res) => {
    try {
        const [products] = await dbPool.query('SELECT * FROM products');
        res.json(products);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los productos.' });
    }
});

// LEER un producto por código de barras (para el escáner)
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
            brand, weight, updated_by
        } = req.body;
        
        await dbPool.query(
            `UPDATE products SET name = ?, description = ?, unit_of_measure = ?, category = ?, 
             brand = ?, weight = ?, updated_by = ? WHERE id = ?`,
            [name, description, unit_of_measure, category, brand, weight, updated_by, id]
        );
        res.json({ message: 'Producto actualizado exitosamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el producto.', details: error.message });
    }
});

module.exports = router;