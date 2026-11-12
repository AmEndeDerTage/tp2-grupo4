import getEtiquetas from "./getEtiquetas.js";
import getEtiquetaById from "./getEtiquetaById.js";
import createEtiqueta from "./createEtiqueta.js";
import updateEtiqueta from "./updateEtiqueta.js";
import deleteEtiqueta from "./deleteEtiqueta.js";

/**
 * Factory de casos de uso de Etiquetas.
 * Recibe sus dependencias por nombre en un objeto (misma forma que Activos y Órdenes):
 *  - etiquetasDao: el DAO de la propia entidad
 * y devuelve los casos de uso con ellas ya inyectadas, para que el controlador los llame sin conocer ningún DAO.
 */
function makeEtiquetaUseCases({ etiquetasDao }) {
  return {
    getEtiquetas: (filtros) => getEtiquetas(filtros, etiquetasDao),
    getEtiquetaById: (id) => getEtiquetaById(id, etiquetasDao),
    createEtiqueta: (data) => createEtiqueta(data, etiquetasDao),
    updateEtiqueta: (id, cambios) => updateEtiqueta(id, cambios, etiquetasDao),
    deleteEtiqueta: (id) => deleteEtiqueta(id, etiquetasDao),
  };
}

export default makeEtiquetaUseCases;
