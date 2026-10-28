import getActivos from "./getActivos.js";
import getActivoById from "./getActivoById.js";
import createActivo from "./createActivo.js";
import updateActivo from "./updateActivo.js";
import deleteActivo from "./deleteActivo.js";

/**
 * Factory de casos de uso de Activos.
 * Recibe las dependencias (por ahora, solo el DAO) y devuelve los casos de uso con ellas ya inyectadas,
 * para que el controlador los llame sin conocer ningún DAO.
 */
function makeActivoUseCases(dao) {
  return {
    getActivos: (filtros) => getActivos(filtros, dao),
    getActivoById: (id) => getActivoById(id, dao),
    createActivo: (data) => createActivo(data, dao),
    updateActivo: (id, cambios) => updateActivo(id, cambios, dao),
    deleteActivo: (id) => deleteActivo(id, dao),
  };
}

export default makeActivoUseCases;
