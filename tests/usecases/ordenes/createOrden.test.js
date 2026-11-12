import { describe, it, expect } from "vitest";
import { crearEscenario, estado, unActivo, unaOrden, pedidoDeOrden } from "../../helpers/escenario.js";
import EVENTS from "../../../events/eventNames.js";

// createOrden con DAOs en memoria como dobles. Para cada regla, los cuatro casos de la clase 13:
// el feliz, el borde, el que la viola y que el estado no cambió tras el rechazo.

describe("createOrden — camino feliz", () => {
  it("guarda la orden viva con el activo anidado y emite orden.creada con un payload plano", async () => {
    const esc = crearEscenario({ activos: [unActivo({ nivel: "L2", cantidad: 0, topeCedears: 30 })] });

    const creada = await esc.ordenes.createOrden(pedidoDeOrden({ cantidad: 5, precioLimite: 12.5, motivo: "Primera compra" }));

    expect(creada).toEqual({
      id: 1,
      activoId: 1,
      sentido: "compra",
      cantidad: 5,
      precioLimite: 12.5,
      validaHasta: "2026-12-31",
      estado: "viva",
      motivo: "Primera compra",
      activo: { id: 1, ticker: "KO" },
    });
    expect(await esc.dao.ordenes.getById(1)).toEqual(creada);
    expect(esc.events.emit).toHaveBeenCalledTimes(1);
    expect(esc.events.emit).toHaveBeenCalledWith(EVENTS.ORDEN_CREADA, {
      id: 1,
      ticker: "KO",
      sentido: "compra",
      cantidad: 5,
      precioLimite: 12.5,
      validaHasta: "2026-12-31",
    });
  });
});

describe("regla 1 — el activo de la orden tiene que existir", () => {
  it("con un activo inexistente → 404 ACTIVO_NO_ENCONTRADO, no guarda nada ni avisa", async () => {
    const esc = crearEscenario({ activos: [unActivo()] });
    const antes = await estado(esc);

    await expect(esc.ordenes.createOrden(pedidoDeOrden({ activoId: 99 }))).rejects.toMatchObject({
      code: "ACTIVO_NO_ENCONTRADO",
      statusCode: 404,
    });
    expect(await estado(esc)).toEqual(antes);
    expect(esc.events.emit).not.toHaveBeenCalled();
  });
});

describe("regla 4 — solo se compra en nivel L2 o L3", () => {
  it("feliz: se compra en L2", async () => {
    const esc = crearEscenario({ activos: [unActivo({ nivel: "L2", cantidad: 0 })] });
    await expect(esc.ordenes.createOrden(pedidoDeOrden())).resolves.toMatchObject({ estado: "viva" });
  });

  it("borde: en L1 no se compra, pero se vende (vender no depende del nivel)", async () => {
    const esc = crearEscenario({ activos: [unActivo({ nivel: "L1", cantidad: 5 })] });
    await expect(esc.ordenes.createOrden(pedidoDeOrden({ sentido: "venta", cantidad: 5 }))).resolves.toMatchObject({ sentido: "venta" });
  });

  it("la viola: comprar en L1 → 409 NIVEL_NO_OPERABLE y el estado no cambió", async () => {
    const esc = crearEscenario({ activos: [unActivo({ nivel: "L1", cantidad: 0 })] });
    const antes = await estado(esc);

    await expect(esc.ordenes.createOrden(pedidoDeOrden())).rejects.toMatchObject({ code: "NIVEL_NO_OPERABLE", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
    expect(esc.events.emit).not.toHaveBeenCalled();
  });
});

describe("regla 3 — no hay dos órdenes vivas con el mismo activo, sentido y precio", () => {
  const conCompraVivaA50 = (extra = {}) =>
    crearEscenario({ activos: [unActivo({ nivel: "L2", cantidad: 0, topeCedears: 100 })], ordenes: [unaOrden({ precioLimite: 50, ...extra })] });

  it("feliz: el mismo activo y sentido a otro precio", async () => {
    const esc = conCompraVivaA50();
    await expect(esc.ordenes.createOrden(pedidoDeOrden({ precioLimite: 49.5 }))).resolves.toMatchObject({ id: 2 });
  });

  it("borde: el mismo precio está permitido si la otra orden ya está ejecutada, o si es del otro sentido", async () => {
    const ejecutada = conCompraVivaA50({ estado: "ejecutada" });
    await expect(ejecutada.ordenes.createOrden(pedidoDeOrden({ precioLimite: 50 }))).resolves.toMatchObject({ id: 2 });

    const otroSentido = crearEscenario({ activos: [unActivo({ cantidad: 40 })], ordenes: [unaOrden({ precioLimite: 50 })] });
    await expect(otroSentido.ordenes.createOrden(pedidoDeOrden({ sentido: "venta", precioLimite: 50 }))).resolves.toMatchObject({ id: 2 });
  });

  it("la viola: otra compra viva a 50 → 409 ORDEN_DUPLICADA y el estado no cambió", async () => {
    const esc = conCompraVivaA50();
    const antes = await estado(esc);

    await expect(esc.ordenes.createOrden(pedidoDeOrden({ precioLimite: 50 }))).rejects.toMatchObject({ code: "ORDEN_DUPLICADA", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
    expect(esc.events.emit).not.toHaveBeenCalled();
  });
});

describe("regla 5 — una venta no puede superar lo disponible (cartera − ventas vivas)", () => {
  // 40 en cartera y una venta viva de 10: quedan 30 disponibles
  const escenario = () => crearEscenario({ activos: [unActivo({ cantidad: 40 })], ordenes: [unaOrden({ sentido: "venta", cantidad: 10, precioLimite: 70 })] });
  const venta = (cantidad) => pedidoDeOrden({ sentido: "venta", cantidad, precioLimite: 72 });

  it("feliz: vender 20", async () => {
    await expect(escenario().ordenes.createOrden(venta(20))).resolves.toMatchObject({ cantidad: 20 });
  });

  it("borde: vender exactamente los 30 disponibles", async () => {
    await expect(escenario().ordenes.createOrden(venta(30))).resolves.toMatchObject({ cantidad: 30 });
  });

  it("la viola: vender 31 → 409 CANTIDAD_INSUFICIENTE y el estado no cambió", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    await expect(esc.ordenes.createOrden(venta(31))).rejects.toMatchObject({ code: "CANTIDAD_INSUFICIENTE", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
    expect(esc.events.emit).not.toHaveBeenCalled();
  });
});

describe("regla 6 — una compra no puede pasar el tope (cartera + compras vivas + la nueva ≤ topeCedears)", () => {
  // Tope 30, nada en cartera y una compra viva de 10: entran 20 más
  const escenario = () => crearEscenario({ activos: [unActivo({ nivel: "L2", cantidad: 0, topeCedears: 30 })], ordenes: [unaOrden({ cantidad: 10, precioLimite: 12 })] });

  it("feliz: comprar 5", async () => {
    await expect(escenario().ordenes.createOrden(pedidoDeOrden({ cantidad: 5 }))).resolves.toMatchObject({ cantidad: 5 });
  });

  it("borde: comprar exactamente los 20 que entran", async () => {
    await expect(escenario().ordenes.createOrden(pedidoDeOrden({ cantidad: 20 }))).resolves.toMatchObject({ cantidad: 20 });
  });

  it("la viola: comprar 21 → 409 TOPE_EXCEDIDO y el estado no cambió", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    await expect(esc.ordenes.createOrden(pedidoDeOrden({ cantidad: 21 }))).rejects.toMatchObject({ code: "TOPE_EXCEDIDO", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
    expect(esc.events.emit).not.toHaveBeenCalled();
  });
});

describe("activo.topeCerca — el umbral llega inyectado (topeCercaPct)", () => {
  // Tope 30 y una compra viva de 10: comprar 5 deja lo comprometido en 15 de 30 (50 %)
  const escenario = (topeCercaPct) =>
    crearEscenario({ activos: [unActivo({ nivel: "L2", cantidad: 0, topeCedears: 30 })], ordenes: [unaOrden({ cantidad: 10, precioLimite: 12 })], topeCercaPct });

  it("con umbral 90, una compra que deja el 50 % solo avisa orden.creada", async () => {
    const esc = escenario(90);
    await esc.ordenes.createOrden(pedidoDeOrden({ cantidad: 5 }));
    expect(esc.events.emit.mock.calls.map(([nombre]) => nombre)).toEqual([EVENTS.ORDEN_CREADA]);
  });

  it("con umbral 50, la misma compra avisa también activo.topeCerca, después de orden.creada", async () => {
    const esc = escenario(50);
    await esc.ordenes.createOrden(pedidoDeOrden({ cantidad: 5 }));
    expect(esc.events.emit.mock.calls.map(([nombre]) => nombre)).toEqual([EVENTS.ORDEN_CREADA, EVENTS.ACTIVO_TOPE_CERCA]);
    expect(esc.events.emit).toHaveBeenLastCalledWith(EVENTS.ACTIVO_TOPE_CERCA, {
      activoId: 1,
      ticker: "KO",
      cartera: 0,
      enComprasVivas: 15,
      comprometido: 15,
      topeCedears: 30,
      pct: 50,
      umbralPct: 50,
    });
  });

  it("una venta nunca avisa el tope, aunque el umbral sea bajo", async () => {
    const esc = crearEscenario({ activos: [unActivo({ cantidad: 40, topeCedears: 40 })], topeCercaPct: 1 });
    await esc.ordenes.createOrden(pedidoDeOrden({ sentido: "venta", cantidad: 10 }));
    expect(esc.events.emit.mock.calls.map(([nombre]) => nombre)).toEqual([EVENTS.ORDEN_CREADA]);
  });
});
