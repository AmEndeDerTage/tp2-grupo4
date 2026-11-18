import AppError from "../errors/AppError.js";

// Errores del cliente que Express detecta antes de llegar a una ruta, por el status que trae el propio error
const ERRORES_DEL_CLIENTE = {
  400: { code: "BAD_REQUEST", message: "La petición no se pudo interpretar" },
  413: { code: "PAYLOAD_TOO_LARGE", message: "El cuerpo de la petición supera el tamaño máximo permitido" },
  415: { code: "UNSUPPORTED_MEDIA_TYPE", message: "El formato o la codificación del cuerpo no están soportados" },
};

/**
 * Manejador centralizado de errores (middleware de 4 parámetros: Express lo reconoce por la firma).
 * En Express 5, un error lanzado dentro de un handler async llega acá solo, sin try/catch.
 * De lo más específico a lo más general: un AppError (lo lanzó nuestro código), un error que Express ya marca
 * como del cliente (trae un status 4xx) y, recién al final, el 500: lo que no es culpa de nadie más.
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

  // Otros errores que Express o express.json() ya marcan como del cliente: cuerpo más grande que el límite de
  // express.json() (413), charset o compresión no soportados (415), URL mal codificada (400). Se respeta ese status:
  // un 500 diría «falló el servidor» cuando lo que falló fue el pedido.
  const status = err.status ?? err.statusCode;
  if (Number.isInteger(status) && status >= 400 && status < 500) {
    const { code, message } = ERRORES_DEL_CLIENTE[status] ?? ERRORES_DEL_CLIENTE[400];
    return res.status(status).json({ error: { code, message } });
  }

  console.error("Error no controlado:", err);
  res.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Ocurrió un error inesperado en el servidor" },
  });
}

export default errorHandler;
