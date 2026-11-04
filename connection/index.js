import sequelize from "./sequelize.js";

/**
 * Punto único de acceso a las conexiones.
 * Si hiciera falta otra (por ejemplo, otra base), se crea su archivo en esta carpeta y se exporta acá.
 */
export { sequelize };
