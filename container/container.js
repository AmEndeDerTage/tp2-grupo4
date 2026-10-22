import { Router } from "express";

/**
 * Composition Root.
 * Es el único lugar que conoce las implementaciones concretas: resuelve los DAOs con la factory,
 * crea el bus de eventos, arma los casos de uso, los controladores y los routers, y devuelve
 * el router principal a index.js.
 *
 * Por ahora no hay recursos montados: toda ruta cae en notFound (404).
 * Se completa al agregar Activos y Órdenes.
 */
async function buildContainer() {
  const router = Router();
  return router;
}

export default buildContainer;
