/**
 * Reloj inyectable: la fuente de «qué día es hoy» para los casos de uso.
 * La fecha de hoy es un dato EXTERNO, igual que la base: si un caso de uso llamara a `new Date()`, una regla como
 * «la validez no puede ser anterior a hoy» no se podría probar sin esperar a que cambie el día. Por eso los casos de
 * uso reciben un `clock` y le preguntan a él.
 *  - En producción: createClock() → la hora real.
 *  - Para probar a mano: CLOCK_NOW=2026-12-01T12:00:00-03:00 en .env («viajar en el tiempo»).
 *  - En los tests: un objeto con el mismo contrato, { today: () => "2026-11-18" } (tests/helpers/escenario.js).
 */

// Qué día es «hoy» depende de la zona horaria: una sola, fija, para todo el sistema (la del mercado local)
const ZONA_HORARIA = "America/Argentina/Buenos_Aires";

// "en-CA" formatea como AAAA-MM-DD, el mismo formato de `validaHasta`: dos fechas así se comparan como textos
const formatoDia = new Intl.DateTimeFormat("en-CA", { timeZone: ZONA_HORARIA });

// Crea el reloj. Sin `fixedNow` da la hora real; con una fecha ISO queda detenido en ese instante. Una fecha inválida
// corta el arranque (el container lo crea al iniciar), en lugar de dejar un reloj que no marca nada.
function createClock({ fixedNow } = {}) {
  if (fixedNow && Number.isNaN(new Date(fixedNow).getTime())) {
    throw new Error(`CLOCK_NOW no es una fecha válida: "${fixedNow}"`);
  }
  const now = () => (fixedNow ? new Date(fixedNow) : new Date());

  return {
    now,
    // «Hoy» como AAAA-MM-DD, en la zona horaria del sistema
    today: () => formatoDia.format(now()),
  };
}

export { ZONA_HORARIA };
export default createClock;
