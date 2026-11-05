import AppError from "../../errors/AppError.js";

/**
 * Caso de uso: borrar una orden viva (es la forma de cancelarla: por eso el estado no tiene "cancelada").
 * Regla 7: una orden ejecutada no se borra, es historial (ORDEN_NO_MODIFICABLE, 409).
 * Leer, verificar y borrar van en una transacción: si no, una ejecución simultánea podría marcarla "ejecutada"
 * entre la verificación y el borrado, y se perdería historial con la cartera ya movida.
 * Devuelve `true` si la borró o `false` si no existía (el 404 lo decide el controlador).
 */
async function deleteOrden(id, ordenesDao, transaccion) {
  return transaccion(async (tx) => {
    const orden = await ordenesDao.getById(id, tx);
    if (!orden) return false;

    if (orden.estado === "ejecutada") {
      throw new AppError("ORDEN_NO_MODIFICABLE", `La orden ${orden.id} ya está ejecutada: no se puede borrar`, 409);
    }

    return ordenesDao.delete(id, tx);
  });
}

export default deleteOrden;
