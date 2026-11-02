import AppError from "../../errors/AppError.js";

/**
 * Caso de uso: borrar una orden viva (es la forma de cancelarla: por eso el estado no tiene "cancelada").
 * Regla 7: una orden ejecutada no se borra, es historial (ORDEN_NO_MODIFICABLE, 409).
 * Devuelve `true` si la borró o `false` si no existía (el 404 lo decide el controlador).
 */
async function deleteOrden(id, ordenesDao) {
  const orden = await ordenesDao.getById(id);
  if (!orden) return false;

  if (orden.estado === "ejecutada") {
    throw new AppError("ORDEN_NO_MODIFICABLE", `La orden ${orden.id} ya está ejecutada: no se puede borrar`, 409);
  }

  return ordenesDao.delete(id);
}

export default deleteOrden;
