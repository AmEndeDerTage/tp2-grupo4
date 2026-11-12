/**
 * Caso de uso: listar etiquetas con orden y paginación.
 * El orden y la paginación los resuelve el DAO; acá solo se arma la respuesta paginada: { page, limit, total, data }.
 */
async function getEtiquetas(filtros = {}, dao) {
  const { sort, page = 1, limit = 20 } = filtros;
  const { items, total } = await dao.getAll({ sort, page, limit });
  return { page, limit, total, data: items };
}

export default getEtiquetas;
