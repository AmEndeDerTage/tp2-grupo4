/**
 * Caso de uso: listar las órdenes de un activo (recorrer la relación Activo 1:N Orden desde el lado "1").
 * Vive en Activos porque la URL es de Activos (/activos/:id/ordenes), igual que el profesor resuelve
 * "los libros de un usuario" en el caso de uso de Users con el DAO de préstamos.
 * Devuelve `null` si el activo no existe (el 404 lo decide el controlador); si existe, la misma respuesta
 * paginada que GET /ordenes: { page, limit, total, data }.
 */
async function getOrdenesDeActivo(id, filtros = {}, activosDao, ordenesDao) {
  const activo = await activosDao.getById(id);
  if (!activo) return null;

  const { estado, sentido, sort, page = 1, limit = 20 } = filtros;
  const { items, total } = await ordenesDao.getAll({ activoId: activo.id, estado, sentido, sort, page, limit });
  return { page, limit, total, data: items };
}

export default getOrdenesDeActivo;
