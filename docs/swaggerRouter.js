import { readFileSync } from "node:fs";
import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";

/**
 * Router de documentación.
 * Lee la especificación OpenAPI 3 (docs/openapi.yaml) y la sirve con Swagger UI.
 * El container lo monta en /api-docs. La especificación se lee una sola vez, al arrancar:
 * si se edita el YAML hay que reiniciar el servidor (con `npm run dev`, --watch lo hace solo).
 */
function createDocsRouter() {
  const rutaSpec = new URL("./openapi.yaml", import.meta.url);
  const spec = YAML.parse(readFileSync(rutaSpec, "utf8"));

  const router = Router();
  router.use("/", swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: "API Activos y Órdenes — docs" }));
  return router;
}

export default createDocsRouter;
