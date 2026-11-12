import { z } from "zod";

/**
 * Esquemas de validación de Etiqueta (Zod): la FORMA del dato.
 * Que el nombre no esté repetido es regla de negocio (necesita consultar los datos): vive en el caso de uso.
 */

// Columnas por las que se puede ordenar: el DAO las usa tal cual (en SQL van al ORDER BY)
const CAMPOS_ORDENABLES = ["id", "nombre"];

// Cada campo se define una sola vez y se reutiliza en los esquemas de creación y de actualización.
// El nombre se normaliza (sin espacios alrededor, en minúsculas) ANTES de validarlo, como el ticker:
// «Dividendos» y «dividendos» son la misma etiqueta. Sin tildes ni espacios: va tal cual en la URL del filtro.
const campos = {
  nombre: z
    .string({ error: "El nombre es obligatorio y debe ser un texto" })
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z][a-z0-9-]{1,29}$/,
      "El nombre debe tener entre 2 y 30 caracteres: letras minúsculas sin tildes, dígitos o guiones, empezando con letra"
    ),
};

// POST /etiquetas
const createEtiquetaSchema = z.object({
  nombre: campos.nombre,
});

// PUT /etiquetas/:id (actualización parcial): todo opcional y al menos un campo, como Activos y Órdenes
const updateEtiquetaSchema = z
  .object({
    nombre: campos.nombre.optional(),
  })
  .refine((data) => Object.keys(data).length > 0, { error: "Hay que enviar al menos un campo para actualizar" });

// GET /etiquetas: orden y paginación. Todo llega como texto en la URL, por eso z.coerce.
const queryEtiquetasSchema = z.object({
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

// Parámetro de ruta :id (GET /etiquetas/:id, PUT, DELETE)
const etiquetaIdParamSchema = z.object({
  id: z.coerce.number({ error: "El id debe ser un número" }).int("El id debe ser un número entero").positive("El id debe ser positivo"),
});

export { createEtiquetaSchema, updateEtiquetaSchema, queryEtiquetasSchema, etiquetaIdParamSchema, CAMPOS_ORDENABLES };
