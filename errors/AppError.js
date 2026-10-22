/**
 * Error de dominio de la aplicación.
 * Lo lanzan los casos de uso (y los middlewares) para cortar el flujo con un código propio;
 * el errorHandler lo traduce a la respuesta HTTP { error: { code, message, details } }.
 */
class AppError extends Error {
  constructor(code, message, statusCode = 400, details = undefined) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export default AppError;
