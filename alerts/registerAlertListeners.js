import EVENTS from "../events/eventNames.js";

/**
 * Módulo de alertas: decide QUÉ decir cuando ocurre un evento de dominio.
 * No conoce al emisor (los casos de uso) ni el canal concreto: los notificadores llegan inyectados
 * desde el container, por nombre:
 *  - ordenNotifier: el de NOTIFIER_TYPE (consola o archivo), para orden.creada
 *  - topeNotifier:  un notificador adicional, para activo.topeCerca (el container le pasa el de archivo)
 *
 * Cada listener atrapa sus propios errores. No es prolijidad: `emit` es síncrono y no espera promesas,
 * así que un listener async que rechaza sin try/catch deja una promesa sin manejar y Node termina
 * el proceso (se cae el servidor entero); y uno síncrono que lanza le devuelve el error al caso de uso,
 * que ya guardó la orden. Un aviso que falla se registra y nada más: la operación ya ocurrió.
 */
function registerAlertListeners(bus, { ordenNotifier, topeNotifier }) {
  bus.on(EVENTS.ORDEN_CREADA, async (orden) => {
    try {
      await ordenNotifier.notify({
        subject: `Orden #${orden.id} para colocar a mano`,
        body: tablaParaColocar(orden),
      });
    } catch (err) {
      console.error(`[alertas] No se pudo notificar ${EVENTS.ORDEN_CREADA} (orden ${orden.id}):`, err.message);
    }
  });

  bus.on(EVENTS.ACTIVO_TOPE_CERCA, async ({ ticker, cartera, enComprasVivas, comprometido, topeCedears, pct, umbralPct }) => {
    try {
      await topeNotifier.notify({
        subject: `${ticker} cerca del tope`,
        body:
          `${comprometido} de ${topeCedears} CEDEARs comprometidos (${pct} %): ` +
          `${cartera} en cartera + ${enComprasVivas} en compras vivas. Aviso desde el ${umbralPct} %.`,
      });
    } catch (err) {
      console.error(`[alertas] No se pudo notificar ${EVENTS.ACTIVO_TOPE_CERCA} (${ticker}):`, err.message);
    }
  });
}

/**
 * La «tabla de orden para colocar a mano»: lo que hay que cargar en el broker, campo por campo.
 * El sistema no coloca órdenes: las arma y avisa. El monto es el máximo a pagar (o a cobrar) al límite.
 */
function tablaParaColocar({ ticker, sentido, cantidad, precioLimite, validaHasta }) {
  const filas = [
    ["Activo", ticker],
    ["Operación", sentido.toUpperCase()],
    ["Cantidad", `${cantidad} CEDEARs`],
    ["Precio límite", `US$ ${precioLimite.toFixed(2)} por CEDEAR`],
    ["Monto al límite", `US$ ${(cantidad * precioLimite).toFixed(2)}`],
    ["Válida hasta", validaHasta],
  ];
  const ancho = Math.max(...filas.map(([campo]) => campo.length));
  return filas.map(([campo, valor]) => `  ${campo.padEnd(ancho)} | ${valor}`).join("\n");
}

export default registerAlertListeners;
