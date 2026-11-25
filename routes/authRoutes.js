import { Router } from "express";
import validate from "../middlewares/validate.js";
import { loginSchema } from "../schemas/authSchema.js";

/**
 * Router de autenticación. El login es público: es la puerta para conseguir el token. Por eso mismo tiene su propio
 * límite de intentos fallidos, que corre antes que la validación: un intento mal formado también cuenta.
 * El límite llega inyectado (loginLimiter), igual que el controlador: el router no importa la configuración, así que
 * se puede construir sin .env (lo hace el test que compara las rutas con la documentación).
 * Las rutas van sin el prefijo /auth: lo agrega el container al montar el router.
 */
function createAuthRouter(controller, { loginLimiter }) {
  const router = Router();

  router.post("/login", loginLimiter, validate(loginSchema), controller.login);

  return router;
}

export default createAuthRouter;
