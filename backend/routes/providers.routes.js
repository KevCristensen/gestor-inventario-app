const express = require('express');
const router = express.Router();
const dbPool = require('../db'); // Importamos la conexión a la DB

// CREAR un nuevo proveedor
router.post('/', async (req, res) => {
    try {
        const { name, rut, contact_person, phone, email, delivery_schedule, delivery_days } = req.body;
        if (!name) {
            return res.status(400).json({ error: 'El nombre es requerido.' });
        }
        const [result] = await dbPool.query(
            'INSERT INTO providers (name, rut, contact_person, phone, email, delivery_schedule, delivery_days) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [name, rut, contact_person, phone, email, delivery_schedule, delivery_days]
        );
        res.status(201).json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: 'Error al crear el proveedor.', details: error.message });
    }
});

// LEER todos los proveedores (con paginación)
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 15;
        const offset = (page - 1) * limit;

        // Consulta para obtener los proveedores de la página actual
        const [providers] = await dbPool.query(
            'SELECT * FROM providers WHERE is_active = TRUE ORDER BY name ASC LIMIT ? OFFSET ?',
            [limit, offset]
        );

        // Consulta para obtener el número total de proveedores
        const [[{ total }]] = await dbPool.query('SELECT COUNT(*) as total FROM providers WHERE is_active = TRUE');

        res.json({
            data: providers,
            total: total
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los proveedores.' });
    }
});

// LEER TODOS los proveedores (sin paginación, para listas)
router.get('/all/list', async (req, res) => {
    try {
        const [providers] = await dbPool.query('SELECT id, name FROM providers WHERE is_active = TRUE ORDER BY name ASC');
        res.json(providers);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener la lista de proveedores.' });
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
        const { name, rut, contact_person, phone, email, is_active, delivery_schedule, delivery_days } = req.body;
        await dbPool.query(
            'UPDATE providers SET name = ?, rut = ?, contact_person = ?, phone = ?, email = ?, is_active = ?, delivery_schedule = ?, delivery_days = ? WHERE id = ?',
            [name, rut, contact_person, phone, email, is_active, delivery_schedule, delivery_days, id]
        );
        res.json({ message: 'Proveedor actualizado exitosamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar el proveedor.', details: error.message });
    }
});

// ELIMINAR un proveedor
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await dbPool.query('DELETE FROM providers WHERE id = ?', [id]);
        res.sendStatus(204); // 204 significa "No Content", la operación fue exitosa
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el proveedor.' });
    }
});

module.exports = router;