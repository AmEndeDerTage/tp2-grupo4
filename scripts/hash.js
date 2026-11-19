// Genera el hash bcrypt de una contraseña, para pegarlo en OPERADOR_PASSWORD_HASH del .env (ahí nunca va la contraseña).
// Uso: node scripts/hash.js "mi contraseña"
// Cada corrida da un hash distinto para la misma contraseña (cambia el salt); cualquiera de ellos sirve.
import createPasswordHasher from "../security/passwordHasher.js";

const [, , plain] = process.argv;
if (!plain) {
  console.error('Uso: node scripts/hash.js "mi contraseña"');
  process.exit(1);
}
console.log(await createPasswordHasher({ rounds: 10 }).hash(plain));
