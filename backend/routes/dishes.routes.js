const express = require('express');
const router = express.Router();
const dishesController = require('../controllers/dishes.controller');

router.get('/', dishesController.getAllDishes);
router.post('/', dishesController.createDish);
router.put('/:id', dishesController.updateDish);
router.delete('/:id', dishesController.deleteDish);

module.exports = router;
