import AppError from "../../errors/AppError.js";

/**
 * Caso de uso: dar de alta un activo.
 * Regla de negocio 2: el ticker es único (TICKER_DUPLICADO, 409).
 * `data` ya viene validado en forma por Zod (tipos, enumeraciones, rangos).
 */
async function createActivo(data, dao) {
  const existente = await dao.getByTicker(data.ticker);
  if (existente) {
    throw new AppError("TICKER_DUPLICADO", `Ya existe un activo con el ticker ${data.ticker}`, 409);
  }

  return dao.save(data);
}

export default createActivo;
