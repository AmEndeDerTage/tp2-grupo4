import { Router } from "express";
import validate, { validateQuery, validateParams } from "../middlewares/validate.js";
import { createOrdenSchema, queryOrdenesSchema, ordenIdParamSchema } from "../schemas/ordenSchema.js";

/**
 * Router de Órdenes.
 * Solo mapea verbo + ruta → validación → método del controlador; nada de lógica acá.
 * Recibe el controlador ya instanciado (inyección de dependencias): este módulo no sabe cómo se armó.
 * Las rutas van sin el prefijo /ordenes: lo agrega el container al montar el router.
 */
function createOrdenesRouter(controller) {
  const router = Router();

  router.get("/", validateQuery(queryOrdenesSchema), controller.list);
  router.get("/:id", validateParams(ordenIdParamSchema), controller.get);
  router.post("/", validate(createOrdenSchema), controller.create);

  return router;
}

export default createOrdenesRouter;
