import AppError from "../../errors/AppError.js";

/**
 * Reglas de negocio de Órdenes, escritas UNA sola vez y reutilizadas por los casos de uso
 * (createOrden, updateOrden y ejecutarOrden). Cada función verifica una regla y,
 * si no se cumple, lanza un AppError con su código; si se cumple, no hace nada (o devuelve lo que buscó).
 * No conocen HTTP ni ninguna implementación concreta de DAO: reciben los DAOs por parámetro.
 * Las que leen datos reciben además el `tx` de la transacción del caso de uso, para leer dentro de ella.
 */

// Niveles en los que se permite comprar: L2 = lista para comprar, L3 = con posición (regla 4)
const NIVELES_COMPRABLES = ["L2", "L3"];

/**
 * Regla 1: el activo de la orden tiene que existir (ACTIVO_NO_ENCONTRADO, 404).
 * Devuelve el activo, porque las demás reglas lo necesitan (nivel, cantidad, tope).
 */
async function obtenerActivoDeLaOrden(activoId, activosDao, tx) {
  const activo = await activosDao.getById(activoId, tx);
  if (!activo) {
    throw new AppError("ACTIVO_NO_ENCONTRADO", `No existe un activo con id ${activoId}`, 404);
  }
  return activo;
}

/**
 * Las órdenes VIVAS del mismo activo y sentido, sin contar `excluirId` (la propia orden, al editarla).
 * Es la base de las reglas 3, 5 y 6: lo ya ejecutado está en `activo.cantidad`; lo vivo es lo comprometido.
 */
async function ordenesVivasDelMismoLado(ordenesDao, activoId, sentido, excluirId, tx) {
  const { items } = await ordenesDao.getAll({ activoId, sentido, estado: "viva" }, tx);
  return items.filter((o) => o.id !== excluirId);
}

/** Regla 4: solo se compra en activos de nivel L2 o L3 (NIVEL_NO_OPERABLE, 409). Vender no depende del nivel. */
function verificarNivelOperable(activo, sentido) {
  if (sentido === "compra" && !NIVELES_COMPRABLES.includes(activo.nivel)) {
    throw new AppError(
      "NIVEL_NO_OPERABLE",
      `No se puede comprar ${activo.ticker}: está en nivel ${activo.nivel} y solo se compra en ${NIVELES_COMPRABLES.join(" o ")}`,
      409
    );
  }
}

/** Regla 3: no puede haber dos órdenes vivas con el mismo activo, sentido y precio (ORDEN_DUPLICADA, 409). */
function verificarNoDuplicada(vivasDelMismoLado, precioLimite, activo, sentido) {
  const duplicada = vivasDelMismoLado.find((o) => o.precioLimite === precioLimite);
  if (duplicada) {
    throw new AppError(
      "ORDEN_DUPLICADA",
      `Ya existe la orden viva ${duplicada.id} de ${sentido} de ${activo.ticker} a ${precioLimite}`,
      409
    );
  }
}

/**
 * Reglas 5 y 6: que la cantidad entre en lo que queda disponible.
 *  - venta (regla 5): cantidad ≤ cartera − Σ ventas vivas (CANTIDAD_INSUFICIENTE, 409)
 *  - compra (regla 6): cartera + Σ compras vivas + cantidad ≤ topeCedears (TOPE_EXCEDIDO, 409)
 * `vivasDelMismoLado` ya viene sin la propia orden cuando se está editando.
 */
function verificarCupo(activo, sentido, cantidad, vivasDelMismoLado) {
  const comprometido = vivasDelMismoLado.reduce((suma, o) => suma + o.cantidad, 0);

  if (sentido === "venta") {
    const disponible = activo.cantidad - comprometido;
    if (cantidad > disponible) {
      throw new AppError(
        "CANTIDAD_INSUFICIENTE",
        `No se pueden vender ${cantidad} ${activo.ticker}: hay ${disponible} disponibles (${activo.cantidad} en cartera − ${comprometido} en ventas vivas)`,
        409
      );
    }
    return;
  }

  const total = activo.cantidad + comprometido + cantidad;
  if (total > activo.topeCedears) {
    throw new AppError(
      "TOPE_EXCEDIDO",
      `Comprar ${cantidad} ${activo.ticker} llevaría a ${total} CEDEARs (${activo.cantidad} en cartera + ${comprometido} en compras vivas + ${cantidad}) y el tope es ${activo.topeCedears}`,
      409
    );
  }
}

/**
 * Regla del aviso activo.topeCerca (no rechaza nada: decide si hay que avisar).
 * Para una compra que ya pasó la regla 6: si lo comprometido (cartera + compras vivas, incluida esta)
 * llega al `umbralPct` % del tope, devuelve el payload del evento; si no, `null`.
 * El umbral llega por parámetro (el caso de uso lo lee de config) para que la función sea pura y testeable.
 */
function evaluarTopeCerca(activo, vivasDelMismoLado, cantidad, umbralPct) {
  const enComprasVivas = vivasDelMismoLado.reduce((suma, o) => suma + o.cantidad, 0) + cantidad;
  const comprometido = activo.cantidad + enComprasVivas;
  if (comprometido * 100 < umbralPct * activo.topeCedears) return null;

  return {
    activoId: activo.id,
    ticker: activo.ticker,
    cartera: activo.cantidad,
    enComprasVivas,
    comprometido,
    topeCedears: activo.topeCedears,
    pct: Math.round((comprometido * 1000) / activo.topeCedears) / 10,
    umbralPct,
  };
}

/**
 * Regla 5 al ejecutar una venta: lo que se vende tiene que estar en cartera (CANTIDAD_INSUFICIENTE, 409).
 * Al crear y al editar ya se verificó contra lo disponible; acá se vuelve a mirar porque la ejecución es lo que
 * efectivamente saca los CEDEARs de la cartera. (Una compra no se verifica: lo comprometido no cambia al ejecutarla.)
 */
function verificarCarteraParaEjecutar(activo, orden) {
  if (orden.sentido === "venta" && orden.cantidad > activo.cantidad) {
    throw new AppError(
      "CANTIDAD_INSUFICIENTE",
      `No se puede ejecutar la venta ${orden.id} de ${orden.cantidad} ${activo.ticker}: hay ${activo.cantidad} en cartera`,
      409
    );
  }
}

/**
 * El nivel del activo después de ejecutar la orden: el nivel sigue a la posición (L3 = con posición).
 *  - compra ejecutada → L3, desde cualquier nivel;
 *  - venta que deja la cartera en 0 sobre un L3 → L2 (vuelve a la lista; si ya no interesa, se baja a mano con PUT).
 * Devuelve el nivel nuevo, o undefined si no cambia. Pura: no lee nada, recibe todo por parámetro.
 */
function nivelTrasEjecucion(activo, orden) {
  if (orden.sentido === "compra") {
    return activo.nivel === "L3" ? undefined : "L3";
  }
  const queda = activo.cantidad - orden.cantidad;
  return queda === 0 && activo.nivel === "L3" ? "L2" : undefined;
}

export {
  NIVELES_COMPRABLES,
  obtenerActivoDeLaOrden,
  ordenesVivasDelMismoLado,
  verificarNivelOperable,
  verificarNoDuplicada,
  verificarCupo,
  evaluarTopeCerca,
  verificarCarteraParaEjecutar,
  nivelTrasEjecucion,
};
