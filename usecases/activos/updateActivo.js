import AppError from "../../errors/AppError.js";
import EVENTS from "../../events/eventNames.js";
import { verificarCompromisos, verificarNivelConCompras, evaluarTopeCerca } from "../ordenes/reglasOrden.js";

/**
 * Caso de uso: modificar parcialmente un activo.
 * Devuelve el activo actualizado o `null` si no existe (el 404 lo decide el controlador). Que exista es lo primero
 * que se mira: editar un activo inexistente es un 404 aunque el ticker pedido sea el de otro (no un 409).
 * Reglas:
 *   2. si cambia el ticker, no puede ser el de OTRO activo                       → TICKER_DUPLICADO (409)
 *   5 y 6. si cambia `cantidad` o `topeCedears`, lo comprometido en órdenes vivas
 *      tiene que seguir entrando (verificarCompromisos)                           → CANTIDAD_INSUFICIENTE / TOPE_EXCEDIDO (409)
 *   4. si cambia `nivel` y el activo tiene compras vivas, el nivel nuevo tiene que
 *      permitir comprar (verificarNivelConCompras)                                → NIVEL_NO_OPERABLE (409)
 * Las tres son reglas de Órdenes vistas desde el activo: sin ellas, editando el activo se llegaría a órdenes vivas
 * que las reglas no dejan crear.
 * Leer, verificar y guardar van en una transacción, como en los casos de uso de Órdenes: si no, una orden creada en el
 * medio podría quedar fuera de la cuenta.
 *
 * Evento: si el cambio toca `cantidad` o `topeCedears` y lo comprometido (cartera + compras vivas) queda en
 * `topeCercaPct` % o más del tope, emite activo.topeCerca, el mismo aviso que una compra. Se llega al tope por
 * cualquiera de las dos puertas, y el aviso dice «el activo está cerca del tope», no «una compra lo acercó».
 * Cambiar solo el nivel, el nombre o el ticker no vuelve a avisar. Se emite después del commit.
 * El umbral `topeCercaPct` llega inyectado desde el container (clase 13), como en createOrden y updateOrden.
 */
async function updateActivo(id, cambios, activosDao, ordenesDao, events, transaccion, topeCercaPct) {
  const tocaCupo = cambios.cantidad !== undefined || cambios.topeCedears !== undefined;

  const resultado = await transaccion(async (tx) => {
    const actual = await activosDao.getById(id, tx);
    if (!actual) return null;

    if (cambios.ticker !== undefined) {
      const existente = await activosDao.getByTicker(cambios.ticker, tx);
      if (existente && existente.id !== actual.id) {
        throw new AppError("TICKER_DUPLICADO", `Ya existe otro activo con el ticker ${cambios.ticker}`, 409);
      }
    }

    let comprasVivas = [];
    if (tocaCupo || cambios.nivel !== undefined) {
      const { items: vivas } = await ordenesDao.getAll({ activoId: actual.id, estado: "viva" }, tx);
      if (tocaCupo) verificarCompromisos({ ...actual, ...cambios }, vivas);
      if (cambios.nivel !== undefined) verificarNivelConCompras({ ...actual, ...cambios }, vivas);
      comprasVivas = vivas.filter((o) => o.sentido === "compra");
    }

    const actualizado = await activosDao.update(id, cambios, tx);
    return { actualizado, comprasVivas };
  });
  if (!resultado) return null;

  const { actualizado, comprasVivas } = resultado;
  if (tocaCupo) {
    const topeCerca = evaluarTopeCerca(actualizado, comprasVivas, 0, topeCercaPct);
    if (topeCerca) events.emit(EVENTS.ACTIVO_TOPE_CERCA, topeCerca);
  }

  return actualizado;
}

export default updateActivo;
