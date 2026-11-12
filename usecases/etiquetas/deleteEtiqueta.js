/**
 * Caso de uso: eliminar una etiqueta.
 * Devuelve `true` si la borró o `false` si no existía (el 404 lo decide el controlador).
 */
async function deleteEtiqueta(id, dao) {
  return dao.delete(id);
}

export default deleteEtiqueta;
