const dbPool = require('../db');

// Obtener todos los platillos con sus ingredientes
exports.getAllDishes = async (req, res) => {
    try {
        const [dishes] = await dbPool.query('SELECT * FROM dishes ORDER BY name ASC');
        for (const dish of dishes) {
            const [ingredients] = await dbPool.query('SELECT * FROM dish_ingredients WHERE dish_id = ?', [dish.id]);
            dish.ingredients = ingredients;
        }
        res.json(dishes);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los platillos.' });
    }
};

// Crear un nuevo platillo con sus ingredientes
exports.createDish = async (req, res) => {
    const { name, type, ingredients } = req.body;
    if (!name || !type || !ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ error: 'Faltan datos requeridos.' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        const [dishResult] = await connection.query('INSERT INTO dishes (name, type) VALUES (?, ?)', [name, type]);
        const dishId = dishResult.insertId;

        if (ingredients.length > 0) {
            const ingredientValues = ingredients.map(ing => [dishId, ing.product_name, ing.grammage]);
            await connection.query('INSERT INTO dish_ingredients (dish_id, product_name, grammage) VALUES ?', [ingredientValues]);
        }

        await connection.commit();
        res.status(201).json({ message: 'Platillo creado exitosamente.', dishId });
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: 'Error al crear el platillo.', details: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// Actualizar un platillo
exports.updateDish = async (req, res) => {
    const { id } = req.params;
    const { name, type, ingredients } = req.body;

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        await connection.query('UPDATE dishes SET name = ?, type = ? WHERE id = ?', [name, type, id]);
        await connection.query('DELETE FROM dish_ingredients WHERE dish_id = ?', [id]);

        if (ingredients && ingredients.length > 0) {
            const ingredientValues = ingredients.map(ing => [id, ing.product_name, ing.grammage]);
            await connection.query('INSERT INTO dish_ingredients (dish_id, product_name, grammage) VALUES ?', [ingredientValues]);
        }

        await connection.commit();
        res.json({ message: 'Platillo actualizado exitosamente.' });
    } catch (error) {
        if (connection) await connection.rollback();
        res.status(500).json({ error: 'Error al actualizar el platillo.', details: error.message });
    } finally {
        if (connection) connection.release();
    }
};

// Eliminar un platillo
exports.deleteDish = async (req, res) => {
    const { id } = req.params;
    try {
        await dbPool.query('DELETE FROM dishes WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el platillo.' });
    }
};
