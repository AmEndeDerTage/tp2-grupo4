/**
 * Caso de uso: obtener un activo por id.
 * Devuelve el activo o `null` si no existe. No lanza error: que el `null` sea un 404
 * es una decisión HTTP y la toma el controlador.
 */
async function getActivoById(id, dao) {
  return dao.getById(id);
}

export default getActivoById;
