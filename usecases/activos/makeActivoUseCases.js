import getActivos from "./getActivos.js";
import getActivoById from "./getActivoById.js";
import createActivo from "./createActivo.js";
import updateActivo from "./updateActivo.js";
import deleteActivo from "./deleteActivo.js";
import getOrdenesDeActivo from "./getOrdenesDeActivo.js";

/**
 * Factory de casos de uso de Activos.
 * Recibe sus dependencias por nombre en un objeto (misma forma que makeOrdenUseCases):
 *  - activosDao: el DAO de la propia entidad
 *  - ordenesDao: el de la entidad relacionada, para la regla 8 (no borrar un activo con órdenes)
 *    y para recorrer la relación (GET /activos/:id/ordenes)
 *  - transaccion: cómo correr leer-verificar-escribir como una sola operación (dao/transacciones.js)
 * y devuelve los casos de uso con ellas ya inyectadas, para que el controlador los llame sin conocer ningún DAO.
 */
function makeActivoUseCases({ activosDao, ordenesDao, transaccion }) {
  return {
    getActivos: (filtros) => getActivos(filtros, activosDao),
    getActivoById: (id) => getActivoById(id, activosDao),
    createActivo: (data) => createActivo(data, activosDao),
    updateActivo: (id, cambios) => updateActivo(id, cambios, activosDao),
    deleteActivo: (id) => deleteActivo(id, activosDao, ordenesDao, transaccion),
    getOrdenesDeActivo: (id, filtros) => getOrdenesDeActivo(id, filtros, activosDao, ordenesDao),
  };
}

export default makeActivoUseCases;
