import { describe, it, expect, vi } from "vitest";
import { crearEscenario, estado, unActivo, unaOrden } from "../../helpers/escenario.js";
import EVENTS from "../../../events/eventNames.js";

// ejecutarOrden: la orden pasa a "ejecutada" y la cartera se mueve, todo junto o nada (la operación atómica del extra).

describe("ejecutarOrden — camino feliz", () => {
  it("una compra viva sobre un L2: orden ejecutada, cartera + cantidad, nivel L3 y orden.ejecutada con el antes y el después", async () => {
    const esc = crearEscenario({
      activos: [unActivo({ id: 2, ticker: "AAPL", nivel: "L2", cantidad: 0, topeCedears: 30 })],
      ordenes: [unaOrden({ id: 3, activoId: 2, sentido: "compra", cantidad: 10, precioLimite: 12.5 })],
    });

    const ejecutada = await esc.ordenes.ejecutarOrden(3);

    expect(ejecutada).toMatchObject({ id: 3, estado: "ejecutada", activo: { id: 2, ticker: "AAPL" } });
    expect(await esc.dao.activos.getById(2)).toMatchObject({ cantidad: 10, nivel: "L3" });
    expect(esc.events.emit).toHaveBeenCalledTimes(1); // ni orden.creada ni activo.topeCerca: lo comprometido no sube
    expect(esc.events.emit).toHaveBeenCalledWith(EVENTS.ORDEN_EJECUTADA, {
      id: 3,
      ticker: "AAPL",
      sentido: "compra",
      cantidad: 10,
      precioLimite: 12.5,
      carteraAntes: 0,
      carteraDespues: 10,
      nivelAntes: "L2",
      nivelDespues: "L3",
    });
  });

  it("borde: una venta que deja un L3 en 0 lo devuelve a L2", async () => {
    const esc = crearEscenario({ activos: [unActivo({ nivel: "L3", cantidad: 30 })], ordenes: [unaOrden({ sentido: "venta", cantidad: 30 })] });

    await esc.ordenes.ejecutarOrden(1);

    expect(await esc.dao.activos.getById(1)).toMatchObject({ cantidad: 0, nivel: "L2" });
    expect(esc.events.emit).toHaveBeenCalledWith(EVENTS.ORDEN_EJECUTADA, expect.objectContaining({ carteraAntes: 30, carteraDespues: 0, nivelAntes: "L3", nivelDespues: "L2" }));
  });

  it("una orden que no existe → null (el 404 lo decide el controlador)", async () => {
    const esc = crearEscenario({ activos: [unActivo()] });
    await expect(esc.ordenes.ejecutarOrden(99)).resolves.toBeNull();
    expect(esc.events.emit).not.toHaveBeenCalled();
  });
});

describe("regla 7 — una orden ejecutada no se vuelve a ejecutar", () => {
  it("→ 409 ORDEN_NO_MODIFICABLE y la cartera no se mueve dos veces", async () => {
    const esc = crearEscenario({ activos: [unActivo({ cantidad: 40 })], ordenes: [unaOrden({ estado: "ejecutada", cantidad: 40 })] });
    const antes = await estado(esc);

    await expect(esc.ordenes.ejecutarOrden(1)).rejects.toMatchObject({ code: "ORDEN_NO_MODIFICABLE", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
    expect(esc.events.emit).not.toHaveBeenCalled();
  });
});

describe("regla 5 al ejecutar — lo que se vende tiene que estar en cartera (D11)", () => {
  // Por HTTP este estado ya no se puede armar (desde D3, la cartera no baja de lo comprometido en ventas vivas);
  // acá se carga directo en el DAO en memoria para probar que la regla sigue en pie.
  it("vender 10 con 5 en cartera → 409 CANTIDAD_INSUFICIENTE y el estado no cambió", async () => {
    const esc = crearEscenario({ activos: [unActivo({ cantidad: 5 })], ordenes: [unaOrden({ sentido: "venta", cantidad: 10 })] });
    const antes = await estado(esc);

    await expect(esc.ordenes.ejecutarOrden(1)).rejects.toMatchObject({ code: "CANTIDAD_INSUFICIENTE", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
    expect(esc.events.emit).not.toHaveBeenCalled();
  });
});

describe("si la escritura falla a mitad, no queda nada (D11, con un DAO que falla)", () => {
  const escenario = () =>
    crearEscenario({ activos: [unActivo({ nivel: "L2", cantidad: 0 })], ordenes: [unaOrden({ sentido: "compra", cantidad: 10 })] });

  it("segunda barrera: si mover la cartera no encuentra fila, la orden vuelve a viva y el error llega al caso de uso (500)", async () => {
    const esc = escenario();
    const antes = await estado(esc);
    // El UPDATE condicional de la cartera «no encuentra fila»: el DAO de Órdenes ya marcó la orden y tiene que deshacerlo
    vi.spyOn(esc.dao.activos, "ajustarCantidad").mockResolvedValue(null);

    await expect(esc.ordenes.ejecutarOrden(1)).rejects.toThrow("No se pudo mover la cartera");
    expect(await estado(esc)).toEqual(antes); // la orden sigue viva y la cartera en 0
    expect(esc.events.emit).not.toHaveBeenCalled(); // no se anuncia lo que no pasó
  });

  it("si el DAO lanza (p. ej. se cayó la base), el error sube tal cual y no se emite orden.ejecutada", async () => {
    const esc = escenario();
    vi.spyOn(esc.dao.ordenes, "ejecutar").mockRejectedValue(new Error("se cayó la base"));

    await expect(esc.ordenes.ejecutarOrden(1)).rejects.toThrow("se cayó la base");
    expect(esc.events.emit).not.toHaveBeenCalled();
  });
});
