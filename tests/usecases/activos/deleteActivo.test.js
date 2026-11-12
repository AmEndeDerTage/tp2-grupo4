import { describe, it, expect } from "vitest";
import { crearEscenario, estado, unActivo, unaOrden } from "../../helpers/escenario.js";

// deleteActivo, regla 8: no se borra un activo con órdenes, vivas o ejecutadas (el historial no queda huérfano).

describe("regla 8 — no se borra un activo con órdenes", () => {
  it("feliz: un activo sin órdenes se borra y se lleva sus vínculos (las etiquetas siguen existiendo)", async () => {
    const esc = crearEscenario({
      activos: [unActivo({ id: 3, ticker: "GGAL" })],
      etiquetas: [{ id: 4, nombre: "argentina" }],
      vinculos: [{ activoId: 3, etiquetaId: 4 }],
    });

    await expect(esc.activos.deleteActivo(3)).resolves.toBe(true);
    expect(await esc.dao.activos.getById(3)).toBeNull();
    expect(await esc.dao.activos.getEtiquetas(3)).toEqual([]);
    expect(await esc.dao.etiquetas.getById(4)).toEqual({ id: 4, nombre: "argentina" });
  });

  it("la viola: con una orden viva → 409 ACTIVO_CON_ORDENES y el estado no cambió", async () => {
    const esc = crearEscenario({ activos: [unActivo()], ordenes: [unaOrden()] });
    const antes = await estado(esc);

    await expect(esc.activos.deleteActivo(1)).rejects.toMatchObject({ code: "ACTIVO_CON_ORDENES", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
  });

  it("borde: con solo una orden ejecutada también es 409 (es historia, no se deja huérfana)", async () => {
    const esc = crearEscenario({ activos: [unActivo()], ordenes: [unaOrden({ estado: "ejecutada" })] });
    await expect(esc.activos.deleteActivo(1)).rejects.toMatchObject({ code: "ACTIVO_CON_ORDENES" });
    expect(await esc.dao.activos.getById(1)).not.toBeNull();
  });

  it("las órdenes de OTRO activo no cuentan", async () => {
    const esc = crearEscenario({ activos: [unActivo({ id: 1 }), unActivo({ id: 2, ticker: "AAPL" })], ordenes: [unaOrden({ activoId: 1 })] });
    await expect(esc.activos.deleteActivo(2)).resolves.toBe(true);
  });

  it("un activo que no existe → false (el 404 lo decide el controlador)", async () => {
    const esc = crearEscenario({ activos: [unActivo()] });
    await expect(esc.activos.deleteActivo(99)).resolves.toBe(false);
  });
});
