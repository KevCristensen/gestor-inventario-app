const db = require('../db');

/**
 * Obtiene todas las pautas de una entidad para un mes específico.
 * Filtra por usuario si no es admin o nutricionista.
 */
exports.getTasks = async (req, res) => {
  const { entity_id, month } = req.query;
  const user = req.user;

  if (!entity_id || !month) {
    return res.status(400).json({ error: 'Faltan los parámetros entity_id o month.' });
  }

  try {
    let query = `
      SELECT t.*, u.name as creator_name
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      WHERE t.entity_id = ? AND DATE_FORMAT(t.due_date, '%Y-%m') = ?
    `;
    const params = [entity_id, month];

    // Si el usuario no es admin o nutricionista, solo puede ver las pautas asignadas a él.
    if (user.role !== 'admin' && user.role !== 'nutricionista') {
      query += ' AND JSON_CONTAINS(t.assigned_users, CAST(? AS JSON))';
      params.push(JSON.stringify([user.id]));
    }

    const [tasks] = await db.query(query, params);
    res.json(tasks);
  } catch (error) {
    console.error('Error al obtener pautas:', error);
    res.status(500).json({ error: 'Error interno del servidor al obtener pautas.' });
  }
};

/**
 * Obtiene una pauta por su ID.
 */
exports.getTaskById = async (req, res) => {
  const { id } = req.params;
  const { entity_id } = req.query;

  try {
    const [taskRows] = await db.query(`
      SELECT t.*, u.name as creator_name 
      FROM tasks t
      JOIN users u ON t.created_by = u.id
      WHERE t.id = ? AND t.entity_id = ?
    `, [id, entity_id]);
    if (taskRows.length === 0) {
      return res.status(404).json({ error: 'Pauta no encontrada.' });
    }

    const task = taskRows[0];

    // --- LÓGICA NUEVA PARA ENRIQUECER USUARIOS ASIGNADOS ---
    if (task.assigned_users) {
      try {
        const userIds = JSON.parse(task.assigned_users);
        if (userIds.length > 0) {
          // Usamos `FIND_IN_SET` para buscar múltiples IDs de forma eficiente
          const [users] = await db.query(`SELECT id, name FROM users WHERE FIND_IN_SET(id, ?)`, [userIds.join(',')]);
          task.assigned_users = users; // Reemplazamos el string JSON con el array de objetos de usuario
        } else {
          task.assigned_users = [];
        }
      } catch (e) {
        task.assigned_users = [];
      }
    }

    // --- LÓGICA NUEVA PARA ENRIQUECER CON SUGERENCIAS ---
    if (task.required_products) {
      const requiredProducts = JSON.parse(task.required_products);
      
      for (const reqProduct of requiredProducts) {
        // Buscamos productos en el inventario que coincidan por nombre (insensible a mayúsculas)
        // y que pertenezcan a la misma entidad (bodega).
        const [suggestions] = await db.query(
          `SELECT 
             p.id, p.name, p.brand, p.unit_of_measure, p.weight,
             (SELECT COALESCE(SUM(CASE WHEN im.type = 'entrada' THEN im.quantity ELSE -im.quantity END), 0) 
              FROM inventory_movements im 
              WHERE im.product_id = p.id AND im.entity_id = ?) as current_stock
           FROM products p
           WHERE LOWER(p.name) LIKE ?`,
          // El primer '?' es para la subconsulta, el segundo para el LIKE.
          [task.entity_id, `%${reqProduct.name.toLowerCase()}%`]
        );
        reqProduct.suggestions = suggestions;

        // Si ya hay un producto elegido, lo buscamos y lo añadimos también.
        if (reqProduct.chosen_product_id) {
          const [chosen] = await db.query(
            `SELECT id, name, brand, weight, unit_of_measure FROM products WHERE id = ?`,
            [reqProduct.chosen_product_id]
          );
          if (chosen.length > 0) {
            reqProduct.chosenProduct = chosen[0];
          }
        }
      }
      task.required_products = requiredProducts; // Reemplazamos el JSON string con el objeto enriquecido
    }
    res.json(task);
  } catch (error) {
    console.error(`Error al obtener la pauta ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};

/**
 * Actualiza el estado y/o las observaciones de una pauta.
 */
exports.updateTaskStatus = async (req, res) => {
  const { id } = req.params;
  const { status, observations } = req.body;

  if (!status && observations === undefined) {
    return res.status(400).json({ error: 'Se requiere al menos un campo para actualizar (status u observations).' });
  }

  try {
    // Construimos la consulta dinámicamente para actualizar solo los campos proporcionados
    const fieldsToUpdate = [];
    const values = [];
    if (status) { fieldsToUpdate.push('status = ?'); values.push(status); }
    if (observations !== undefined) { fieldsToUpdate.push('observations = ?'); values.push(observations); }
    values.push(id);

    await db.query(`UPDATE tasks SET ${fieldsToUpdate.join(', ')} WHERE id = ?`, values);
    res.json({ message: 'Pauta actualizada correctamente.' });
  } catch (error) {
    console.error(`Error al actualizar el estado de la pauta ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar el estado.' });
  }
};

/**
 * Crea una nueva pauta.
 */
exports.createTask = async (req, res) => {
  const { title, description, due_date, assignedUsers, menu_details, requiredProducts, entity_id, created_by } = req.body;

  try {
    const [result] = await db.query(
      'INSERT INTO tasks (title, description, due_date, assigned_users, menu_details, required_products, entity_id, created_by, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, description, due_date, JSON.stringify(assignedUsers || []), menu_details, JSON.stringify(requiredProducts || []), entity_id, created_by, 'pendiente']
    );
    res.status(201).json({ id: result.insertId, message: 'Pauta creada exitosamente.' });
  } catch (error) {
    console.error('Error al crear la pauta:', error);
    res.status(500).json({ error: 'Error interno del servidor al crear la pauta.' });
  }
};

/**
 * Actualiza una pauta existente.
 */
exports.updateTask = async (req, res) => {
  const { id } = req.params;
  const { title, description, due_date, assignedUsers, menu_details, requiredProducts } = req.body;

  try {
    await db.query(
      'UPDATE tasks SET title = ?, description = ?, due_date = ?, assigned_users = ?, menu_details = ?, required_products = ? WHERE id = ?',
      [title, description, due_date, JSON.stringify(assignedUsers || []), menu_details, JSON.stringify(requiredProducts || []), id]
    );
    res.json({ message: 'Pauta actualizada exitosamente.' });
  } catch (error) {
    console.error(`Error al actualizar la pauta ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor al actualizar la pauta.' });
  }
};

/**
 * Elimina una pauta.
 */
exports.deleteTask = async (req, res) => {
  const { id } = req.params;
  try {
    // Primero, eliminamos las relaciones en task_products
    await db.query('DELETE FROM task_products WHERE task_id = ?', [id]);
    // Luego, eliminamos la pauta
    await db.query('DELETE FROM tasks WHERE id = ?', [id]);
    res.json({ message: 'Pauta eliminada exitosamente.' });
  } catch (error) {
    console.error(`Error al eliminar la pauta ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor al eliminar la pauta.' });
  }
};

/**
 * Asigna un producto específico a un requerimiento de una pauta.
 */
exports.assignProductToRequirement = async (req, res) => {
  const { id } = req.params;
  const { requiredProductName, chosenProductId } = req.body;

  try {
    // 1. Obtener la pauta actual
    const [taskRows] = await db.query('SELECT required_products FROM tasks WHERE id = ?', [id]);
    if (taskRows.length === 0) {
      return res.status(404).json({ error: 'Pauta no encontrada.' });
    }

    const task = taskRows[0];
    const requiredProducts = task.required_products ? JSON.parse(task.required_products) : [];

    // 2. Encontrar y actualizar el producto requerido
    const productIndex = requiredProducts.findIndex(p => p.name.toLowerCase() === requiredProductName.toLowerCase());
    if (productIndex === -1) {
      return res.status(404).json({ error: 'Producto requerido no encontrado en la pauta.' });
    }

    // Asignar o quitar el ID del producto elegido
    requiredProducts[productIndex].chosen_product_id = chosenProductId;

    // 3. Guardar la pauta actualizada
    await db.query(
      'UPDATE tasks SET required_products = ? WHERE id = ?',
      [JSON.stringify(requiredProducts), id]
    );

    res.json({ message: 'Producto asignado correctamente.' });
  } catch (error) {
    console.error(`Error al asignar producto a la pauta ${id}:`, error);
    res.status(500).json({ error: 'Error interno del servidor.' });
  }
};