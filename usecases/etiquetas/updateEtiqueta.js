import AppError from "../../errors/AppError.js";

/**
 * Caso de uso: renombrar una etiqueta (actualización parcial).
 * Regla: el nombre nuevo no puede ser el de OTRA etiqueta (ETIQUETA_DUPLICADA, 409); repetir el propio es válido.
 * Devuelve la etiqueta actualizada o `null` si no existe (el 404 lo decide el controlador).
 * Como la etiqueta se guarda una sola vez y los activos la referencian por id, renombrarla la renombra en todos.
 */
async function updateEtiqueta(id, cambios, dao) {
  if (cambios.nombre !== undefined) {
    const existente = await dao.getByNombre(cambios.nombre);
    if (existente && existente.id !== Number(id)) {
      throw new AppError("ETIQUETA_DUPLICADA", `Ya existe otra etiqueta con el nombre ${cambios.nombre}`, 409);
    }
  }

  return dao.update(id, cambios);
}

export default updateEtiqueta;
