import { Router } from "express";
import validate from "../middlewares/validate.js";
import { loginLimiter } from "../middlewares/rateLimit.js";
import { loginSchema } from "../schemas/authSchema.js";

/**
 * Router de autenticación. El login es público: es la puerta para conseguir el token. Por eso mismo tiene su propio
 * límite de intentos fallidos, que corre antes que la validación: un intento mal formado también cuenta.
 * Las rutas van sin el prefijo /auth: lo agrega el container al montar el router.
 */
function createAuthRouter(controller) {
  const router = Router();

  router.post("/login", loginLimiter, validate(loginSchema), controller.login);

  return router;
}

export default createAuthRouter;
