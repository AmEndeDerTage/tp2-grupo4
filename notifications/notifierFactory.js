import { NOTIFIER_TYPE, NOTIFICATIONS_LOG_PATH } from "../config/config.js";
import consoleNotifier from "./consoleNotifier.js";
import fileNotifier from "./fileNotifier.js";

/**
 * Factory de notificadores (el equivalente de daoFactory para el canal de aviso).
 * Es el único punto donde se elige la implementación: el resto trabaja contra `notify({ subject, body })`.
 *  - uso:  para qué se pide (solo para el mensaje de arranque, como "Activos:" en daoFactory)
 *  - tipo: "console" | "file"; por defecto, el de NOTIFIER_TYPE (config.js ya rechaza cualquier otro valor).
 *          Pasarlo explícito permite al container fijar el canal de un evento sin importar implementaciones concretas.
 *
 * Cómo se sumaría un canal de otro tipo (NO implementado; queda como ejemplo de extensión):
 *  1. notifications/webhookNotifier.js con el mismo contrato. Por ejemplo, un POST con fetch (clase 12) al webhook
 *     de un canal de Slack, Discord o Teams:
 *        async notify({ subject, body }) {
 *          const res = await fetch(WEBHOOK_URL, {
 *            method: "POST",
 *            headers: { "Content-Type": "application/json" },
 *            body: JSON.stringify({ text: `${subject}\n${body}` }),
 *          });
 *          if (!res.ok) throw new Error(`el webhook respondió ${res.status}`);
 *        }
 *     (un mail sería igual, con nodemailer adentro de notify).
 *  2. WEBHOOK_URL en config/config.js y .env.example, y "webhook" en NOTIFIER_TYPES.
 *  3. Una rama más acá: if (tipo === "webhook") return webhookNotifier;
 *  4. Para que un evento avise también por ahí, sumarlo a la lista de createMultiNotifier en el container.
 * Los casos de uso, los listeners y los otros notificadores no cambian: dependen solo del contrato.
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
