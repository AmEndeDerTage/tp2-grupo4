import AppError from "../../errors/AppError.js";

/**
 * Caso de uso: dar de alta una etiqueta.
 * Regla: el nombre es único (ETIQUETA_DUPLICADA, 409), como el ticker de un activo (regla 2).
 * `data` ya viene validado y normalizado por Zod (sin espacios alrededor, en minúsculas).
 * Si dos altas iguales llegan a la vez, la segunda choca contra el UNIQUE de la base y el DAO la traduce al mismo 409.
 */
async function createEtiqueta(data, dao) {
  const existente = await dao.getByNombre(data.nombre);
  if (existente) {
    throw new AppError("ETIQUETA_DUPLICADA", `Ya existe una etiqueta con el nombre ${data.nombre}`, 409);
  }

  return dao.save(data);
}

export default createEtiqueta;
