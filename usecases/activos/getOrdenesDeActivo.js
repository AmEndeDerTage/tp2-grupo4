/**
 * Caso de uso: listar las órdenes de un activo (recorrer la relación Activo 1:N Orden desde el lado "1").
 * Vive en Activos porque la URL es de Activos (/activos/:id/ordenes) y lo primero que hay que saber es si el activo
 * existe; las órdenes las trae el DAO de Órdenes, que este caso de uso recibe como segunda dependencia.
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
