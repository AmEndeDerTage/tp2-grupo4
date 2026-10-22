import AppError from "../errors/AppError.js";

/**
 * Manejador centralizado de errores (middleware de 4 parámetros: Express lo reconoce por la firma).
 * En Express 5, un error lanzado dentro de un handler async llega acá solo, sin try/catch.
 */
function errorHandler(err, req, res, next) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        ...(err.details && { details: err.details }),
      },
    });
  }

  // JSON mal formado en el body: lo detecta express.json() antes de llegar a Zod. Es un 400, no un 500.
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      error: { code: "INVALID_JSON", message: "El cuerpo de la petición no es un JSON válido" },
    });
  }

  console.error("Error no controlado:", err);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Ocurrió un error inesperado en el servidor" },
  });
}

export default errorHandler;
