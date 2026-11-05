import { readFileSync } from "node:fs";
import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";

/**
 * Router de documentación.
 * Lee la especificación OpenAPI 3 (docs/openapi.yaml) y la sirve con Swagger UI.
 * El container lo monta en /api-docs. La especificación se lee una sola vez, al arrancar:
 * si se edita el YAML hay que reiniciar el servidor (con `npm run dev`, --watch lo hace solo).
 *
 * Alternativa que la consigna también acepta (NO implementada; se eligió una y se mantiene): swagger-jsdoc.
 * En lugar de un YAML aparte, cada ruta lleva su pedazo de la especificación en un comentario y la librería
 * los junta al arrancar. Por ejemplo, en routes/activosRoutes.js:
 *     /**
 *      * @openapi
 *      * /activos/{id}:
 *      *   get:
 *      *     summary: Obtener un activo
 *      *     responses:
 *      *       200: { content: { application/json: { schema: { $ref: "#/components/schemas/Activo" } } } }
 *      *       404: { $ref: "#/components/responses/ActivoNoEncontrado" }
 *      *\/
 * y acá:  const spec = swaggerJsdoc({ definition: { openapi: "3.0.3", info: { … } }, apis: ["./routes/*.js"] });
 * Ventaja: la documentación vive al lado del código que describe. Costo: un YAML largo partido en comentarios,
 * que solo se arma al arrancar. Con el YAML aparte, el contrato se lee entero y se valida como un archivo más.
 */
function createDocsRouter() {
  const rutaSpec = new URL("./openapi.yaml", import.meta.url);
  const spec = YAML.parse(readFileSync(rutaSpec, "utf8"));

  const router = Router();
  router.use("/", swaggerUi.serve, swaggerUi.setup(spec, { customSiteTitle: "API Activos y Órdenes — docs" }));
  return router;
}

export default createDocsRouter;
