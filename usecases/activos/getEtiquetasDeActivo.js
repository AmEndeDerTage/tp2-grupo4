/**
 * Caso de uso: las etiquetas de un activo (recorrer la relación N:N desde el lado del activo).
 * Devuelve `null` si el activo no existe (el 404 lo decide el controlador); si existe, sus etiquetas
 * ordenadas por id: [{ id, nombre }] (lista vacía si no tiene). Un activo tiene pocas: no se pagina.
 */
async function getEtiquetasDeActivo(id, activosDao) {
  const activo = await activosDao.getById(id);
  if (!activo) return null;

  return activosDao.getEtiquetas(activo.id);
}

export default getEtiquetasDeActivo;
