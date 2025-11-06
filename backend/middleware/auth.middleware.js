const jwt = require('jsonwebtoken');
const ROLES = require('../config/roles.config');

function checkRole(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No se proporcionó token de autenticación.' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token inválido o expirado.' });
        }

        const userRole = user.role;
        const allowedRoutes = ROLES[userRole];

        if (!allowedRoutes) {
            return res.status(403).json({ error: 'Rol de usuario no reconocido.' });
        }

        // El admin tiene acceso a todo
        if (userRole === 'admin' && allowedRoutes[0] === '/') {
            req.user = user;
            return next();
        }

        // Verificar si la ruta solicitada está permitida para el rol del usuario
        const isAllowed = allowedRoutes.some(routePrefix => req.originalUrl.startsWith(routePrefix));

        if (!isAllowed) {
            return res.status(403).json({ error: 'Acceso denegado. No tienes permiso para acceder a este recurso.' });
        }

        req.user = user; // Guardamos el usuario en el request para uso futuro
        next();
    });
}

module.exports = { checkRole };