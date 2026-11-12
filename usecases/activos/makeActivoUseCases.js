import getActivos from "./getActivos.js";
import getActivoById from "./getActivoById.js";
import createActivo from "./createActivo.js";
import updateActivo from "./updateActivo.js";
import deleteActivo from "./deleteActivo.js";
import getOrdenesDeActivo from "./getOrdenesDeActivo.js";
import getEtiquetasDeActivo from "./getEtiquetasDeActivo.js";
import asignarEtiqueta from "./asignarEtiqueta.js";
import quitarEtiqueta from "./quitarEtiqueta.js";

/**
 * Factory de casos de uso de Activos.
 * Recibe sus dependencias por nombre en un objeto (misma forma que makeOrdenUseCases):
 *  - activosDao: el DAO de la propia entidad
 *  - ordenesDao: el de la entidad relacionada, para la regla 8 (no borrar un activo con órdenes),
 *    para recorrer la relación (GET /activos/:id/ordenes) y para que updateActivo verifique lo comprometido
 *    en órdenes vivas (reglas 5 y 6 vistas desde el activo)
 *  - etiquetasDao: el del otro lado de la N:N Activo–Etiqueta, para verificar que existan las etiquetas que se asignan,
 *    se quitan o con las que nace un activo
 *  - events: el bus de eventos, para que updateActivo avise activo.topeCerca (clase 10)
 *  - transaccion: cómo correr leer-verificar-escribir como una sola operación (dao/transacciones.js)
 * y devuelve los casos de uso con ellas ya inyectadas, para que el controlador los llame sin conocer ningún DAO.
 */
function makeActivoUseCases({ activosDao, ordenesDao, etiquetasDao, events, transaccion }) {
  return {
    getActivos: (filtros) => getActivos(filtros, activosDao),
    getActivoById: (id) => getActivoById(id, activosDao),
    createActivo: (data) => createActivo(data, activosDao, etiquetasDao, transaccion),
    updateActivo: (id, cambios) => updateActivo(id, cambios, activosDao, ordenesDao, events, transaccion),
    deleteActivo: (id) => deleteActivo(id, activosDao, ordenesDao, transaccion),
    getOrdenesDeActivo: (id, filtros) => getOrdenesDeActivo(id, filtros, activosDao, ordenesDao),
    getEtiquetasDeActivo: (id) => getEtiquetasDeActivo(id, activosDao),
    asignarEtiqueta: (id, etiquetaId) => asignarEtiqueta(id, etiquetaId, activosDao, etiquetasDao, transaccion),
    quitarEtiqueta: (id, etiquetaId) => quitarEtiqueta(id, etiquetaId, activosDao, etiquetasDao, transaccion),
  };
}

export default makeActivoUseCases;
