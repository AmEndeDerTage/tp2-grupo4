import { Router } from "express";
import { getActivosDao, getOrdenesDao } from "../dao/daoFactory.js";
import makeActivoUseCases from "../usecases/activos/makeActivoUseCases.js";
import ActivosController from "../controllers/ActivosController.js";
import createActivosRouter from "../routes/activosRoutes.js";
import makeOrdenUseCases from "../usecases/ordenes/makeOrdenUseCases.js";
import OrdenesController from "../controllers/OrdenesController.js";
import createOrdenesRouter from "../routes/ordenesRoutes.js";
import createDocsRouter from "../docs/swaggerRouter.js";
import createEventBus from "../events/eventBus.js";
import EVENTS from "../events/eventNames.js";
import { getNotifier } from "../notifications/notifierFactory.js";
import createMultiNotifier from "../notifications/multiNotifier.js";
import registerAlertListeners from "../alerts/registerAlertListeners.js";

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

  // 2. Eventos: un solo bus para toda la app. Los listeners de alerts/ se registran acá con sus notificadores:
  //    orden.creada sale por el de NOTIFIER_TYPE; activo.topeCerca, por un notificador adicional (extra de la consigna)
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
  // Cada entidad recibe también el DAO de la otra: Activos lo usa para la regla 8 y Órdenes para las reglas sobre el activo
  const activoUseCases = makeActivoUseCases({ activosDao, ordenesDao });
  const ordenUseCases = makeOrdenUseCases({ ordenesDao, activosDao, events });

  // 4. Controladores con los casos de uso inyectados
  const activosController = new ActivosController(activoUseCases);
  const ordenesController = new OrdenesController(ordenUseCases);

  // 5. Routers con los controladores inyectados, montados en el router principal
  const router = Router();
  router.use("/activos", createActivosRouter(activosController));
  router.use("/ordenes", createOrdenesRouter(ordenesController));

  // Documentación interactiva (OpenAPI + Swagger UI): un recurso HTTP más de la API
  router.use("/api-docs", createDocsRouter());

  return router;
}

export default buildContainer;
