const bcrypt = require('bcryptjs');
const password = 'tobykitty123'; // La contraseña que quieres usar
const salt = bcrypt.genSaltSync(10);
const hash = bcrypt.hashSync(password, salt);
console.log(hash);