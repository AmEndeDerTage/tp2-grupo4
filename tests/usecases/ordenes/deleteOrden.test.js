import { describe, it, expect } from "vitest";
import { crearEscenario, estado, unActivo, unaOrden } from "../../helpers/escenario.js";

// deleteOrden: borrar una orden viva es la forma de cancelarla; una ejecutada es historia (regla 7).

describe("deleteOrden", () => {
  it("feliz: una orden viva se borra y deja de existir; la cartera no se toca", async () => {
    const esc = crearEscenario({ activos: [unActivo({ cantidad: 40 })], ordenes: [unaOrden({ sentido: "venta", cantidad: 10 })] });

    await expect(esc.ordenes.deleteOrden(1)).resolves.toBe(true);

    expect(await esc.dao.ordenes.getById(1)).toBeNull();
    expect(await esc.dao.activos.getById(1)).toMatchObject({ cantidad: 40 });
    expect(esc.events.emit).not.toHaveBeenCalled();
  });

  it("regla 7: una orden ejecutada → 409 ORDEN_NO_MODIFICABLE y el estado no cambió", async () => {
    const esc = crearEscenario({ activos: [unActivo()], ordenes: [unaOrden({ estado: "ejecutada" })] });
    const antes = await estado(esc);

    await expect(esc.ordenes.deleteOrden(1)).rejects.toMatchObject({ code: "ORDEN_NO_MODIFICABLE", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
  });

  it("una orden que no existe → false (el 404 lo decide el controlador)", async () => {
    const esc = crearEscenario({ activos: [unActivo()] });
    await expect(esc.ordenes.deleteOrden(99)).resolves.toBe(false);
  });
});
