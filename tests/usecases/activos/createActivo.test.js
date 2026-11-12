import { describe, it, expect } from "vitest";
import { crearEscenario, estado, unActivo } from "../../helpers/escenario.js";

// createActivo: con etiquetaIds es la operación atómica de la N:N (el activo y sus vínculos, todo o nada).

const etiquetas = [
  { id: 1, nombre: "dividendos" },
  { id: 2, nombre: "tecnologia" },
  { id: 3, nombre: "defensivo" },
];
// Lo que llega del body ya validado por Zod para POST /activos
const alta = (campos = {}) => ({ ticker: "PG", nombre: "Procter & Gamble", mercado: "NYSE", ratio: 15, nivel: "L1", cantidad: 0, topeCedears: 20, ...campos });
const escenario = () => crearEscenario({ activos: [unActivo({ id: 1, ticker: "KO" })], etiquetas });

describe("createActivo — camino feliz", () => {
  it("sin etiquetaIds: id siguiente y etiquetas vacías", async () => {
    const esc = escenario();
    await expect(esc.activos.createActivo(alta())).resolves.toMatchObject({ id: 2, ticker: "PG", etiquetas: [] });
  });

  it("con etiquetaIds: el activo y sus vínculos quedan juntos, con las etiquetas anidadas por id", async () => {
    const esc = escenario();

    const creado = await esc.activos.createActivo(alta({ etiquetaIds: [3, 1] }));

    expect(creado.etiquetas).toEqual([
      { id: 1, nombre: "dividendos" },
      { id: 3, nombre: "defensivo" },
    ]);
    expect(await esc.dao.activos.getById(creado.id)).toEqual(creado);
  });
});

describe("regla 2 — el ticker es único", () => {
  it("un ticker que ya existe → 409 TICKER_DUPLICADO y el estado no cambió", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    await expect(esc.activos.createActivo(alta({ ticker: "KO" }))).rejects.toMatchObject({ code: "TICKER_DUPLICADO", statusCode: 409 });
    expect(await estado(esc)).toEqual(antes);
  });

  it("es lo primero que se mira: con ticker repetido y una etiqueta inexistente, responde TICKER_DUPLICADO", async () => {
    const esc = escenario();
    await expect(esc.activos.createActivo(alta({ ticker: "KO", etiquetaIds: [999] }))).rejects.toMatchObject({ code: "TICKER_DUPLICADO" });
  });
});

describe("todo o nada (D13) — todas las etiquetas tienen que existir", () => {
  it("con dos etiquetas inexistentes → 404 ETIQUETA_NO_ENCONTRADA que informa las dos, y no queda nada", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    await expect(esc.activos.createActivo(alta({ etiquetaIds: [1, 998, 999] }))).rejects.toMatchObject({
      code: "ETIQUETA_NO_ENCONTRADA",
      statusCode: 404,
      details: [
        { field: "etiquetaIds", message: "No existe una etiqueta con id 998" },
        { field: "etiquetaIds", message: "No existe una etiqueta con id 999" },
      ],
    });
    expect(await estado(esc)).toEqual(antes); // ni el activo ni el vínculo con la etiqueta 1, que sí existía
  });

  it("el alta rechazada no gasta un id: la siguiente recibe el que le tocaba", async () => {
    const esc = escenario();
    await expect(esc.activos.createActivo(alta({ etiquetaIds: [999] }))).rejects.toMatchObject({ code: "ETIQUETA_NO_ENCONTRADA" });

    await expect(esc.activos.createActivo(alta())).resolves.toMatchObject({ id: 2 });
  });

  it("segunda barrera (C8): si la regla se salteara, el DAO en memoria tampoco escribe nada, como la clave foránea de la base", async () => {
    const esc = escenario();
    const antes = await estado(esc);

    // Se llama al DAO directo, sin pasar por el caso de uso que verifica las etiquetas
    await expect(esc.dao.activos.save(alta({ etiquetaIds: [1, 999] }))).rejects.toThrow("clave foránea");
    expect(await estado(esc)).toEqual(antes);
  });
});
