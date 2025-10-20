const dbPool = require('../db');

/**
 * Obtiene todas las tareas para una entidad específica.
 */
exports.getAllTasks = async (req, res) => {
    const { entity_id, month } = req.query; // 'YYYY-MM'

    if (!entity_id) {
        return res.status(400).json({ error: 'Se requiere el ID de la entidad.' });
    }

    try {
        let query = `
            SELECT 
                t.*, 
                u.name as creator_name 
            FROM tasks t
            JOIN users u ON t.created_by = u.id
            WHERE t.entity_id = ?
        `;
        const params = [entity_id];

        if (month) {
            query += ' AND (DATE_FORMAT(t.due_date, "%Y-%m") = ? OR t.due_date IS NULL OR t.due_date = "0000-00-00")';
            params.push(month);
        }

        query += ' ORDER BY t.due_date DESC, t.created_at DESC';
        const [tasks] = await dbPool.query(query, params);

        res.json(tasks);
    } catch (error) {
        console.error("Error al obtener tareas:", error);
        res.status(500).json({ error: 'Error al obtener las tareas.' });
    }
};

/**
 * Elimina una tarea por su ID.
 */
exports.deleteTask = async (req, res) => {
    const { id } = req.params;
    try {
        await dbPool.query('DELETE FROM tasks WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error("Error al eliminar la tarea:", error);
        res.status(500).json({ error: 'Error al eliminar la tarea.' });
    }
};

/**
 * Obtiene una tarea por su ID, incluyendo usuarios asignados y productos con su stock actual.
 */
exports.getTaskById = async (req, res) => {
    const { id } = req.params;
    const { entity_id } = req.query; // Necesitamos la entidad para calcular el stock

    if (!id || !entity_id) {
        return res.status(400).json({ error: 'Se requiere el ID de la tarea y de la entidad.' });
    }

    try {
        // 1. Obtener la tarea principal
        const [taskRows] = await dbPool.query('SELECT * FROM tasks WHERE id = ?', [id]);
        if (taskRows.length === 0) {
            return res.status(404).json({ error: 'Tarea no encontrada.' });
        }
        const task = taskRows[0];

        // 2. Obtener usuarios asignados
        const [assignments] = await dbPool.query(
            'SELECT u.id, u.name FROM task_assignments ta JOIN users u ON ta.user_id = u.id WHERE ta.task_id = ?',
            [id]
        );
        task.assignedUsers = assignments;

        // 3. Obtener productos requeridos y su stock actual
        const [products] = await dbPool.query(`
            SELECT 
                tp.id AS task_product_id,
                tp.product_id, 
                tp.chosen_product_id,
                tp.generic_product_name,
                COALESCE(p.name, tp.generic_product_name) AS name,
                p.unit_of_measure,
                tp.required_quantity,
                tp.required_unit,
                (SELECT COALESCE(SUM(CASE WHEN im.type = 'entrada' THEN im.quantity ELSE -im.quantity END), 0) 
                 FROM inventory_movements im
                 WHERE im.product_id = p.id AND im.entity_id = ?) AS current_stock
            FROM task_products tp
            LEFT JOIN products p ON tp.product_id = p.id
            WHERE tp.task_id = ?
        `, [entity_id, id]);

        task.requiredProducts = products;

        // 4. Para cada producto requerido, buscar sugerencias con stock
        for (const product of task.requiredProducts) {
            const [suggestions] = await dbPool.query(`
                SELECT 
                    p.id, p.name, p.brand, p.unit_of_measure, p.weight,
                    (SELECT COALESCE(SUM(CASE WHEN im.type = 'entrada' THEN im.quantity ELSE -im.quantity END), 0)
                     FROM inventory_movements im
                     WHERE im.product_id = p.id AND im.entity_id = ?) as current_stock
                FROM products p
                WHERE p.name LIKE ?
            `, [entity_id, `%${product.name}%`]);
            product.suggestions = suggestions;

            if (product.chosen_product_id) {
                const [[chosen]] = await dbPool.query('SELECT * FROM products WHERE id = ?', [product.chosen_product_id]);
                product.chosenProduct = chosen;
            }
        }

        res.json(task);

    } catch (error) {
        console.error("Error al obtener el detalle de la tarea:", error);
        res.status(500).json({ error: 'Error al obtener el detalle de la tarea.' });
    }
};


/**
 * Actualiza el estado y/o las observaciones de una tarea.
 */
exports.updateTaskStatus = async (req, res) => {
    const { id } = req.params;
    const { status, observations } = req.body;

    if (!status && observations === undefined) {
        return res.status(400).json({ error: 'Se requiere al menos un campo para actualizar (status u observations).' });
    }

    try {
        await dbPool.query(
            'UPDATE tasks SET status = ?, observations = ? WHERE id = ?',
            [status, observations, id]
        );
        res.json({ message: 'Pauta actualizada correctamente.' });
    } catch (error) {
        console.error("Error al actualizar la pauta:", error);
        res.status(500).json({ error: 'Error al actualizar la pauta.' });
    }

};

/**
 * Asigna un producto específico a un requerimiento de una pauta.
 */
exports.setChosenProduct = async (req, res) => {
    const { taskProductId } = req.params;
    const { chosenProductId } = req.body;

    try {
        await dbPool.query(
            'UPDATE task_products SET chosen_product_id = ? WHERE id = ?',
            [chosenProductId, taskProductId]
        );
        res.json({ message: 'Producto asignado correctamente.' });
    } catch (error) {
        console.error("Error al asignar producto a la pauta:", error);
        res.status(500).json({ error: 'Error al asignar el producto.' });
    }
};

/**
 * Crea una nueva tarea, incluyendo sus asignaciones de usuarios y productos requeridos.
 * Todo se ejecuta dentro de una transacción para garantizar la integridad de los datos.
 */
exports.createTask = async (req, res) => {
    const { title, description, due_date, entity_id, created_by, assignedUsers, requiredProducts, menu_details } = req.body;

    if (!title || !entity_id || !created_by) {
        return res.status(400).json({ error: 'Faltan datos requeridos (título, entidad, creador).' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        // 1. Insertar la tarea principal
        const [taskResult] = await connection.query(
            'INSERT INTO tasks (title, description, due_date, entity_id, created_by, menu_details) VALUES (?, ?, ?, ?, ?, ?)',
            [title, description, due_date, entity_id, created_by, menu_details]
        );
        const taskId = taskResult.insertId;

        // 2. Insertar usuarios asignados (si existen)
        if (assignedUsers && assignedUsers.length > 0) {
            const assignmentValues = assignedUsers.map(userId => [taskId, userId]);
            await connection.query(
                'INSERT INTO task_assignments (task_id, user_id) VALUES ?',
                [assignmentValues]
            );
        }

        // 3. Insertar productos requeridos (si existen)
        if (requiredProducts && requiredProducts.length > 0) {
            const productValues = requiredProducts.map(p => [taskId, p.product_id, p.required_quantity, p.unit, p.product_id ? null : p.name]);
            await connection.query(
                'INSERT INTO task_products (task_id, product_id, required_quantity, required_unit, generic_product_name) VALUES ?',
                [productValues]
            );
        }

        await connection.commit();
        res.status(201).json({ message: 'Tarea creada exitosamente.', taskId });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error al crear la tarea:", error);
        res.status(500).json({ error: 'Error al crear la tarea.', details: error.message });
    } finally {
        if (connection) connection.release();
    }
};

/**
 * Actualiza una tarea existente, incluyendo sus asignaciones y productos.
 */
exports.updateTask = async (req, res) => {
    const { id } = req.params;
    const { title, description, due_date, assignedUsers, requiredProducts, menu_details } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'El título es requerido.' });
    }

    let connection;
    try {
        connection = await dbPool.getConnection();
        await connection.beginTransaction();

        // 1. Actualizar la tarea principal
        await connection.query(
            'UPDATE tasks SET title = ?, description = ?, due_date = ?, menu_details = ? WHERE id = ?',
            [title, description, due_date, menu_details, id]
        );

        // 2. Actualizar usuarios asignados (borrar y re-insertar)
        await connection.query('DELETE FROM task_assignments WHERE task_id = ?', [id]);
        if (assignedUsers && assignedUsers.length > 0) {
            const assignmentValues = assignedUsers.map(userId => [id, userId]);
            await connection.query('INSERT INTO task_assignments (task_id, user_id) VALUES ?', [assignmentValues]);
        }

        // 3. Actualizar productos requeridos (borrar y re-insertar)
        await connection.query('DELETE FROM task_products WHERE task_id = ?', [id]);
        if (requiredProducts && requiredProducts.length > 0) {
            const productValues = requiredProducts.map(p => [id, p.product_id, p.required_quantity, p.unit, p.product_id ? null : p.name]);
            await connection.query(
                'INSERT INTO task_products (task_id, product_id, required_quantity, required_unit, generic_product_name) VALUES ?',
                [productValues]
            );
        }

        await connection.commit();
        res.json({ message: 'Pauta actualizada exitosamente.' });

    } catch (error) {
        if (connection) await connection.rollback();
        console.error("Error al actualizar la tarea:", error);
        res.status(500).json({ error: 'Error al actualizar la tarea.', details: error.message });
    } finally {
        if (connection) connection.release();
    }
};