import AppError from "../../errors/AppError.js";

/**
 * Caso de uso: modificar parcialmente un activo.
 * Regla de negocio 2: si cambia el ticker, no puede ser el de OTRO activo (TICKER_DUPLICADO, 409).
 * Devuelve el activo actualizado o `null` si no existe.
 */
async function updateActivo(id, cambios, dao) {
  if (cambios.ticker !== undefined) {
    const existente = await dao.getByTicker(cambios.ticker);
    if (existente && existente.id !== Number(id)) {
      throw new AppError("TICKER_DUPLICADO", `Ya existe otro activo con el ticker ${cambios.ticker}`, 409);
    }
  }

  return dao.update(id, cambios);
}

export default updateActivo;
