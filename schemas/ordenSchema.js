import { z } from "zod";

/**
 * Esquemas de validación de Orden (Zod).
 * Validan la FORMA del dato (tipos, rangos, enumeraciones, largo del motivo). Las reglas de negocio
 * que dependen de otros datos (que el activo exista, su nivel, la cantidad en cartera, el tope,
 * las órdenes vivas) no van acá: viven en los casos de uso de Órdenes.
 */

const SENTIDOS = ["compra", "venta"];
const ESTADOS = ["viva", "ejecutada"];

// Columnas por las que se puede ordenar: el DAO las usa tal cual (en SQL irán al ORDER BY)
const CAMPOS_ORDENABLES = ["id", "activoId", "sentido", "cantidad", "precioLimite", "validaHasta", "estado"];

// Cada campo se define una sola vez y se reutiliza en los esquemas de creación, actualización y consulta
const campos = {
  activoId: z
    .number({ error: "activoId es obligatorio y debe ser un número" })
    .int("activoId debe ser un número entero")
    .positive("activoId debe ser positivo"),
  sentido: z.enum(SENTIDOS, { error: `El sentido debe ser uno de: ${SENTIDOS.join(", ")}` }),
  cantidad: z
    .number({ error: "La cantidad debe ser un número" })
    .int("La cantidad debe ser un número entero")
    .positive("La cantidad debe ser mayor a 0"),
  precioLimite: z.number({ error: "El precio límite debe ser un número" }).positive("El precio límite debe ser mayor a 0"),
  // Fecha de calendario ISO (AAAA-MM-DD): Zod verifica el formato y que la fecha exista (no acepta 2026-02-30)
  validaHasta: z.iso.date({ error: "validaHasta debe ser una fecha con formato AAAA-MM-DD" }),
  motivo: z
    .string({ error: "El motivo debe ser un texto" })
    .trim()
    .max(400, "El motivo no puede superar los 400 caracteres"),
  estado: z.enum(ESTADOS, { error: `El estado debe ser uno de: ${ESTADOS.join(", ")}` }),
};

// POST /ordenes. No incluye `estado`: toda orden nace "viva" (Zod descarta las claves que no están en el esquema,
// así que un `estado` o un `id` enviados en el body se ignoran).
const createOrdenSchema = z.object({
  activoId: campos.activoId,
  sentido: campos.sentido,
  cantidad: campos.cantidad,
  precioLimite: campos.precioLimite,
  validaHasta: campos.validaHasta,
  motivo: campos.motivo.optional(),
});

// PUT /ordenes/:id (actualización parcial): solo lo que tiene sentido corregir en una orden ya armada.
// activoId y sentido no se editan (sería otra orden: se borra y se crea de nuevo); estado lo cambia solo la ejecución.
const updateOrdenSchema = z
  .object({
    cantidad: campos.cantidad.optional(),
    precioLimite: campos.precioLimite.optional(),
    validaHasta: campos.validaHasta.optional(),
    motivo: campos.motivo.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    error: "Hay que enviar al menos uno de: cantidad, precioLimite, validaHasta, motivo",
  });

// GET /ordenes: filtros, orden y paginación. Todo llega como texto en la URL, por eso z.coerce.
const queryOrdenesSchema = z.object({
  estado: campos.estado.optional(),
  sentido: campos.sentido.optional(),
  activoId: z.coerce
    .number({ error: "activoId debe ser un número" })
    .int("activoId debe ser un entero")
    .positive("activoId debe ser positivo")
    .optional(),
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

// GET /activos/:id/ordenes: los mismos filtros, sin activoId (ya viene en la ruta)
const queryOrdenesDeActivoSchema = queryOrdenesSchema.omit({ activoId: true });

// Parámetro de ruta :id (GET /ordenes/:id, PUT, DELETE)
const ordenIdParamSchema = z.object({
  id: z.coerce.number({ error: "El id debe ser un número" }).int("El id debe ser un número entero").positive("El id debe ser positivo"),
});

export {
  createOrdenSchema,
  updateOrdenSchema,
  queryOrdenesSchema,
  queryOrdenesDeActivoSchema,
  ordenIdParamSchema,
  SENTIDOS,
  ESTADOS,
  CAMPOS_ORDENABLES,
};
