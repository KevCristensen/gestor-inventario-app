const express = require('express');
const router = express.Router();
const tasksController = require('../controllers/tasks.controller');

// Ruta para obtener todas las pautas (con filtros)
router.get('/', tasksController.getTasks);

// Ruta para obtener una pauta por ID
router.get('/:id', tasksController.getTaskById);

// Ruta para crear una nueva pauta
router.post('/', tasksController.createTask);

// Ruta para actualizar una pauta
router.put('/:id', tasksController.updateTask);

// Ruta para eliminar una pauta
router.delete('/:id', tasksController.deleteTask);

// Ruta para actualizar el estado y/o las observaciones de una pauta
router.patch('/:id', tasksController.updateTaskStatus);

// Ruta para asignar un producto a un requerimiento de una pauta
router.post('/:id/assign-product', tasksController.assignProductToRequirement);

module.exports = router;