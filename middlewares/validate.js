import AppError from "../errors/AppError.js";

/**
 * Factory de middleware que valida req.body, req.query o req.params con un esquema de Zod.
 * Si falla, corta con un AppError 400 que lista cada campo inválido; si pasa, deja los datos
 * ya parseados (con coerciones y valores por defecto aplicados) para el controlador.
 * @param {import("zod").ZodType} schema
 * @param {"body" | "query" | "params"} target
 */
function validate(schema, target = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[target]);

    if (!result.success) {
      const details = result.error.issues.map((issue) => ({
        field: issue.path.join(".") || "(root)",
        message: issue.message,
      }));
      return next(new AppError("VALIDATION_ERROR", `Datos de ${target} inválidos`, 400, details));
    }

    if (target === "query") {
      // En Express 5 `req.query` es un getter que se recalcula en cada acceso: asignarlo no persiste.
      // Se redefine como propiedad propia para que el controlador reciba los valores ya parseados.
      Object.defineProperty(req, "query", { value: result.data, writable: true, configurable: true });
    } else {
      req[target] = result.data;
    }
    next();
  };
}

export const validateQuery = (schema) => validate(schema, "query");
export const validateParams = (schema) => validate(schema, "params");
export default validate;
