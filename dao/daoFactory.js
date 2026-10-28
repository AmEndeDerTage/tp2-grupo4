import { PERSISTENCE_TYPE } from "../config/config.js";
import activosMemoryDao from "./activos/ActivosMemoryDao.js";

/**
 * Factory de DAOs.
 * Devuelve el adaptador de persistencia que corresponde según PERSISTENCE_TYPE.
 * Es el único punto donde se elige la implementación: el resto de la aplicación trabaja contra la interfaz.
 *
 * Por ahora solo existe el adaptador en memoria; el de Sequelize se suma cuando se implemente
 * (config.js ya rechaza cualquier valor que no sea "memory" | "sequelize").
 */
function getActivosDao() {
  if (PERSISTENCE_TYPE === "sequelize") {
    throw new Error("Persistencia sequelize todavía no implementada para Activos");
  }
  console.log("[Persistencia] Activos: memoria (array JS)");
  return activosMemoryDao;
}

export { getActivosDao };
