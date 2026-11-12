import { describe, it, expect } from "vitest";
import { crearEscenario, estado, unActivo } from "../../helpers/escenario.js";

// Los vínculos de la N:N Activo–Etiqueta: asignar, consultar y quitar (POST, GET y DELETE /activos/:id/etiquetas/:etiquetaId).

// AAPL tiene «tecnologia»; «dividendos» existe y no la tiene
const escenario = () =>
  crearEscenario({
    activos: [unActivo({ id: 2, ticker: "AAPL" })],
    etiquetas: [
      { id: 1, nombre: "dividendos" },
      { id: 2, nombre: "tecnologia" },
    ],
    vinculos: [{ activoId: 2, etiquetaId: 2 }],
  });

describe("asignarEtiqueta", () => {
  it("feliz: crea el vínculo y devuelve las etiquetas del activo, ordenadas por id", async () => {
    const esc = escenario();
    await expect(esc.activos.asignarEtiqueta(2, 1)).resolves.toEqual([
      { id: 1, nombre: "dividendos" },
      { id: 2, nombre: "tecnologia" },
    ]);
    expect(await esc.dao.activos.tieneEtiqueta(2, 1)).toBe(true);
  });

  it("la que ya tiene → 409 ETIQUETA_YA_ASIGNADA y el estado no cambió", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    await expect(esc.activos.asignarEtiqueta(2, 2)).rejects.toMatchObject({ code: "ETIQUETA_YA_ASIGNADA", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
  });

  it("una etiqueta que no existe → 404 ETIQUETA_NO_ENCONTRADA; un activo que no existe → null", async () => {
    const esc = escenario();
    await expect(esc.activos.asignarEtiqueta(2, 99)).rejects.toMatchObject({ code: "ETIQUETA_NO_ENCONTRADA", statusCode: 404 });
    await expect(esc.activos.asignarEtiqueta(99, 1)).resolves.toBeNull();
  });
});

describe("getEtiquetaDeActivo (la URL del Location al asignar)", () => {
  it("si el activo tiene la etiqueta, la devuelve", async () => {
    await expect(escenario().activos.getEtiquetaDeActivo(2, 2)).resolves.toEqual({ id: 2, nombre: "tecnologia" });
  });

  it("si no la tiene → 404 ETIQUETA_NO_ASIGNADA; si la etiqueta no existe → 404 ETIQUETA_NO_ENCONTRADA; sin activo → null", async () => {
    const esc = escenario();
    await expect(esc.activos.getEtiquetaDeActivo(2, 1)).rejects.toMatchObject({ code: "ETIQUETA_NO_ASIGNADA", statusCode: 404 });
    await expect(esc.activos.getEtiquetaDeActivo(2, 99)).rejects.toMatchObject({ code: "ETIQUETA_NO_ENCONTRADA", statusCode: 404 });
    await expect(esc.activos.getEtiquetaDeActivo(99, 2)).resolves.toBeNull();
  });
});

describe("quitarEtiqueta", () => {
  it("feliz: borra el vínculo; la etiqueta sigue existiendo", async () => {
    const esc = escenario();
    await expect(esc.activos.quitarEtiqueta(2, 2)).resolves.toBe(true);
    expect(await esc.dao.activos.getEtiquetas(2)).toEqual([]);
    expect(await esc.dao.etiquetas.getById(2)).toEqual({ id: 2, nombre: "tecnologia" });
  });

  it("una que no tiene → 404 ETIQUETA_NO_ASIGNADA y el estado no cambió", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    await expect(esc.activos.quitarEtiqueta(2, 1)).rejects.toMatchObject({ code: "ETIQUETA_NO_ASIGNADA", statusCode: 404 });
    expect(await estado(esc)).toEqual(antes);
  });

  it("una etiqueta que no existe → 404 ETIQUETA_NO_ENCONTRADA (se mira antes que el vínculo)", async () => {
    await expect(escenario().activos.quitarEtiqueta(2, 99)).rejects.toMatchObject({ code: "ETIQUETA_NO_ENCONTRADA" });
  });
});

describe("deleteEtiqueta — borrar una etiqueta en uso la saca de todos los activos (no es la regla 8)", () => {
  it("se borra la etiqueta y desaparece de los dos activos que la tenían", async () => {
    const esc = crearEscenario({
      activos: [unActivo({ id: 1, ticker: "KO" }), unActivo({ id: 3, ticker: "PG" })],
      etiquetas: [
        { id: 1, nombre: "dividendos" },
        { id: 3, nombre: "defensivo" },
      ],
      vinculos: [
        { activoId: 1, etiquetaId: 1 },
        { activoId: 1, etiquetaId: 3 },
        { activoId: 3, etiquetaId: 3 },
      ],
    });

    await expect(esc.etiquetas.deleteEtiqueta(3)).resolves.toBe(true);
    expect(await esc.dao.etiquetas.getById(3)).toBeNull();
    expect(await esc.dao.activos.getEtiquetas(1)).toEqual([{ id: 1, nombre: "dividendos" }]);
    expect(await esc.dao.activos.getEtiquetas(3)).toEqual([]);
    // Los vínculos se borraron de verdad (no solo dejan de verse): sin esto quedarían colgados, como sin el CASCADE de la base
    expect(await esc.dao.activos.tieneEtiqueta(1, 3)).toBe(false);
    expect(await esc.dao.activos.tieneEtiqueta(3, 3)).toBe(false);
  });
});
