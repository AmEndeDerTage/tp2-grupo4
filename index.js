import express from "express";
import logger from "./middlewares/logger.js";
import cabeceras from "./middlewares/cabeceras.js";
import notFound from "./middlewares/notFound.js";
import errorHandler from "./middlewares/errorHandler.js";
import { PORT, PERSISTENCE_TYPE } from "./config/config.js";
import buildContainer from "./container/container.js";

// Punto de entrada: arma la app de Express, le monta el router que entrega el container y empieza a escuchar.
// No conoce ninguna entidad ni ninguna ruta: todo eso lo ensambla el container.
async function startServer() {
  const app = express();

  // Middlewares globales, en este orden: registrar el pedido, poner las cabeceras de seguridad y, recién entonces, leer el cuerpo
  app.use(logger);
  app.use(cabeceras);
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

  app.listen(PORT, () => {
    console.log(`API de Activos y Órdenes en http://localhost:${PORT} · persistencia: ${PERSISTENCE_TYPE}`);
  });
}

startServer();
