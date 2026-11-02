/**
 * Caso de uso: obtener una orden por id.
 * Devuelve la orden (con su activo anidado) o `null` si no existe. No lanza error: que el `null`
 * sea un 404 es una decisión HTTP y la toma el controlador.
 */
async function getOrdenById(id, ordenesDao) {
  return ordenesDao.getById(id);
}

export default getOrdenById;
