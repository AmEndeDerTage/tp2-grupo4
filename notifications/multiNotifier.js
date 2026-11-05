/**
 * Notificador compuesto (patrón Composite): cumple el mismo contrato `notify({ subject, body })`
 * y reenvía cada aviso a varios notificadores. Quien lo usa (el listener) no sabe cuántos canales hay.
 *
 * Envía a todos aunque alguno falle (Promise.allSettled): un canal roto no le quita el aviso a los demás.
 * Si alguno falló, rechaza al final con el detalle, para que el listener lo registre con console.error.
 * El `async` de cada llamada convierte también un error síncrono de un notificador en un rechazo.
 */
function createMultiNotifier(notifiers) {
  return {
    async notify(mensaje) {
      const resultados = await Promise.allSettled(notifiers.map(async (notifier) => notifier.notify(mensaje)));
      const fallas = resultados.filter((r) => r.status === "rejected").map((r) => r.reason?.message ?? String(r.reason));
      if (fallas.length > 0) {
        throw new Error(`fallaron ${fallas.length} de ${notifiers.length} canales: ${fallas.join(" · ")}`);
      }
    },
  };
}

export default createMultiNotifier;
