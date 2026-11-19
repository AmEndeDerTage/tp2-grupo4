import { Router } from "express";
import { TOPE_CERCA_PCT, CLOCK_NOW, JWT_SECRET, JWT_EXPIRES_IN, OPERADOR_USUARIO, OPERADOR_PASSWORD_HASH } from "../config/config.js";
import { getActivosDao, getOrdenesDao, getEtiquetasDao, getTransaccion } from "../dao/daoFactory.js";
import makeActivoUseCases from "../usecases/activos/makeActivoUseCases.js";
import ActivosController from "../controllers/ActivosController.js";
import createActivosRouter from "../routes/activosRoutes.js";
import makeOrdenUseCases from "../usecases/ordenes/makeOrdenUseCases.js";
import OrdenesController from "../controllers/OrdenesController.js";
import createOrdenesRouter from "../routes/ordenesRoutes.js";
import makeEtiquetaUseCases from "../usecases/etiquetas/makeEtiquetaUseCases.js";
import EtiquetasController from "../controllers/EtiquetasController.js";
import createEtiquetasRouter from "../routes/etiquetasRoutes.js";
import createDocsRouter from "../docs/swaggerRouter.js";
import createEventBus from "../events/eventBus.js";
import EVENTS from "../events/eventNames.js";
import { getNotifier } from "../notifications/notifierFactory.js";
import createMultiNotifier from "../notifications/multiNotifier.js";
import registerAlertListeners from "../alerts/registerAlertListeners.js";
import createClock from "../utils/clock.js";
import createPasswordHasher from "../security/passwordHasher.js";
import createTokenService from "../security/tokenService.js";
import makeAuthUseCases from "../usecases/auth/makeAuthUseCases.js";
import AuthController from "../controllers/AuthController.js";
import createAuthRouter from "../routes/authRoutes.js";

/**
 * Composition Root.
 * Es el único lugar que conoce las implementaciones concretas: resuelve los DAOs con la factory,
 * arma los casos de uso, los controladores y los routers, y devuelve el router principal a index.js.
 * Cada entidad sigue la misma cadena: DAO → casos de uso → controlador → router.
 */
async function buildContainer() {
  // 1. DAOs (la factory elige la implementación según PERSISTENCE_TYPE)
  const activosDao = getActivosDao();
  // Un adaptador con init() (p. ej. Sequelize) necesita inicializarse antes de usarse
  if (typeof activosDao.init === "function") {
    await activosDao.init();
  }
  // Órdenes: el lado "N" de la relación Activo 1:N Orden
  const ordenesDao = getOrdenesDao();
  if (typeof ordenesDao.init === "function") {
    await ordenesDao.init();
  }
  // Etiquetas: el otro lado de la relación N:N Activo–Etiqueta
  const etiquetasDao = getEtiquetasDao();
  if (typeof etiquetasDao.init === "function") {
    await etiquetasDao.init();
  }

  // 2. Eventos: un solo bus para toda la app. Los listeners de alerts/ se registran acá con sus notificadores:
  //    orden.creada y orden.ejecutada salen por el de NOTIFIER_TYPE; activo.topeCerca, por un notificador adicional
  //    que avisa por dos canales a la vez: archivo y consola. Sumar otro canal es agregarlo a esta lista.
  const events = createEventBus();
  registerAlertListeners(events, {
    ordenNotifier: getNotifier(EVENTS.ORDEN_CREADA),
    topeNotifier: createMultiNotifier([
      getNotifier(EVENTS.ACTIVO_TOPE_CERCA, "file"),
      getNotifier(EVENTS.ACTIVO_TOPE_CERCA, "console"),
    ]),
  });

  // 3. Casos de uso con sus dependencias inyectadas
  // Cada entidad recibe también el DAO de la otra: Activos lo usa para la regla 8 y Órdenes para las reglas sobre el activo.
  // Activos recibe además el de Etiquetas, para asignar y quitar etiquetas (la N:N).
  // Las dos reciben la misma forma de transacción, elegida por la factory igual que los DAOs.
  // Los números de las reglas también se inyectan desde acá: el umbral del aviso de tope llega a los casos de uso
  // como topeCercaPct, así que ninguno importa config.js y un test puede usar otro valor.
  // El reloj también se inyecta: ningún caso de uso llama a new Date(), así que un test decide qué día es. Con CLOCK_NOW queda fijo.
  const transaccion = getTransaccion();
  const clock = createClock({ fixedNow: CLOCK_NOW });
  if (CLOCK_NOW) console.log(`[Reloj] Fijo en ${CLOCK_NOW} (hoy = ${clock.today()})`);
  const activoUseCases = makeActivoUseCases({ activosDao, ordenesDao, etiquetasDao, events, transaccion, topeCercaPct: TOPE_CERCA_PCT });
  const ordenUseCases = makeOrdenUseCases({ ordenesDao, activosDao, events, transaccion, topeCercaPct: TOPE_CERCA_PCT, clock });
  const etiquetaUseCases = makeEtiquetaUseCases({ etiquetasDao, activosDao, transaccion });

  // Seguridad: el hasheador de contraseñas y el servicio de tokens, para el inicio de sesión.
  // Las credenciales del operador llegan de la configuración; de la contraseña solo existe el hash.
  const hasher = createPasswordHasher({ rounds: 10 });
  const tokens = createTokenService({ secret: JWT_SECRET, expiresIn: JWT_EXPIRES_IN });
  const authUseCases = makeAuthUseCases({ operador: { usuario: OPERADOR_USUARIO, passwordHash: OPERADOR_PASSWORD_HASH }, hasher, tokens });

  // 4. Controladores con los casos de uso inyectados
  const activosController = new ActivosController(activoUseCases);
  const ordenesController = new OrdenesController(ordenUseCases);
  const etiquetasController = new EtiquetasController(etiquetaUseCases);
  const authController = new AuthController(authUseCases);

  // 5. Routers con los controladores inyectados, montados en el router principal
  const router = Router();
  router.use("/auth", createAuthRouter(authController));
  router.use("/activos", createActivosRouter(activosController));
  router.use("/ordenes", createOrdenesRouter(ordenesController));
  router.use("/etiquetas", createEtiquetasRouter(etiquetasController));

  // Documentación interactiva (OpenAPI + Swagger UI): un recurso HTTP más de la API
  router.use("/api-docs", createDocsRouter());

  return router;
}

export default buildContainer;
