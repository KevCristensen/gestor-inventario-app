const express = require('express');
const router = express.Router();
const dbPool = require('../db');

// CREAR un nuevo activo
router.post('/', async (req, res) => {
    try {
        const { name, category, description } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'El nombre es requerido.' });
        }
        const [result] = await dbPool.query(
            'INSERT INTO assets (name, category, description) VALUES (?, ?, ?)',
            [name, category, description]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el activo.', details: error.message });
    }
});

// LEER todos los activos
router.get('/', async (req, res) => {
    try {
        const [assets] = await dbPool.query('SELECT * FROM assets ORDER BY name ASC');
        res.json(assets);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los activos.' });
    }
});

// ACTUALIZAR un activo
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, category, description } = req.body;
        await dbPool.query(
            'UPDATE assets SET name = ?, category = ?, description = ? WHERE id = ?',
            [name, category, description, id]
        );
        res.json({ message: 'Activo actualizado exitosamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el activo.', details: error.message });
    }
});

// ELIMINAR un activo
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await dbPool.query('DELETE FROM assets WHERE id = ?', [id]);
        res.sendStatus(204);
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el activo.' });
    }
});


router.get('/inventory', async (req, res) => {
    try {
        const query = `
            SELECT 
                a.name as asset_name,
                e.name as entity_name,
                ai.quantity
            FROM asset_inventory ai
            JOIN assets a ON ai.asset_id = a.id
            JOIN entities e ON ai.entity_id = e.id
            WHERE ai.quantity > 0
            ORDER BY a.name, e.name;
        `;
        const [inventory] = await dbPool.query(query);
        res.json(inventory);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el inventario de activos.' });
    }
});



module.exports = router;