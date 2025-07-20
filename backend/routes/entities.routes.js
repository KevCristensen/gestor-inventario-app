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

module.exports = router;