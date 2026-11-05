import { PERSISTENCE_TYPE } from "../config/config.js";
import activosMemoryDao from "./activos/ActivosMemoryDao.js";
import activosSequelizeDao from "./activos/ActivosSequelizeDao.js";
import ordenesMemoryDao from "./ordenes/OrdenesMemoryDao.js";
import ordenesSequelizeDao from "./ordenes/OrdenesSequelizeDao.js";
import { transaccionEnMemoria, transaccionSequelize } from "./transacciones.js";

/**
 * Factory de DAOs.
 * Devuelve el adaptador de persistencia que corresponde según PERSISTENCE_TYPE.
 * Es el único punto donde se elige la implementación: el resto de la aplicación trabaja contra la interfaz.
 *
 * config.js ya rechaza cualquier valor que no sea "memory" | "sequelize".
 */
function getActivosDao() {
  if (PERSISTENCE_TYPE === "sequelize") {
    console.log("[Persistencia] Activos: Sequelize (SQLite)");
    return activosSequelizeDao;
  }
  console.log("[Persistencia] Activos: memoria (array JS)");
  return activosMemoryDao;
}

function getOrdenesDao() {
  if (PERSISTENCE_TYPE === "sequelize") {
    console.log("[Persistencia] Órdenes: Sequelize (SQLite)");
    return ordenesSequelizeDao;
  }
  console.log("[Persistencia] Órdenes: memoria (array JS)");
  return ordenesMemoryDao;
}

/**
 * La forma de correr un trabajo como una sola operación (ver transacciones.js), elegida con el mismo criterio
 * que los DAOs: los casos de uso la reciben inyectada y no saben si detrás hay un array o una base.
 */
function getTransaccion() {
  if (PERSISTENCE_TYPE === "sequelize") {
    console.log("[Persistencia] Transacciones: Sequelize (IMMEDIATE, de a una)");
    return transaccionSequelize;
  }
  console.log("[Persistencia] Transacciones: memoria (el event loop no intercala)");
  return transaccionEnMemoria;
}

export { getActivosDao, getOrdenesDao, getTransaccion };
