const express = require('express');
const router = express.Router();
const taskController = require('../controllers/tasks.controller');
const { isAdmin } = require('../middleware/auth.middleware');

// Obtener todas las tareas de una entidad
router.get('/', taskController.getAllTasks);

// Obtener una tarea específica por ID
router.get('/:id', taskController.getTaskById);

// Crear una nueva tarea (solo para administradores)
router.post('/', isAdmin, taskController.createTask);

// Eliminar una tarea
router.delete('/:id', isAdmin, taskController.deleteTask);

// Actualizar el estado de una tarea
router.patch('/:id/status', taskController.updateTaskStatus);

// Asignar un producto específico a un requerimiento de la pauta
router.patch('/product/:taskProductId/choose', taskController.setChosenProduct);

module.exports = router;
