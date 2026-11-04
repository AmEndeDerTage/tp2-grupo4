/**
 * Caso de uso: listar órdenes con filtros, orden y paginación.
 * Los filtros los resuelve el DAO (en SQL: WHERE / ORDER BY / LIMIT); acá solo se arma
 * la respuesta paginada con metadata: { page, limit, total, data }, igual que en Activos.
 */
async function getOrdenes(filtros = {}, ordenesDao) {
  const { activoId, estado, sentido, sort, page = 1, limit = 20 } = filtros;
  const { items, total } = await ordenesDao.getAll({ activoId, estado, sentido, sort, page, limit });
  return { page, limit, total, data: items };
}

export default getOrdenes;
