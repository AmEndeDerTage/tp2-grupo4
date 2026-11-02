import {
  obtenerActivoDeLaOrden,
  ordenesVivasDelMismoLado,
  verificarNivelOperable,
  verificarNoDuplicada,
  verificarCupo,
} from "./reglasOrden.js";

/**
 * Caso de uso: armar una orden nueva (nace "viva").
 * `data` ya viene validado en forma por Zod; acá se aplican las reglas que dependen de otros datos,
 * en este orden (de lo más básico a lo más fino):
 *   1. el activo existe                       → ACTIVO_NO_ENCONTRADO (404)
 *   4. si es compra, el nivel la permite      → NIVEL_NO_OPERABLE (409)
 *   3. no duplica una orden viva              → ORDEN_DUPLICADA (409)
 *   5/6. la cantidad entra en lo disponible   → CANTIDAD_INSUFICIENTE / TOPE_EXCEDIDO (409)
 */
async function createOrden(data, ordenesDao, activosDao) {
  const activo = await obtenerActivoDeLaOrden(data.activoId, activosDao);
  verificarNivelOperable(activo, data.sentido);

  const vivas = await ordenesVivasDelMismoLado(ordenesDao, activo.id, data.sentido);
  verificarNoDuplicada(vivas, data.precioLimite, activo, data.sentido);
  verificarCupo(activo, data.sentido, data.cantidad, vivas);

  return ordenesDao.save(data);
}

export default createOrden;
