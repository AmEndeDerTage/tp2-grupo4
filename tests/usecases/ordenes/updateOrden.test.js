import { describe, it, expect } from "vitest";
import { crearEscenario, estado, unActivo, unaOrden } from "../../helpers/escenario.js";
import EVENTS from "../../../events/eventNames.js";

// updateOrden: las mismas reglas que el alta, pero sin contar la propia orden (si no, se compararía consigo misma),
// y la regla 7: una orden ejecutada es historia.

describe("updateOrden — camino feliz", () => {
  it("cambia solo lo pedido y devuelve la orden con su activo anidado, sin emitir nada", async () => {
    const esc = crearEscenario({ activos: [unActivo()], ordenes: [unaOrden({ sentido: "venta", cantidad: 10, precioLimite: 70 })] });

    const actualizada = await esc.ordenes.updateOrden(1, { validaHasta: "2027-01-15", motivo: "Se estira el plazo" });

    expect(actualizada).toMatchObject({ id: 1, cantidad: 10, precioLimite: 70, validaHasta: "2027-01-15", motivo: "Se estira el plazo", activo: { id: 1, ticker: "KO" } });
    expect(esc.events.emit).not.toHaveBeenCalled(); // orden.creada es solo del alta
  });

  it("una orden que no existe → null (el 404 lo decide el controlador)", async () => {
    const esc = crearEscenario({ activos: [unActivo()] });
    await expect(esc.ordenes.updateOrden(99, { cantidad: 1 })).resolves.toBeNull();
  });
});

describe("regla 7 al editar — una orden ejecutada no se modifica", () => {
  it("→ 409 ORDEN_NO_MODIFICABLE y el estado no cambió", async () => {
    const esc = crearEscenario({ activos: [unActivo()], ordenes: [unaOrden({ estado: "ejecutada" })] });
    const antes = await estado(esc);

    await expect(esc.ordenes.updateOrden(1, { motivo: "corrección" })).rejects.toMatchObject({ code: "ORDEN_NO_MODIFICABLE", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
  });
});

describe("regla 3 al editar — el precio nuevo no puede ser el de OTRA orden viva del mismo activo y sentido", () => {
  // Dos compras vivas de KO: la 1 a 50 y la 2 a 48
  const escenario = () =>
    crearEscenario({ activos: [unActivo({ cantidad: 0 })], ordenes: [unaOrden({ id: 1, precioLimite: 50 }), unaOrden({ id: 2, precioLimite: 48 })] });

  it("feliz: llevar la orden 2 a un precio libre", async () => {
    await expect(escenario().ordenes.updateOrden(2, { precioLimite: 49 })).resolves.toMatchObject({ precioLimite: 49 });
  });

  it("borde: «cambiar» el precio por el propio no choca consigo misma", async () => {
    await expect(escenario().ordenes.updateOrden(2, { precioLimite: 48, motivo: "igual" })).resolves.toMatchObject({ precioLimite: 48 });
  });

  it("la viola: llevar la orden 2 al precio de la 1 → 409 ORDEN_DUPLICADA y el estado no cambió", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    await expect(esc.ordenes.updateOrden(2, { precioLimite: 50 })).rejects.toMatchObject({ code: "ORDEN_DUPLICADA", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
  });
});

describe("regla 5 al editar — la venta no puede superar lo disponible, sin contar la propia orden", () => {
  // 40 en cartera; ventas vivas: la 1 de 10 y la 2 de 10. Para la 2 hay 40 − 10 (la otra) = 30 disponibles
  const escenario = () =>
    crearEscenario({
      activos: [unActivo({ cantidad: 40 })],
      ordenes: [unaOrden({ id: 1, sentido: "venta", cantidad: 10, precioLimite: 70 }), unaOrden({ id: 2, sentido: "venta", cantidad: 10, precioLimite: 72 })],
    });

  it("borde: subir la orden 2 a exactamente 30", async () => {
    await expect(escenario().ordenes.updateOrden(2, { cantidad: 30 })).resolves.toMatchObject({ cantidad: 30 });
  });

  it("la viola: subirla a 31 → 409 CANTIDAD_INSUFICIENTE y el estado no cambió", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    await expect(esc.ordenes.updateOrden(2, { cantidad: 31 })).rejects.toMatchObject({ code: "CANTIDAD_INSUFICIENTE", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
  });
});

describe("regla 6 al editar — la compra no puede pasar el tope, sin contar la propia orden", () => {
  // Tope 30, nada en cartera; compras vivas: la 1 de 10 y la 2 de 5. Para la 2 entran 30 − 10 (la otra) = 20
  const escenario = (topeCercaPct) =>
    crearEscenario({
      activos: [unActivo({ nivel: "L2", cantidad: 0, topeCedears: 30 })],
      ordenes: [unaOrden({ id: 1, cantidad: 10, precioLimite: 12 }), unaOrden({ id: 2, cantidad: 5, precioLimite: 11 })],
      topeCercaPct,
    });

  it("borde: subir la orden 2 a exactamente 20 (y avisa el tope: 30 de 30)", async () => {
    const esc = escenario(90);
    await expect(esc.ordenes.updateOrden(2, { cantidad: 20 })).resolves.toMatchObject({ cantidad: 20 });
    expect(esc.events.emit).toHaveBeenCalledTimes(1);
    expect(esc.events.emit).toHaveBeenCalledWith(EVENTS.ACTIVO_TOPE_CERCA, expect.objectContaining({ ticker: "KO", comprometido: 30, topeCedears: 30, pct: 100 }));
  });

  it("la viola: subirla a 21 → 409 TOPE_EXCEDIDO, el estado no cambió y no avisa", async () => {
    const esc = escenario(90);
    const antes = await estado(esc);

    await expect(esc.ordenes.updateOrden(2, { cantidad: 21 })).rejects.toMatchObject({ code: "TOPE_EXCEDIDO", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
    expect(esc.events.emit).not.toHaveBeenCalled();
  });

  it("editar solo el precio de una compra no vuelve a avisar, aunque el activo esté sobre el umbral", async () => {
    const esc = escenario(1);
    await esc.ordenes.updateOrden(2, { precioLimite: 11.5 });
    expect(esc.events.emit).not.toHaveBeenCalled();
  });
});
