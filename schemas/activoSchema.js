import { z } from "zod";
import { nombreEtiqueta } from "./etiquetaSchema.js";

/**
 * Esquemas de validación de Activo (Zod).
 * Validan la FORMA del dato (tipos, rangos, enumeraciones). Las reglas de negocio
 * (p. ej. ticker único) no van acá: viven en los casos de uso.
 */

const MERCADOS = ["NYSE", "NASDAQ", "BYMA"];
const NIVELES = ["L0", "L1", "L2", "L3"];

// Columnas por las que se puede ordenar: el DAO las usa tal cual (en SQL van al ORDER BY)
const CAMPOS_ORDENABLES = ["id", "ticker", "nombre", "mercado", "ratio", "nivel", "cantidad", "topeCedears"];

// Cada campo se define una sola vez y se reutiliza en los esquemas de creación y de actualización
const campos = {
  ticker: z
    .string({ error: "El ticker es obligatorio y debe ser un texto" })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z][A-Z0-9.]{0,9}$/, "El ticker debe tener entre 1 y 10 caracteres: letras mayúsculas, dígitos o punto, empezando con letra"),
  nombre: z.string({ error: "El nombre es obligatorio y debe ser un texto" }).trim().min(1, "El nombre no puede estar vacío"),
  mercado: z.enum(MERCADOS, { error: `El mercado debe ser uno de: ${MERCADOS.join(", ")}` }),
  ratio: z.number({ error: "El ratio debe ser un número" }).positive("El ratio debe ser mayor a 0"),
  nivel: z.enum(NIVELES, { error: `El nivel debe ser uno de: ${NIVELES.join(", ")}` }),
  cantidad: z
    .number({ error: "La cantidad debe ser un número" })
    .int("La cantidad debe ser un número entero")
    .nonnegative("La cantidad no puede ser negativa"),
  topeCedears: z
    .number({ error: "El tope de CEDEARs debe ser un número" })
    .int("El tope de CEDEARs debe ser un número entero")
    .positive("El tope de CEDEARs debe ser mayor a 0"),
};

// POST /activos: todo obligatorio salvo cantidad (un activo puede darse de alta sin posición) y etiquetaIds.
// etiquetaIds: las etiquetas con las que nace el activo (la operación atómica de la N:N: activo + vínculos, todo o nada).
// Que no se repitan es una validación cruzada entre elementos del mismo pedido (refine, como en la clase 13): se decide
// mirando solo el pedido, así que es de forma (400). Que existan, en cambio, necesita consultar datos: caso de uso (404).
const createActivoSchema = z.object({
  ticker: campos.ticker,
  nombre: campos.nombre,
  mercado: campos.mercado,
  ratio: campos.ratio,
  nivel: campos.nivel,
  cantidad: campos.cantidad.default(0),
  topeCedears: campos.topeCedears,
  etiquetaIds: z
    .array(
      z.number({ error: "Cada etiqueta debe ser un id numérico" }).int("Cada etiqueta debe ser un id entero").positive("Cada etiqueta debe ser un id positivo"),
      { error: "etiquetaIds debe ser una lista de ids de etiquetas" }
    )
    .max(10, "Un activo puede nacer con hasta 10 etiquetas")
    .refine((ids) => new Set(ids).size === ids.length, { error: "Las etiquetas no pueden repetirse" })
    .optional(),
});

// PUT /activos/:id (actualización parcial): todo opcional y SIN defaults,
// así un PUT que solo trae { nivel } no pisa la cantidad con 0.
const updateActivoSchema = z
  .object({
    ticker: campos.ticker.optional(),
    nombre: campos.nombre.optional(),
    mercado: campos.mercado.optional(),
    ratio: campos.ratio.optional(),
    nivel: campos.nivel.optional(),
    cantidad: campos.cantidad.optional(),
    topeCedears: campos.topeCedears.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { error: "Hay que enviar al menos un campo para actualizar" });

// GET /activos: filtros, orden y paginación. Todo llega como texto en la URL, por eso z.coerce.
// `etiqueta` filtra por el nombre de una etiqueta (la N:N recorrida desde la etiqueta), normalizado como en su alta:
// ?etiqueta=Dividendos es lo mismo que ?etiqueta=dividendos.
const queryActivosSchema = z.object({
  nivel: campos.nivel.optional(),
  mercado: campos.mercado.optional(),
  etiqueta: nombreEtiqueta.optional(),
  sort: z
    .string()
    .regex(
      new RegExp(`^-?(${CAMPOS_ORDENABLES.join("|")})$`),
      `sort debe ser uno de: ${CAMPOS_ORDENABLES.join(", ")} (con '-' adelante para descendente)`
    )
    .optional(),
  page: z.coerce.number({ error: "page debe ser un número" }).int("page debe ser un entero").positive("page debe ser mayor a 0").default(1),
  limit: z.coerce
    .number({ error: "limit debe ser un número" })
    .int("limit debe ser un entero")
    .positive("limit debe ser mayor a 0")
    .max(100, "limit no puede superar 100")
    .default(20),
});

// Parámetro de ruta :id (GET /activos/:id, PUT, DELETE)
const activoIdParamSchema = z.object({
  id: z.coerce.number({ error: "El id debe ser un número" }).int("El id debe ser un número entero").positive("El id debe ser positivo"),
});

// Parámetros de ruta de un vínculo de la N:N (POST y DELETE /activos/:id/etiquetas/:etiquetaId)
const activoEtiquetaParamSchema = activoIdParamSchema.extend({
  etiquetaId: z.coerce
    .number({ error: "El id de la etiqueta debe ser un número" })
    .int("El id de la etiqueta debe ser un número entero")
    .positive("El id de la etiqueta debe ser positivo"),
});

export { createActivoSchema, updateActivoSchema, queryActivosSchema, activoIdParamSchema, activoEtiquetaParamSchema, MERCADOS, NIVELES, CAMPOS_ORDENABLES };
