/**
 * Nombres de los eventos de dominio: el contrato entre quien emite y quien escucha.
 * Centralizados para no repetir strings sueltos (un error de tipeo en un string no avisa: el evento
 * se emitiría y nadie lo escucharía). Convención "entidad.hecho": algo que YA pasó, no una orden.
 */
const EVENTS = {
  // createOrden, después de guardar: hay una orden nueva para colocar a mano en el broker
  ORDEN_CREADA: "orden.creada",
  // Una compra dejó lo comprometido del activo (cartera + compras vivas) en TOPE_CERCA_PCT % o más de su tope
  ACTIVO_TOPE_CERCA: "activo.topeCerca",
};

export default EVENTS;
