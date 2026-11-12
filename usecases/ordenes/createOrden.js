import EVENTS from "../../events/eventNames.js";
import {
  obtenerActivoDeLaOrden,
  ordenesVivasDelMismoLado,
  verificarNivelOperable,
  verificarNoDuplicada,
  verificarCupo,
  evaluarTopeCerca,
} from "./reglasOrden.js";

/**
 * Caso de uso: armar una orden nueva (nace "viva").
 * `data` ya viene validado en forma por Zod; acá se aplican las reglas que dependen de otros datos,
 * en este orden (de lo más básico a lo más fino):
 *   1. el activo existe                       → ACTIVO_NO_ENCONTRADO (404)
 *   4. si es compra, el nivel la permite      → NIVEL_NO_OPERABLE (409)
 *   3. no duplica una orden viva              → ORDEN_DUPLICADA (409)
 *   5/6. la cantidad entra en lo disponible   → CANTIDAD_INSUFICIENTE / TOPE_EXCEDIDO (409)
 *
 * Después de guardar, anuncia lo que pasó por el bus `events` (efectos secundarios desacoplados):
 *  - orden.creada, siempre: alguien tiene que colocarla a mano en el broker
 *  - activo.topeCerca, si es una compra que deja lo comprometido en `topeCercaPct` % o más del tope
 * No sabe quién escucha ni por dónde se avisa. Se emite DESPUÉS de guardar: no se anuncia algo que todavía puede fallar.
 * Los payloads son objetos planos armados acá, con el ticker ya resuelto (el activo se cargó para la regla 1):
 * el listener no necesita ningún DAO.
 * El umbral (`topeCercaPct`) es parte de la regla —cuándo avisar— pero el número llega inyectado desde el container,
 * como lowStockThreshold en makeLoanUseCases del profesor (clase 13): el caso de uso no importa config.js, así que un
 * test puede probarlo con otro umbral sin tocar el .env. Instanciar un notificador tampoco le toca: es el canal.
 *
 * Leer, verificar y guardar van dentro de UNA transacción (`transaccion`, inyectada): si no, dos pedidos simultáneos
 * leen lo mismo, pasan los dos las reglas 3, 5 y 6 y se guardan los dos (la carrera A1). Los eventos se emiten
 * DESPUÉS de que la transacción confirmó: adentro, un rollback posterior dejaría anunciado algo que no pasó.
 */
async function createOrden(data, ordenesDao, activosDao, events, transaccion, topeCercaPct) {
  const { activo, vivas, creada } = await transaccion(async (tx) => {
    const activo = await obtenerActivoDeLaOrden(data.activoId, activosDao, tx);
    verificarNivelOperable(activo, data.sentido);

    const vivas = await ordenesVivasDelMismoLado(ordenesDao, activo.id, data.sentido, undefined, tx);
    verificarNoDuplicada(vivas, data.precioLimite, activo, data.sentido);
    verificarCupo(activo, data.sentido, data.cantidad, vivas);

    const creada = await ordenesDao.save(data, tx);
    return { activo, vivas, creada };
  });

  events.emit(EVENTS.ORDEN_CREADA, {
    id: creada.id,
    ticker: activo.ticker,
    sentido: creada.sentido,
    cantidad: creada.cantidad,
    precioLimite: creada.precioLimite,
    validaHasta: creada.validaHasta,
  });

  if (creada.sentido === "compra") {
    const topeCerca = evaluarTopeCerca(activo, vivas, creada.cantidad, topeCercaPct);
    if (topeCerca) events.emit(EVENTS.ACTIVO_TOPE_CERCA, topeCerca);
  }

  return creada;
}

export default createOrden;
