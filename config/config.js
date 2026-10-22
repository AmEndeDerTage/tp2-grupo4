/**
 * Configuración centralizada.
 * Lee las variables de entorno (cargadas con `node --env-file=.env`) y exporta constantes
 * con valores por defecto. Es el único módulo de la aplicación que toca process.env.
 */
const PERSISTENCE_TYPES = ["memory", "sequelize"];

const PORT = Number(process.env.PORT) || 8000;
const NODE_ENV = process.env.NODE_ENV || "development";
const PERSISTENCE_TYPE = process.env.PERSISTENCE_TYPE || "memory"; // "memory" o "sequelize"

// Un valor mal escrito no debe caer en silencio a "memory": se corta el arranque con un mensaje claro.
if (!PERSISTENCE_TYPES.includes(PERSISTENCE_TYPE)) {
  throw new Error(
    `PERSISTENCE_TYPE inválido: "${PERSISTENCE_TYPE}". Valores posibles: ${PERSISTENCE_TYPES.join(" | ")}`
  );
}

export { PORT, NODE_ENV, PERSISTENCE_TYPE };
