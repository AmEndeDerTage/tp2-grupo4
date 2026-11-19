import { describe, it, expect } from "vitest";
import { crearEscenario, estado } from "../../helpers/escenario.js";

// createEtiqueta y updateEtiqueta: el nombre de una etiqueta es único (como el ticker de un activo, regla 2).
// Borrar una etiqueta en uso se prueba junto con los vínculos, en tests/usecases/activos/etiquetasDeActivo.test.js.

const escenario = () =>
  crearEscenario({
    etiquetas: [
      { id: 1, nombre: "dividendos" },
      { id: 2, nombre: "tecnologia" },
    ],
  });

describe("createEtiqueta — el nombre es único", () => {
  it("feliz: un nombre nuevo recibe el id siguiente", async () => {
    await expect(escenario().etiquetas.createEtiqueta({ nombre: "defensivo" })).resolves.toEqual({ id: 3, nombre: "defensivo" });
  });

  it("la viola: un nombre que ya existe → 409 ETIQUETA_DUPLICADA y el estado no cambió", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    await expect(esc.etiquetas.createEtiqueta({ nombre: "dividendos" })).rejects.toMatchObject({ code: "ETIQUETA_DUPLICADA", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
  });
});

describe("updateEtiqueta — renombrar sin chocar con otra", () => {
  it("feliz: se renombra y conserva el id", async () => {
    await expect(escenario().etiquetas.updateEtiqueta(2, { nombre: "tech" })).resolves.toEqual({ id: 2, nombre: "tech" });
  });

  it("borde: «renombrarla» con su propio nombre no choca consigo misma", async () => {
    await expect(escenario().etiquetas.updateEtiqueta(2, { nombre: "tecnologia" })).resolves.toEqual({ id: 2, nombre: "tecnologia" });
  });

  it("la viola: el nombre de OTRA etiqueta → 409 ETIQUETA_DUPLICADA y el estado no cambió", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    await expect(esc.etiquetas.updateEtiqueta(2, { nombre: "dividendos" })).rejects.toMatchObject({ code: "ETIQUETA_DUPLICADA", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
  });

  it("que exista se mira antes que la regla: una etiqueta inexistente con el nombre de otra → null (404), no ETIQUETA_DUPLICADA", async () => {
    await expect(escenario().etiquetas.updateEtiqueta(99, { nombre: "dividendos" })).resolves.toBeNull();
  });
});
