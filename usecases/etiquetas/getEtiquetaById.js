/**
 * Caso de uso: obtener una etiqueta por id.
 * Devuelve la etiqueta o `null` si no existe: que el `null` sea un 404 lo decide el controlador.
 */
async function getEtiquetaById(id, dao) {
  return dao.getById(id);
}

export default getEtiquetaById;
