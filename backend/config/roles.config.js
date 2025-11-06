/**
 * Define los permisos para cada rol.
 * Las rutas se definen como prefijos. Por ejemplo, '/api/products' dará acceso a
 * '/api/products', '/api/products/1', '/api/products/search', etc.
 */
const ROLES = {
  admin: [
    '/', // El admin tiene acceso a todo
  ],
  nutricionista: [
    '/api/tasks',         // Pautas
    '/api/dishes',        // Platillos (Recetario)
    '/api/reports',       // Reportes
    '/api/products',      // Para consultar productos
    '/api/chat',          // Chat
    '/api/auth',          // Para actualizar estado
    '/api/entities',      // Para ver el nombre del colegio
  ],
  bodega: [
    '/api/products',      // Gestión de Productos
    '/api/providers',     // Proveedores
    '/api/receptions',    // Recepciones
    '/api/inventory',     // Movimientos de Inventario (Salidas)
    '/api/reports',       // Reportes
    '/api/chat',          // Chat
    '/api/auth',          // Para actualizar estado
    '/api/entities',      // Para ver el nombre del colegio
  ],
  losa: [
    '/api/assets',        // Activos Fijos
    '/api/asset-movements',// Movimientos de Activos
    '/api/chat',          // Chat
    '/api/auth',          // Para actualizar estado
    '/api/entities',      // Para ver el nombre del colegio
  ],
};

module.exports = ROLES;
