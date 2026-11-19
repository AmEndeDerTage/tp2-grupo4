import AppError from "../errors/AppError.js";

/**
 * Middleware de autenticación: ¿quién hace el pedido?
 * Se arma con una factory porque necesita el servicio de tokens, que llega inyectado desde el container.
 * authenticate lee el header «Authorization: Bearer <token>», lo verifica y deja en req.operador a quien lo presentó;
 * si falta o no es válido corta con 401, antes de validar nada del pedido.
 * No hay roles: la API tiene un solo operador, así que estar autenticado alcanza para escribir.
 */
function createAuthMiddlewares(tokens) {
  function authenticate(req, res, next) {
    const [scheme, token] = (req.headers.authorization ?? "").split(" ");
    if (scheme !== "Bearer" || !token) {
      return next(new AppError("TOKEN_MISSING", "Falta el header Authorization: Bearer <token> (se obtiene en POST /auth/login)", 401));
    }

    try {
      const { sub } = tokens.verify(token);
      req.operador = { usuario: sub };
      next();
    } catch (err) {
      next(err);
    }
  }

  return { authenticate };
}

export default createAuthMiddlewares;
