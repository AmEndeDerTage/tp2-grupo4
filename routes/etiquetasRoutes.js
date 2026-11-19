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
 * Recibe también authenticate: leer es público, y todo pedido que escribe exige el token antes de validar nada.
 * Las rutas van sin el prefijo /etiquetas: lo agrega el container al montar el router.
 */
function createEtiquetasRouter(controller, { authenticate }) {
  const router = Router();

  router.get("/", validateQuery(queryEtiquetasSchema), controller.list);
  router.get("/:id", validateParams(etiquetaIdParamSchema), controller.get);
  router.post("/", authenticate, validate(createEtiquetaSchema), controller.create);
  router.put("/:id", authenticate, validateParams(etiquetaIdParamSchema), validate(updateEtiquetaSchema), controller.update);
  router.delete("/:id", authenticate, validateParams(etiquetaIdParamSchema), controller.remove);

  return router;
}

export default createEtiquetasRouter;
