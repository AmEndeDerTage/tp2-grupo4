import AppError from "../../errors/AppError.js";

/**
 * Caso de uso: dar de alta un activo, opcionalmente con sus etiquetas (`etiquetaIds`).
 * Es la operación atómica de la relación N:N: escribe en dos tablas (el activo y sus vínculos en activo_etiquetas)
 * y tiene que quedar entera o no quedar, como lend() en el ejemplo de la materia (préstamo + stock).
 * Reglas, de la más barata a la más cara (fail fast):
 *   2. el ticker es único                                        → TICKER_DUPLICADO (409)
 *   -  todas las etiquetas tienen que existir (se informan todas
 *      las que faltan en `details`, no solo la primera)          → ETIQUETA_NO_ENCONTRADA (404)
 * Verificar y escribir van en una transacción: si algo falla después del INSERT del activo (p. ej. el de los vínculos),
 * la base deshace el alta y el activo no queda creado. Probado con una falla forzada.
 * `data` ya viene validado en forma por Zod (tipos, enumeraciones, rangos, etiquetas sin repetir).
 */
async function createActivo(data, activosDao, etiquetasDao, transaccion) {
  return transaccion(async (tx) => {
    const existente = await activosDao.getByTicker(data.ticker, tx);
    if (existente) {
      throw new AppError("TICKER_DUPLICADO", `Ya existe un activo con el ticker ${data.ticker}`, 409);
    }

    const faltantes = [];
    for (const etiquetaId of data.etiquetaIds ?? []) {
      if (!(await etiquetasDao.getById(etiquetaId, tx))) faltantes.push(etiquetaId);
    }
    if (faltantes.length > 0) {
      throw new AppError(
        "ETIQUETA_NO_ENCONTRADA",
        `No existe(n) la(s) etiqueta(s) ${faltantes.join(", ")}: el activo no se creó`,
        404,
        faltantes.map((id) => ({ field: "etiquetaIds", message: `No existe una etiqueta con id ${id}` }))
      );
    }

    return activosDao.save(data, tx);
  });
}

export default createActivo;
