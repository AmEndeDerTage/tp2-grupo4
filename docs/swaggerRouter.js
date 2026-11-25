import { readFileSync } from "node:fs";
import { Router } from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yaml";

/**
 * Router de documentación.
 * Lee la especificación OpenAPI 3 (docs/openapi.yaml) y la publica de dos formas: navegable, con Swagger UI, y cruda,
 * como JSON, para las herramientas que la consumen por su cuenta.
 * El container lo monta en /api-docs. La especificación se lee una sola vez, al arrancar:
 * si se edita el YAML hay que reiniciar el servidor (con `npm run dev`, --watch lo hace solo).
 *
 * Alternativa (NO implementada; se eligió una forma y se mantiene): swagger-jsdoc.
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
// Arma el router de /api-docs: la especificación cruda en /openapi.json y Swagger UI en la raíz
function createDocsRouter() {
  const rutaSpec = new URL("./openapi.yaml", import.meta.url);
  const spec = YAML.parse(readFileSync(rutaSpec, "utf8"));

  const router = Router();
  // La especificación «cruda», para las herramientas que la consumen por su cuenta: Postman, por ejemplo, la importa
  // desde esta URL (Import → Link) y arma una colección con todos los pedidos. Un solo contrato para Swagger UI y Postman.
  router.get("/openapi.json", (req, res) => res.json(spec));
  // Los archivos de Swagger UI (scripts, estilos) y la página, que se responde solo en la raíz: cualquier otra ruta
  // debajo de /api-docs sigue de largo y termina en el 404 de siempre, en lugar de devolver la página.
  router.use(swaggerUi.serve);
  router.get(
    "/",
    swaggerUi.setup(spec, {
      customSiteTitle: "API Activos y Órdenes — docs",
      swaggerOptions: {
        persistAuthorization: true, // el token cargado en «Authorize» queda en el navegador y sobrevive a recargar la página
        displayRequestDuration: true, // cada respuesta muestra cuánto tardó el pedido
      },
    })
  );
  return router;
}

export default createDocsRouter;
