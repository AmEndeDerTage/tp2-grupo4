/**
 * Caso de uso: listar activos con filtros, orden y paginación.
 * Los filtros (nivel, mercado y etiqueta) los resuelve el DAO (en SQL: WHERE / ORDER BY / LIMIT); acá solo se arma
 * la respuesta paginada con metadata: { page, limit, total, data }.
 */
async function getActivos(filtros = {}, dao) {
  const { nivel, mercado, etiqueta, sort, page = 1, limit = 20 } = filtros;
  const { items, total } = await dao.getAll({ nivel, mercado, etiqueta, sort, page, limit });
  return { page, limit, total, data: items };
}

export default getActivos;
