const express = require('express');
const router = express.Router();
const dbPool = require('../db');

// GET /api/entities
router.get('/', async (req, res) => {
    try {
        const [entities] = await dbPool.query('SELECT id, name FROM entities ORDER BY name');
        res.json(entities);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener las entidades.' });
    }
});

// GET /api/entities/:id
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [[entity]] = await dbPool.query('SELECT * FROM entities WHERE id = ?', [id]);
        if (!entity) {
            return res.status(404).json({ error: 'Entidad no encontrada.' });
        }
        res.json(entity);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la entidad.' });
    }
});


module.exports = router;