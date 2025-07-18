const express = require('express');
const router = express.Router();
const dbPool = require('../db'); // Importamos la conexión a la DB

// CREAR un nuevo proveedor
router.post('/', async (req, res) => {
    try {
        const { name, rut, contact_person, phone, email } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'El nombre es requerido.' });
        }
        const [result] = await dbPool.query(
            'INSERT INTO providers (name, rut, contact_person, phone, email) VALUES (?, ?, ?, ?, ?)',
            [name, rut, contact_person, phone, email]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el proveedor.', details: error.message });
    }
});

// LEER todos los proveedores
router.get('/', async (req, res) => {
    try {
        const [providers] = await dbPool.query('SELECT * FROM providers WHERE is_active = TRUE');
        res.json(providers);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los proveedores.' });
    }
});

// LEER un solo proveedor por ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [provider] = await dbPool.query('SELECT * FROM providers WHERE id = ?', [id]);
        if (provider.length === 0) {
            return res.status(404).json({ error: 'Proveedor no encontrado.' });
        }
        res.json(provider[0]);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener el proveedor.' });
    }
});

// ACTUALIZAR un proveedor
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, rut, contact_person, phone, email, is_active } = req.body;
        await dbPool.query(
            'UPDATE providers SET name = ?, rut = ?, contact_person = ?, phone = ?, email = ?, is_active = ? WHERE id = ?',
            [name, rut, contact_person, phone, email, is_active, id]
        );
        res.json({ message: 'Proveedor actualizado exitosamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el proveedor.', details: error.message });
    }
});

module.exports = router;