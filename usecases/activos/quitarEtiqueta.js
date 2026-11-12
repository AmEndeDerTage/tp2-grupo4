import AppError from "../../errors/AppError.js";

/**
 * Caso de uso: quitarle una etiqueta a un activo (borrar un vínculo de la N:N; la etiqueta sigue existiendo).
 * Devuelve `true` si lo quitó, o `null` si el activo no existe (el 404 lo decide el controlador).
 * Reglas:
 *   - la etiqueta tiene que existir                    → ETIQUETA_NO_ENCONTRADA (404)
 *   - el activo tiene que tenerla                      → ETIQUETA_NO_ASIGNADA (404: el vínculo que se quiere borrar no existe)
 * En una transacción como la asignación: dos pedidos iguales simultáneos dan 204 y 404, nunca dos 204.
 */
async function quitarEtiqueta(id, etiquetaId, activosDao, etiquetasDao, transaccion) {
  return transaccion(async (tx) => {
    const activo = await activosDao.getById(id, tx);
    if (!activo) return null;

    const etiqueta = await etiquetasDao.getById(etiquetaId, tx);
    if (!etiqueta) {
      throw new AppError("ETIQUETA_NO_ENCONTRADA", `No existe una etiqueta con id ${etiquetaId}`, 404);
    }

    const quitada = await activosDao.quitarEtiqueta(activo.id, etiqueta.id, tx);
    if (!quitada) {
      throw new AppError("ETIQUETA_NO_ASIGNADA", `El activo ${activo.ticker} no tiene la etiqueta ${etiqueta.nombre}`, 404);
    }
    return true;
  });
}

export default quitarEtiqueta;
