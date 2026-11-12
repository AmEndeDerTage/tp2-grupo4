import { describe, it, expect } from "vitest";
import { crearEscenario, estado, unActivo, unaOrden } from "../../helpers/escenario.js";
import EVENTS from "../../../events/eventNames.js";

// updateActivo: regla 2 y las reglas 5 y 6 vistas desde el activo (D3), más el aviso de tope al editar (D6).

describe("regla 2 al editar — el ticker no puede ser el de otro activo", () => {
  const escenario = () => crearEscenario({ activos: [unActivo({ id: 1, ticker: "KO" }), unActivo({ id: 2, ticker: "AAPL" })] });

  it("la viola: ponerle a AAPL el ticker KO → 409 TICKER_DUPLICADO y el estado no cambió", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    await expect(esc.activos.updateActivo(2, { ticker: "KO" })).rejects.toMatchObject({ code: "TICKER_DUPLICADO", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
  });

  it("borde: «cambiar» el ticker por el propio no choca consigo mismo", async () => {
    await expect(escenario().activos.updateActivo(2, { ticker: "AAPL", nombre: "Apple Inc." })).resolves.toMatchObject({ ticker: "AAPL", nombre: "Apple Inc." });
  });

  it("un activo que no existe → null", async () => {
    await expect(escenario().activos.updateActivo(99, { nombre: "X" })).resolves.toBeNull();
  });
});

describe("reglas 5 y 6 desde el activo (D3) — lo comprometido en órdenes vivas tiene que seguir entrando", () => {
  // 40 en cartera y tope 100; una venta viva de 10 y una compra viva de 20
  const escenario = () =>
    crearEscenario({
      activos: [unActivo({ cantidad: 40, topeCedears: 100 })],
      ordenes: [unaOrden({ id: 1, sentido: "venta", cantidad: 10, precioLimite: 70 }), unaOrden({ id: 2, sentido: "compra", cantidad: 20, precioLimite: 50 })],
    });

  it("regla 5, borde: la cartera puede bajar hasta lo que hay en ventas vivas (10)", async () => {
    await expect(escenario().activos.updateActivo(1, { cantidad: 10 })).resolves.toMatchObject({ cantidad: 10 });
  });

  it("regla 5, la viola: bajar la cartera a 9 con 10 en ventas vivas → 409 CANTIDAD_INSUFICIENTE y el estado no cambió", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    await expect(esc.activos.updateActivo(1, { cantidad: 9 })).rejects.toMatchObject({ code: "CANTIDAD_INSUFICIENTE", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
  });

  it("regla 6, borde: el tope puede bajar hasta lo comprometido (40 en cartera + 20 en compras = 60)", async () => {
    await expect(escenario().activos.updateActivo(1, { topeCedears: 60 })).resolves.toMatchObject({ topeCedears: 60 });
  });

  it("regla 6, la viola: bajar el tope a 59 → 409 TOPE_EXCEDIDO y el estado no cambió", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    await expect(esc.activos.updateActivo(1, { topeCedears: 59 })).rejects.toMatchObject({ code: "TOPE_EXCEDIDO", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
  });
});

describe("activo.topeCerca al editar (D6) — con el umbral inyectado", () => {
  // AAPL: 10 en cartera y 20 en compras vivas = 30 comprometidos
  const escenario = (topeCercaPct) =>
    crearEscenario({
      activos: [unActivo({ id: 2, ticker: "AAPL", nivel: "L3", cantidad: 10, topeCedears: 30 })],
      ordenes: [unaOrden({ activoId: 2, sentido: "compra", cantidad: 20 })],
      topeCercaPct,
    });

  it("subir el tope a 32 deja 30 de 32 (93,8 %): con umbral 90 avisa", async () => {
    const esc = escenario(90);
    await esc.activos.updateActivo(2, { topeCedears: 32 });
    expect(esc.events.emit).toHaveBeenCalledWith(EVENTS.ACTIVO_TOPE_CERCA, {
      activoId: 2,
      ticker: "AAPL",
      cartera: 10,
      enComprasVivas: 20,
      comprometido: 30,
      topeCedears: 32,
      pct: 93.8,
      umbralPct: 90,
    });
  });

  it("el mismo cambio con umbral 95 no avisa", async () => {
    const esc = escenario(95);
    await esc.activos.updateActivo(2, { topeCedears: 32 });
    expect(esc.events.emit).not.toHaveBeenCalled();
  });

  it("cambiar solo el nombre no vuelve a avisar, aunque el activo esté sobre el umbral", async () => {
    const esc = escenario(90);
    await esc.activos.updateActivo(2, { nombre: "Apple Inc." });
    expect(esc.events.emit).not.toHaveBeenCalled();
  });
});
