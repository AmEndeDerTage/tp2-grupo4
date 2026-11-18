import AppError from "../../errors/AppError.js";

/**
 * Caso de uso: renombrar una etiqueta (actualización parcial).
 * Regla: el nombre nuevo no puede ser el de OTRA etiqueta (ETIQUETA_DUPLICADA, 409); repetir el propio es válido.
 * Devuelve la etiqueta actualizada o `null` si no existe (el 404 lo decide el controlador). Que exista es lo primero
 * que se mira: renombrar una etiqueta inexistente es un 404 aunque el nombre pedido sea el de otra (no un 409).
 * Como la etiqueta se guarda una sola vez y los activos la referencian por id, renombrarla la renombra en todos.
 */
async function updateEtiqueta(id, cambios, dao) {
  const actual = await dao.getById(id);
  if (!actual) return null;

  if (cambios.nombre !== undefined) {
    const existente = await dao.getByNombre(cambios.nombre);
    if (existente && existente.id !== actual.id) {
      throw new AppError("ETIQUETA_DUPLICADA", `Ya existe otra etiqueta con el nombre ${cambios.nombre}`, 409);
    }
  }

  return dao.update(id, cambios);
}

export default updateEtiqueta;
