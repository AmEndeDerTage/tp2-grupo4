/**
 * Configuración centralizada.
 * Lee las variables de entorno (cargadas con `node --env-file=.env`) y exporta constantes
 * con valores por defecto. Es el único módulo de la aplicación que toca process.env.
 */
// Valores aceptados: cualquier otro corta el arranque (ver las verificaciones de abajo)
const PERSISTENCE_TYPES = ["memory", "sequelize"];
const NOTIFIER_TYPES = ["console", "file"];

const PORT = Number(process.env.PORT) || 8000;
// Dirección en la que escucha el servidor. 127.0.0.1 = solo esta máquina: nada que venga de la red llega.
// Abrirlo a la red es una decisión explícita: HOST=0.0.0.0
const HOST = process.env.HOST || "127.0.0.1";
// Entorno. En "production" no se publica la documentación interactiva (/api-docs); con cualquier otro valor, sí.
const NODE_ENV = process.env.NODE_ENV || "development";
const PERSISTENCE_TYPE = process.env.PERSISTENCE_TYPE || "memory"; // "memory" o "sequelize"

// Un valor mal escrito no debe caer en silencio a "memory": se corta el arranque con un mensaje claro.
if (!PERSISTENCE_TYPES.includes(PERSISTENCE_TYPE)) {
  throw new Error(
    `PERSISTENCE_TYPE inválido: "${PERSISTENCE_TYPE}". Valores posibles: ${PERSISTENCE_TYPES.join(" | ")}`
  );
}

// Eventos de dominio: por dónde salen los avisos y cuándo se avisa
// Por dónde salen los avisos de orden.creada y orden.ejecutada: "console" (default) o "file" (se agregan a NOTIFICATIONS_LOG_PATH)
const NOTIFIER_TYPE = process.env.NOTIFIER_TYPE || "console";
// Archivo de fileNotifier. Apuntarlo a una ruta imposible es la forma de probar que un notificador roto no tumba el POST
const NOTIFICATIONS_LOG_PATH = process.env.NOTIFICATIONS_LOG_PATH || "notifications.log";
// Regla del evento activo.topeCerca: avisa cuando cartera + compras vivas llega a este % del topeCedears
const TOPE_CERCA_PCT = Number(process.env.TOPE_CERCA_PCT ?? 90);

// Mismo criterio que PERSISTENCE_TYPE: un valor mal escrito corta el arranque en lugar de caer a un default
if (!NOTIFIER_TYPES.includes(NOTIFIER_TYPE)) {
  throw new Error(`NOTIFIER_TYPE inválido: "${NOTIFIER_TYPE}". Valores posibles: ${NOTIFIER_TYPES.join(" | ")}`);
}
if (!(TOPE_CERCA_PCT > 0 && TOPE_CERCA_PCT <= 100)) {
  throw new Error(`TOPE_CERCA_PCT inválido: "${process.env.TOPE_CERCA_PCT}". Tiene que ser un número mayor que 0 y hasta 100`);
}

// Reloj. Vacío = la hora real. Con una fecha ISO (2026-12-01T12:00:00-03:00) el reloj queda fijo en ese
// instante: sirve para probar a mano las reglas que miran la fecha. Que sea una fecha válida lo verifica utils/clock.js.
const CLOCK_NOW = process.env.CLOCK_NOW || undefined;

// Límites de pedidos por IP y por minuto (0 = sin límite). El general cubre toda la API; el de login cuenta solo los intentos fallidos.
const RATE_LIMIT_MAX = Number(process.env.RATE_LIMIT_MAX ?? 1000);
const LOGIN_RATE_LIMIT_MAX = Number(process.env.LOGIN_RATE_LIMIT_MAX ?? 5);
for (const [nombre, valor] of Object.entries({ RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_MAX })) {
  if (!Number.isInteger(valor) || valor < 0) {
    throw new Error(`${nombre} inválido: "${process.env[nombre]}". Tiene que ser un entero mayor o igual a 0 (0 = sin límite)`);
  }
}

// Autenticación. Los pedidos que escriben exigen un token JWT, que se obtiene en POST /auth/login.
// El secreto firma los tokens: quien lo conoce puede fabricar tokens válidos. Por eso no tiene valor por defecto:
// con uno, el código (que es público) lo estaría publicando, y la aplicación andaría igual sin que nadie lo note.
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || JWT_SECRET.length < 32) {
  throw new Error("Falta JWT_SECRET o tiene menos de 32 caracteres (copiá .env.example a .env y generá uno: ver el comentario de esa variable)");
}
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h"; // vida de cada token: "15m", "1h", "7d"
// El único usuario de la API. De su contraseña se guarda solo el hash bcrypt (se genera con: node scripts/hash.js "contraseña")
const OPERADOR_USUARIO = process.env.OPERADOR_USUARIO || "operador";
const OPERADOR_PASSWORD_HASH = process.env.OPERADOR_PASSWORD_HASH;
if (!/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(OPERADOR_PASSWORD_HASH ?? "")) {
  throw new Error('Falta OPERADOR_PASSWORD_HASH o no es un hash bcrypt (se genera con: node scripts/hash.js "contraseña")');
}

export {
  PORT,
  HOST,
  NODE_ENV,
  PERSISTENCE_TYPE,
  NOTIFIER_TYPE,
  NOTIFICATIONS_LOG_PATH,
  TOPE_CERCA_PCT,
  CLOCK_NOW,
  RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_MAX,
  JWT_SECRET,
  JWT_EXPIRES_IN,
  OPERADOR_USUARIO,
  OPERADOR_PASSWORD_HASH,
};
