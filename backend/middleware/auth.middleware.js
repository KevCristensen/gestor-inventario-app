const jwt = require('jsonwebtoken');

function isAdmin(req, res, next) {
    // 1. Obtener el token del header
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Formato "Bearer TOKEN"

    if (!token) {
        return res.sendStatus(401); // No autorizado (no hay token)
    }

    // 2. Verificar el token
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.sendStatus(403); // Prohibido (token inválido)
        }
        
        // 3. Verificar si el rol es 'admin'

        // --- AÑADE ESTA LÍNEA PARA DEPURAR ---
        // console.log('Token decodificado - Rol del usuario:', user.role);
        // if (user.role !== 'admin') {
        //     return res.status(403).json({ error: 'Acceso denegado. Se requiere rol de administrador.' });
        // }

        req.user = user; // Guardamos el usuario en el request para uso futuro
        next(); // Si todo está bien, continuamos a la siguiente función (la ruta)
    });
}

module.exports = { isAdmin };