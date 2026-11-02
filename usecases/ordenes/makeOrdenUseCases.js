import getOrdenes from "./getOrdenes.js";
import getOrdenById from "./getOrdenById.js";

/**
 * Factory de casos de uso de Órdenes.
 * Recibe sus dependencias por nombre en un objeto (como makeLoanUseCases del profesor):
 *  - ordenesDao: el DAO de la propia entidad
 *  - activosDao: el de la entidad relacionada, para las reglas que miran el activo de la orden
 * y devuelve los casos de uso con ellas ya inyectadas, para que el controlador los llame sin conocer ningún DAO.
 */
function makeOrdenUseCases({ ordenesDao, activosDao }) {
  return {
    getOrdenes: (filtros) => getOrdenes(filtros, ordenesDao),
    getOrdenById: (id) => getOrdenById(id, ordenesDao),
  };
}

export default makeOrdenUseCases;
