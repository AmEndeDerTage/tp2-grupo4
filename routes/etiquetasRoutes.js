import { Router } from "express";
import validate, { validateQuery, validateParams } from "../middlewares/validate.js";
import {
  createEtiquetaSchema,
  updateEtiquetaSchema,
  queryEtiquetasSchema,
  etiquetaIdParamSchema,
} from "../schemas/etiquetaSchema.js";

/**
 * Router de Etiquetas.
 * Solo mapea verbo + ruta → validación → método del controlador; nada de lógica acá.
 * Las rutas van sin el prefijo /etiquetas: lo agrega el container al montar el router.
 */
function createEtiquetasRouter(controller) {
  const router = Router();

  router.get("/", validateQuery(queryEtiquetasSchema), controller.list);
  router.get("/:id", validateParams(etiquetaIdParamSchema), controller.get);
  router.post("/", validate(createEtiquetaSchema), controller.create);
  router.put("/:id", validateParams(etiquetaIdParamSchema), validate(updateEtiquetaSchema), controller.update);
  router.delete("/:id", validateParams(etiquetaIdParamSchema), controller.remove);

  return router;
}

export default createEtiquetasRouter;
