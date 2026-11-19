import { describe, it, expect } from "vitest";
import { esTextoLimpio, enteroPositivoDeTexto, MAX_CANTIDAD, MAX_PRECIO } from "../../schemas/comunes.js";
import { createActivoSchema, activoIdParamSchema, queryActivosSchema } from "../../schemas/activoSchema.js";
import { createOrdenSchema } from "../../schemas/ordenSchema.js";

// Validación de forma compartida por los tres schemas: qué texto y qué números se aceptan, vengan de donde vengan.
const activo = { ticker: "KO", nombre: "Coca-Cola", mercado: "NYSE", ratio: 5, nivel: "L2", topeCedears: 100 };
const orden = { activoId: 1, sentido: "venta", cantidad: 10, precioLimite: 70, validaHasta: "2030-12-31" };
const acepta = (schema, dato) => schema.safeParse(dato).success;

describe("esTextoLimpio", () => {
  it.each(["Coca-Cola", "Compañía Ñandú & Cía.", "McDonald's (EE. UU.) — 100 %", "con emoji 🚀", "日本語"])("acepta «%s»", (texto) => {
    expect(esTextoLimpio(texto)).toBe(true);
  });

  it.each([
    ["byte nulo", "a\u0000b"],
    ["escape de terminal", "\u001b[31mrojo"],
    ["salto de línea", "línea 1\nlínea 2"],
    ["tabulación", "a\tb"],
    ["espacio de ancho cero", "Co​ca"],
    ["marca que invierte el sentido de lectura", "Co‮aloC"],
    ["medio par sustituto (texto mal formado)", "a\ud800b"],
  ])("rechaza un texto con %s", (_caso, texto) => {
    expect(esTextoLimpio(texto)).toBe(false);
  });
});

describe("enteroPositivoDeTexto — los números que llegan como texto en la URL", () => {
  const schema = enteroPositivoDeTexto("El id");

  it.each([["1", 1], ["01", 1], ["42", 42], ["999999999999999", 999999999999999]])("«%s» → %d", (texto, numero) => {
    expect(schema.parse(texto)).toBe(numero);
  });

  it.each(["0", "-1", "abc", "", " 1", "1 ", "+1", "1.0", "1e2", "0x10", "１", "9999999999999999", "1 OR 1=1"])("rechaza «%s»", (texto) => {
    expect(acepta(schema, texto)).toBe(false);
  });

  it("rechaza lo que no es un texto: un parámetro repetido llega como lista", () => {
    expect(acepta(schema, ["1", "2"])).toBe(false);
    expect(acepta(schema, 1)).toBe(false);
  });
});

describe("los schemas usan esas piezas", () => {
  it("el id de la URL y la paginación solo aceptan dígitos; page y limit conservan sus valores por defecto", () => {
    expect(acepta(activoIdParamSchema, { id: "0x1" })).toBe(false);
    expect(activoIdParamSchema.parse({ id: "7" })).toEqual({ id: 7 });
    expect(queryActivosSchema.parse({})).toMatchObject({ page: 1, limit: 20 });
    expect(queryActivosSchema.parse({ page: "2", limit: "100" })).toMatchObject({ page: 2, limit: 100 });
    expect(acepta(queryActivosSchema, { limit: "101" })).toBe(false);
    expect(acepta(queryActivosSchema, { limit: "1e2" })).toBe(false);
  });

  it("nombre del activo: hasta 100 caracteres, limpio", () => {
    expect(acepta(createActivoSchema, { ...activo, nombre: "A".repeat(100) })).toBe(true);
    expect(acepta(createActivoSchema, { ...activo, nombre: "A".repeat(101) })).toBe(false);
    expect(acepta(createActivoSchema, { ...activo, nombre: "a\u0000b" })).toBe(false);
  });

  it("motivo de la orden: limpio", () => {
    expect(acepta(createOrdenSchema, { ...orden, motivo: "Toma de ganancia: +12 %" })).toBe(true);
    expect(acepta(createOrdenSchema, { ...orden, motivo: "x\r\nAVISO FALSO" })).toBe(false);
  });

  it("topes de cordura: borde aceptado, uno más rechazado", () => {
    expect(acepta(createOrdenSchema, { ...orden, cantidad: MAX_CANTIDAD, precioLimite: MAX_PRECIO })).toBe(true);
    expect(acepta(createOrdenSchema, { ...orden, cantidad: MAX_CANTIDAD + 1 })).toBe(false);
    expect(acepta(createOrdenSchema, { ...orden, precioLimite: 1e308 })).toBe(false);
    expect(acepta(createActivoSchema, { ...activo, topeCedears: MAX_CANTIDAD + 1 })).toBe(false);
    expect(acepta(createActivoSchema, { ...activo, cantidad: MAX_CANTIDAD, topeCedears: MAX_CANTIDAD })).toBe(true);
    expect(acepta(createActivoSchema, { ...activo, ratio: 1e7 })).toBe(false);
  });
});
