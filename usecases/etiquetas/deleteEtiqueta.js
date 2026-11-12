/**
 * Caso de uso: eliminar una etiqueta.
 * Una etiqueta en uso se borra igual y desaparece de todos los activos que la tenían (decisión de S6b): un vínculo es
 * una clasificación, no historia. Es la diferencia con la regla 8, que no deja borrar un activo con órdenes porque
 * las órdenes sí son historia.
 * Dos escrituras que van juntas, en una transacción: quitar los vínculos (DAO de Activos, que es quien los guarda)
 * y borrar la etiqueta. Si la segunda fallara, la primera se deshace. En la base, el ON DELETE CASCADE de
 * activo_etiquetas haría lo mismo solo; se hace explícito para que memoria responda igual.
 * Devuelve `true` si la borró o `false` si no existía (el 404 lo decide el controlador).
 */
async function deleteEtiqueta(id, etiquetasDao, activosDao, transaccion) {
  return transaccion(async (tx) => {
    const etiqueta = await etiquetasDao.getById(id, tx);
    if (!etiqueta) return false;

    await activosDao.quitarEtiquetaDeTodos(etiqueta.id, tx);
    return etiquetasDao.delete(etiqueta.id, tx);
  });
}

export default deleteEtiqueta;
