import { rateLimit } from "express-rate-limit";
import AppError from "../errors/AppError.js";
import { RATE_LIMIT_MAX, LOGIN_RATE_LIMIT_MAX } from "../config/config.js";

/**
 * Límites de pedidos por dirección IP, en ventanas de un minuto. La cuenta vive en la memoria del proceso:
 * reiniciar el servidor la pone en cero.
 *  - generalLimiter: tope de pedidos a toda la API. Frena una inundación; el uso normal queda muy por debajo.
 *  - loginLimiter: tope de intentos FALLIDOS de inicio de sesión (los exitosos no cuentan). Frena el probar
 *    contraseñas una tras otra, que además es caro: comparar un hash bcrypt es lento a propósito.
 * Cuando se supera un tope, el pedido sigue el camino de cualquier error (next) y responde 429 con el formato de
 * siempre. Cada respuesta informa en las cabeceras RateLimit y RateLimit-Policy cuánto queda. Un tope en 0 apaga ese límite.
 */
const sinLimite = (req, res, next) => next();

// Arma un límite; `error` construye el AppError que recibe quien se pasa del tope
const armar = (limit, opciones, error) =>
  limit > 0
    ? rateLimit({ windowMs: 60_000, limit, standardHeaders: "draft-7", legacyHeaders: false, ...opciones, handler: (req, res, next) => next(error()) })
    : sinLimite;

const generalLimiter = armar(RATE_LIMIT_MAX, {}, () => new AppError("TOO_MANY_REQUESTS", "Demasiados pedidos: probá de nuevo en un minuto", 429));

const loginLimiter = armar(
  LOGIN_RATE_LIMIT_MAX,
  { skipSuccessfulRequests: true },
  () => new AppError("TOO_MANY_ATTEMPTS", "Demasiados intentos fallidos de inicio de sesión: probá de nuevo en un minuto", 429)
);

export { generalLimiter, loginLimiter };
