const bcrypt = require('bcryptjs');
const password = '20559109'; // La contraseña que quieres usar
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);
console.log(hash);