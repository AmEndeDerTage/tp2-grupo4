import AppError from "../../errors/AppError.js";

/**
 * Caso de uso: eliminar un activo.
 * Regla de negocio 8: no se borra un activo que tenga órdenes, vivas o ejecutadas (ACTIVO_CON_ORDENES, 409).
 * Es integridad referencial aplicada en el dominio: ninguna orden queda apuntando a un activo que ya no existe,
 * y el historial de órdenes ejecutadas no queda huérfano.
 * Por eso este caso de uso de Activos recibe también el DAO de Órdenes (como deleteBook del profesor con loansDao).
 * Contar y borrar van en una transacción: si no, una orden creada en el medio pasaría la regla y la FK RESTRICT
 * respondería con un 500 (limitación D1).
 * Devuelve `true` si lo borró o `false` si no existía.
 */
async function deleteActivo(id, activosDao, ordenesDao, transaccion) {
  return transaccion(async (tx) => {
    const { total } = await ordenesDao.getAll({ activoId: Number(id) }, tx);
    if (total > 0) {
      throw new AppError(
        "ACTIVO_CON_ORDENES",
        `No se puede eliminar el activo ${id}: tiene ${total} orden(es) asociada(s)`,
        409
      );
    }

    return activosDao.delete(id, tx);
  });
}

export default deleteActivo;
