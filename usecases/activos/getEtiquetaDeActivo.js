import AppError from "../../errors/AppError.js";

/**
 * Caso de uso: un vínculo de la N:N (GET /activos/:id/etiquetas/:etiquetaId), es decir, «¿este activo tiene esta etiqueta?».
 * Es la URL que devuelve el header Location al asignar (POST de la misma ruta): lo creado tiene que poder pedirse con GET.
 * Devuelve la etiqueta ({ id, nombre }) si el activo la tiene, o `null` si el activo no existe (el 404 lo decide el controlador).
 * Mismos chequeos y en el mismo orden que quitarEtiqueta:
 *   - la etiqueta tiene que existir                    → ETIQUETA_NO_ENCONTRADA (404)
 *   - el activo tiene que tenerla                      → ETIQUETA_NO_ASIGNADA (404: ese vínculo no existe)
 * Solo lee: no hace falta transacción (como getEtiquetasDeActivo).
 */
async function getEtiquetaDeActivo(id, etiquetaId, activosDao, etiquetasDao) {
  const activo = await activosDao.getById(id);
  if (!activo) return null;

  const etiqueta = await etiquetasDao.getById(etiquetaId);
  if (!etiqueta) {
    throw new AppError("ETIQUETA_NO_ENCONTRADA", `No existe una etiqueta con id ${etiquetaId}`, 404);
  }

  if (!(await activosDao.tieneEtiqueta(activo.id, etiqueta.id))) {
    throw new AppError("ETIQUETA_NO_ASIGNADA", `El activo ${activo.ticker} no tiene la etiqueta ${etiqueta.nombre}`, 404);
  }
  return etiqueta;
}

export default getEtiquetaDeActivo;
