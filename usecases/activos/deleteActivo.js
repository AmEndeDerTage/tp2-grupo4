/**
 * Caso de uso: eliminar un activo.
 * Devuelve `true` si lo borró o `false` si no existía.
 * Cuando exista la entidad Orden se suma acá la regla 8: no se borra un activo con órdenes (ACTIVO_CON_ORDENES, 409).
 */
async function deleteActivo(id, dao) {
  return dao.delete(id);
}

export default deleteActivo;
