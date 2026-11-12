import AppError from "../../errors/AppError.js";

/**
 * Caso de uso: asignarle una etiqueta a un activo (crear un vínculo de la N:N).
 * Devuelve las etiquetas del activo después del cambio, o `null` si el activo no existe (el 404 lo decide el controlador).
 * Reglas, de la más barata a la más cara:
 *   - la etiqueta tiene que existir                    → ETIQUETA_NO_ENCONTRADA (404)
 *   - el activo no puede tenerla ya                     → ETIQUETA_YA_ASIGNADA (409)
 * Verificar y crear van en una transacción: probado, sin ella dos asignaciones simultáneas de la misma etiqueta pasaban
 * las dos el chequeo y la segunda chocaba contra la clave primaria de la tabla intermedia (500 en vez de 409).
 */
async function asignarEtiqueta(id, etiquetaId, activosDao, etiquetasDao, transaccion) {
  return transaccion(async (tx) => {
    const activo = await activosDao.getById(id, tx);
    if (!activo) return null;

    const etiqueta = await etiquetasDao.getById(etiquetaId, tx);
    if (!etiqueta) {
      throw new AppError("ETIQUETA_NO_ENCONTRADA", `No existe una etiqueta con id ${etiquetaId}`, 404);
    }

    if (await activosDao.tieneEtiqueta(activo.id, etiqueta.id, tx)) {
      throw new AppError("ETIQUETA_YA_ASIGNADA", `El activo ${activo.ticker} ya tiene la etiqueta ${etiqueta.nombre}`, 409);
    }

    await activosDao.asignarEtiqueta(activo.id, etiqueta.id, tx);
    return activosDao.getEtiquetas(activo.id, tx);
  });
}

export default asignarEtiqueta;
