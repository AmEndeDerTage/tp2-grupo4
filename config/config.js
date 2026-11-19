/**
 * Configuración centralizada.
 * Lee las variables de entorno (cargadas con `node --env-file=.env`) y exporta constantes
 * con valores por defecto. Es el único módulo de la aplicación que toca process.env.
 */
const PERSISTENCE_TYPES = ["memory", "sequelize"];
const NOTIFIER_TYPES = ["console", "file"];

const PORT = Number(process.env.PORT) || 8000;
const NODE_ENV = process.env.NODE_ENV || "development";
const PERSISTENCE_TYPE = process.env.PERSISTENCE_TYPE || "memory"; // "memory" o "sequelize"

// Un valor mal escrito no debe caer en silencio a "memory": se corta el arranque con un mensaje claro.
if (!PERSISTENCE_TYPES.includes(PERSISTENCE_TYPE)) {
  throw new Error(
    `PERSISTENCE_TYPE inválido: "${PERSISTENCE_TYPE}". Valores posibles: ${PERSISTENCE_TYPES.join(" | ")}`
  );
}

// Eventos (clase 10)
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

export { PORT, NODE_ENV, PERSISTENCE_TYPE, NOTIFIER_TYPE, NOTIFICATIONS_LOG_PATH, TOPE_CERCA_PCT, CLOCK_NOW };
