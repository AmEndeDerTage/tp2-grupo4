import express from "express";
import logger from "./middlewares/logger.js";
import cabeceras from "./middlewares/cabeceras.js";
import { generalLimiter } from "./middlewares/rateLimit.js";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";
import { PORT, HOST, PERSISTENCE_TYPE } from "./config/config.js";
import buildContainer from "./container/container.js";

// Punto de entrada: arma la app de Express, le monta el router que entrega el container y empieza a escuchar.
// No conoce ninguna entidad ni ninguna ruta: todo eso lo ensambla el container.
async function startServer() {
  const app = express();

  // Middlewares globales, en este orden: registrar el pedido, poner las cabeceras de seguridad, contarlo contra el
  // límite y, recién entonces, leer el cuerpo (así un pedido que se pasa del límite no llega a gastar nada más)
  app.use(logger);
  app.use(cabeceras);
  app.use(generalLimiter);
  app.use(express.json());

  // El Composition Root arma todas las dependencias y devuelve el router principal
  try {
    const router = await buildContainer();
    app.use(router);
  } catch (err) {
    console.error("Error al inicializar el contenedor de dependencias:", err);
    process.exit(1);
  }

  // Cierre: rutas inexistentes y manejo centralizado de errores (siempre al final)
  app.use(notFound);
  app.use(errorHandler);

  // HOST decide quién llega: con 127.0.0.1 (el valor por defecto) solo esta máquina; con 0.0.0.0, también la red
  app.listen(PORT, HOST, () => {
    console.log(`API de Activos y Órdenes en http://localhost:${PORT} · escucha en ${HOST} · persistencia: ${PERSISTENCE_TYPE}`);
  });
}

startServer();
