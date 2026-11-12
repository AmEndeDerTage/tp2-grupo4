import { describe, it, expect } from "vitest";
import { evaluarTopeCerca, nivelTrasEjecucion } from "../../../usecases/ordenes/reglasOrden.js";

// Funciones puras de usecases/ordenes/reglasOrden.js: reciben todo por parámetro y no leen nada,
// así que se prueban sin DAO, sin bus y sin configuración.

describe("evaluarTopeCerca (cuándo avisar activo.topeCerca)", () => {
  const aapl = { id: 2, ticker: "AAPL", cantidad: 0, topeCedears: 30 };
  const comprasVivas = [{ cantidad: 10 }];

  it("por debajo del umbral no avisa: 10 vivas + 5 nuevas = 15 de 30 (50 %)", () => {
    expect(evaluarTopeCerca(aapl, comprasVivas, 5, 90)).toBeNull();
  });

  it("borde: justo en el umbral avisa, con el payload completo (10 + 17 = 27 de 30, 90 %)", () => {
    expect(evaluarTopeCerca(aapl, comprasVivas, 17, 90)).toEqual({
      activoId: 2,
      ticker: "AAPL",
      cartera: 0,
      enComprasVivas: 27,
      comprometido: 27,
      topeCedears: 30,
      pct: 90,
      umbralPct: 90,
    });
  });

  it("borde: un CEDEAR menos que el umbral no avisa (26 de 30, 86,7 %)", () => {
    expect(evaluarTopeCerca(aapl, comprasVivas, 16, 90)).toBeNull();
  });

  it("cuenta la cartera, no solo las compras vivas (25 en cartera + 2 = 27 de 30)", () => {
    const conCartera = { ...aapl, cantidad: 25 };
    expect(evaluarTopeCerca(conCartera, [], 2, 90)).toMatchObject({ cartera: 25, enComprasVivas: 2, comprometido: 27 });
  });

  it("el umbral es un parámetro: con 50 avisa lo mismo que con 90 no (15 de 30)", () => {
    // Es lo que hace posible que el container inyecte TOPE_CERCA_PCT (topeCercaPct) en vez de leerlo acá
    expect(evaluarTopeCerca(aapl, comprasVivas, 5, 50)).toMatchObject({ comprometido: 15, pct: 50, umbralPct: 50 });
  });

  it("el porcentaje se redondea a un decimal (28 de 30 → 93,3)", () => {
    expect(evaluarTopeCerca(aapl, comprasVivas, 18, 90).pct).toBe(93.3);
  });
});

describe("nivelTrasEjecucion (el nivel sigue a la posición)", () => {
  const compra = (cantidad) => ({ sentido: "compra", cantidad });
  const venta = (cantidad) => ({ sentido: "venta", cantidad });

  it("una compra lleva a L3 desde L2 y también desde L1", () => {
    expect(nivelTrasEjecucion({ nivel: "L2", cantidad: 0 }, compra(5))).toBe("L3");
    expect(nivelTrasEjecucion({ nivel: "L1", cantidad: 0 }, compra(5))).toBe("L3");
  });

  it("una compra sobre un L3 no cambia el nivel", () => {
    expect(nivelTrasEjecucion({ nivel: "L3", cantidad: 40 }, compra(5))).toBeUndefined();
  });

  it("borde: una venta que deja un L3 en 0 lo vuelve a L2", () => {
    expect(nivelTrasEjecucion({ nivel: "L3", cantidad: 40 }, venta(40))).toBe("L2");
  });

  it("una venta parcial deja el L3 como está", () => {
    expect(nivelTrasEjecucion({ nivel: "L3", cantidad: 40 }, venta(39))).toBeUndefined();
  });
});
