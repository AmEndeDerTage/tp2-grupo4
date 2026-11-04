/**
 * Notificador por consola.
 * Contrato de todo notificador: `async notify({ subject, body })`. El listener depende solo de esa
 * firma, igual que un caso de uso depende de la interfaz del DAO y no de su implementación.
 * `body` puede tener varias líneas (la tabla de la orden): se imprime debajo del asunto.
 */
const consoleNotifier = {
  async notify({ subject, body }) {
    console.log(`[NOTIFICACIÓN] ${subject}\n${body}`);
  },
};

export default consoleNotifier;
