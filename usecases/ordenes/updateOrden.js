import AppError from "../../errors/AppError.js";
import { TOPE_CERCA_PCT } from "../../config/config.js";
import EVENTS from "../../events/eventNames.js";
import {
  obtenerActivoDeLaOrden,
  ordenesVivasDelMismoLado,
  verificarNoDuplicada,
  verificarCupo,
  evaluarTopeCerca,
} from "./reglasOrden.js";

/**
 * Caso de uso: modificar parcialmente una orden (solo cantidad, precioLimite, validaHasta y motivo: lo limita Zod).
 * Devuelve la orden actualizada o `null` si no existe (el 404 lo decide el controlador).
 * Reglas, en este orden:
 *   7. una orden ejecutada no se modifica                         → ORDEN_NO_MODIFICABLE (409)
 *   1. el activo de la orden existe (lo garantiza la regla 8; se verifica igual, porque las reglas siguientes lo usan)
 *   3. si cambia el precio, no duplica otra orden viva             → ORDEN_DUPLICADA (409)
 *   5/6. si cambia la cantidad, entra en lo disponible             → CANTIDAD_INSUFICIENTE / TOPE_EXCEDIDO (409)
 * En 3, 5 y 6 la propia orden no se cuenta (excluirId): si no, se compararía consigo misma.
 *
 * Evento: si el cambio incluye la cantidad de una compra y lo comprometido queda en TOPE_CERCA_PCT % o más
 * del tope, emite activo.topeCerca (mismo criterio que updateBook del profesor: editar solo el precio,
 * la fecha o el motivo no vuelve a avisar). orden.creada no se emite: la orden ya existía.
 */
async function updateOrden(id, cambios, ordenesDao, activosDao, events) {
  const orden = await ordenesDao.getById(id);
  if (!orden) return null;

  if (orden.estado === "ejecutada") {
    throw new AppError("ORDEN_NO_MODIFICABLE", `La orden ${orden.id} ya está ejecutada: no se puede modificar`, 409);
  }

  const activo = await obtenerActivoDeLaOrden(orden.activoId, activosDao);
  const vivas = await ordenesVivasDelMismoLado(ordenesDao, activo.id, orden.sentido, orden.id);

  if (cambios.precioLimite !== undefined) {
    verificarNoDuplicada(vivas, cambios.precioLimite, activo, orden.sentido);
  }
  if (cambios.cantidad !== undefined) {
    verificarCupo(activo, orden.sentido, cambios.cantidad, vivas);
  }

  const actualizada = await ordenesDao.update(id, cambios);

  if (actualizada && cambios.cantidad !== undefined && orden.sentido === "compra") {
    const topeCerca = evaluarTopeCerca(activo, vivas, actualizada.cantidad, TOPE_CERCA_PCT);
    if (topeCerca) events.emit(EVENTS.ACTIVO_TOPE_CERCA, topeCerca);
  }

  return actualizada;
}

export default updateOrden;
