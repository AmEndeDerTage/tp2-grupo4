import { Router } from "express";
import { getActivosDao } from "../dao/daoFactory.js";
import makeActivoUseCases from "../usecases/activos/makeActivoUseCases.js";
import ActivosController from "../controllers/ActivosController.js";
import createActivosRouter from "../routes/activosRoutes.js";
import createDocsRouter from "../docs/swaggerRouter.js";

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

  // 2. Casos de uso con sus dependencias inyectadas
  const activoUseCases = makeActivoUseCases(activosDao);

  // 3. Controladores con los casos de uso inyectados
  const activosController = new ActivosController(activoUseCases);

  // 4. Routers con los controladores inyectados, montados en el router principal
  const router = Router();
  router.use("/activos", createActivosRouter(activosController));

  // Documentación interactiva (OpenAPI + Swagger UI): un recurso HTTP más de la API
  router.use("/api-docs", createDocsRouter());

  return router;
}

export default buildContainer;
