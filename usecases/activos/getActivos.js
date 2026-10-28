/**
 * Caso de uso: listar activos con filtros, orden y paginación.
 * Los filtros los resuelve el DAO (en SQL serán WHERE / ORDER BY / LIMIT); acá solo se arma
 * la respuesta paginada con metadata: { page, limit, total, data }.
 */
async function getActivos(filtros = {}, dao) {
  const { nivel, mercado, sort, page = 1, limit = 20 } = filtros;
  const { items, total } = await dao.getAll({ nivel, mercado, sort, page, limit });
  return { page, limit, total, data: items };
}

export default getActivos;
