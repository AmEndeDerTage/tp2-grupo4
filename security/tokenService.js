import jwt from "jsonwebtoken";
import AppError from "../errors/AppError.js";

/**
 * Servicio de tokens JWT. Contrato: sign(payload) y verify(token).
 * Un JWT son tres partes en base64 separadas por puntos: encabezado, contenido (payload) y firma. El contenido lo
 * puede leer cualquiera; lo que nadie puede hacer sin el secreto es cambiarlo y que la firma siga coincidiendo.
 * Por eso garantiza integridad y no confidencialidad: en el payload va lo mínimo (quién es y hasta cuándo vale).
 * No guarda nada en el servidor: un token sigue valiendo después de un reinicio mientras el secreto sea el mismo.
 */
function createTokenService({ secret, expiresIn }) {
  return {
    // Vida de cada token ("15m", "1h"), para informarla al iniciar sesión
    expiresIn,

    // Firma el payload con el secreto y le pone vencimiento
    sign: (payload) => jwt.sign(payload, secret, { algorithm: "HS256", expiresIn }),

    // Devuelve el payload si la firma coincide y no venció; si no, 401
    verify(token) {
      try {
        // El algoritmo se fija acá: si se aceptara el que declara el propio token, alcanzaría con declarar «none» (sin firma)
        return jwt.verify(token, secret, { algorithms: ["HS256"] });
      } catch (err) {
        if (err.name === "TokenExpiredError") {
          throw new AppError("TOKEN_EXPIRED", "El token venció: hay que iniciar sesión de nuevo", 401);
        }
        throw new AppError("TOKEN_INVALID", "El token no es válido", 401);
      }
    },
  };
}

export default createTokenService;
