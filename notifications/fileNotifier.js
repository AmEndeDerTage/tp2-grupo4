import { appendFile } from "node:fs/promises";
import { NOTIFICATIONS_LOG_PATH } from "../config/config.js";

/**
 * Notificador a archivo: agrega cada notificación al final de NOTIFICATIONS_LOG_PATH
 * (por defecto notifications.log, ignorado por git con *.log).
 *
 * ¿Por qué el listener de alertas no cambia al pasar de consoleNotifier a fileNotifier?
 * Porque los dos cumplen el mismo contrato, `notify({ subject, body })`: el listener decide QUÉ decir
 * y el notificador, POR DÓNDE. Cambiar el canal es elegir otro objeto en la factory, no tocar el listener
 * ni la regla de negocio (lo mismo que cambiar de DAO con PERSISTENCE_TYPE).
 *
 * Formato: una línea "fecha ISO | asunto" y debajo el cuerpo, con sangría (puede tener varias líneas).
 * Si la ruta no existe o no se puede escribir, appendFile rechaza: el que lo atrapa es el listener.
 */
const fileNotifier = {
  async notify({ subject, body }) {
    const cuerpo = body.split("\n").map((linea) => `    ${linea}`).join("\n");
    await appendFile(NOTIFICATIONS_LOG_PATH, `${new Date().toISOString()} | ${subject}\n${cuerpo}\n`);
  },
};

export default fileNotifier;
