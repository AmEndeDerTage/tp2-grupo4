import { NOTIFIER_TYPE, NOTIFICATIONS_LOG_PATH } from "../config/config.js";
import consoleNotifier from "./consoleNotifier.js";
import fileNotifier from "./fileNotifier.js";

/**
 * Factory de notificadores (el equivalente de daoFactory para el canal de aviso).
 * Es el único punto donde se elige la implementación: el resto trabaja contra `notify({ subject, body })`.
 *  - uso:  para qué se pide (solo para el mensaje de arranque, como "Activos:" en daoFactory)
 *  - tipo: "console" | "file"; por defecto, el de NOTIFIER_TYPE (config.js ya rechaza cualquier otro valor).
 *          Pasarlo explícito permite al container fijar el canal de un evento sin importar implementaciones concretas.
 */
function getNotifier(uso, tipo = NOTIFIER_TYPE) {
  if (tipo === "file") {
    console.log(`[Notificaciones] ${uso}: archivo (${NOTIFICATIONS_LOG_PATH})`);
    return fileNotifier;
  }
  console.log(`[Notificaciones] ${uso}: consola`);
  return consoleNotifier;
}

export { getNotifier };
