import getOrdenes from "./getOrdenes.js";
import getOrdenById from "./getOrdenById.js";
import createOrden from "./createOrden.js";
import updateOrden from "./updateOrden.js";
import deleteOrden from "./deleteOrden.js";

/**
 * Factory de casos de uso de Órdenes.
 * Recibe sus dependencias por nombre en un objeto (como makeLoanUseCases del profesor):
 *  - ordenesDao: el DAO de la propia entidad
 *  - activosDao: el de la entidad relacionada, para las reglas que miran el activo de la orden
 *  - events: el bus de eventos, para que createOrden y updateOrden anuncien lo que pasó (clase 10)
 * y devuelve los casos de uso con ellas ya inyectadas, para que el controlador los llame sin conocer ningún DAO.
 */
function makeOrdenUseCases({ ordenesDao, activosDao, events }) {
  return {
    getOrdenes: (filtros) => getOrdenes(filtros, ordenesDao),
    getOrdenById: (id) => getOrdenById(id, ordenesDao),
    createOrden: (data) => createOrden(data, ordenesDao, activosDao, events),
    updateOrden: (id, cambios) => updateOrden(id, cambios, ordenesDao, activosDao, events),
    deleteOrden: (id) => deleteOrden(id, ordenesDao),
  };
}

export default makeOrdenUseCases;
