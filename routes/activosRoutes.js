import { Router } from "express";
import validate, { validateQuery, validateParams } from "../middlewares/validate.js";
import {
  createActivoSchema,
  updateActivoSchema,
  queryActivosSchema,
  activoIdParamSchema,
} from "../schemas/activoSchema.js";
import { queryOrdenesDeActivoSchema } from "../schemas/ordenSchema.js";

/**
 * Router de Activos.
 * Solo mapea verbo + ruta → validación → método del controlador; nada de lógica acá.
 * Recibe el controlador ya instanciado (inyección de dependencias): este módulo no sabe cómo se armó.
 * Las rutas van sin el prefijo /activos: lo agrega el container al montar el router.
 */
function createActivosRouter(controller) {
  const router = Router();

  router.get("/", validateQuery(queryActivosSchema), controller.list);
  router.get("/:id", validateParams(activoIdParamSchema), controller.get);
  router.post("/", validate(createActivoSchema), controller.create);
  router.put("/:id", validateParams(activoIdParamSchema), validate(updateActivoSchema), controller.update);
  router.delete("/:id", validateParams(activoIdParamSchema), controller.remove);
  // Relación Activo 1:N Orden: las órdenes de un activo (filtros de Órdenes, sin activoId porque va en la ruta)
  router.get("/:id/ordenes", validateParams(activoIdParamSchema), validateQuery(queryOrdenesDeActivoSchema), controller.listOrdenes);
  // Relación Activo N:N Etiqueta: las etiquetas de un activo
  router.get("/:id/etiquetas", validateParams(activoIdParamSchema), controller.listEtiquetas);

  return router;
}

export default createActivosRouter;
