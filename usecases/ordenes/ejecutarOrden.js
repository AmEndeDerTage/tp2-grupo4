import AppError from "../../errors/AppError.js";
import { obtenerActivoDeLaOrden, verificarCarteraParaEjecutar, nivelTrasEjecucion } from "./reglasOrden.js";

/**
 * Caso de uso: ejecutar una orden viva (POST /ordenes/:id/ejecucion). Es asentar que la orden colocada a mano
 * se llenó en el broker: la orden pasa a "ejecutada" y la cartera del activo se mueve (+ en compra, − en venta).
 * Devuelve la orden ejecutada o `null` si no existe (el 404 lo decide el controlador).
 * Reglas, en este orden:
 *   7. una orden ejecutada no se vuelve a ejecutar                → ORDEN_NO_MODIFICABLE (409)
 *   1. el activo de la orden existe (lo garantiza la regla 8; se lee igual: las reglas siguientes lo usan)
 *   5. si es venta, lo que se vende está en cartera               → CANTIDAD_INSUFICIENTE (409)
 * y el nivel nuevo del activo lo decide nivelTrasEjecucion (compra → L3; venta que vacía un L3 → L2).
 *
 * Todo corre en UNA transacción: leer, verificar y los dos UPDATE del DAO. Si algo falla a mitad, no cambia nada.
 * El DAO devuelve null solo si la orden dejó de estar viva entre la lectura y la escritura, y dentro de la
 * transacción eso no puede pasar: si pasara, es un error del sistema (500), no del cliente.
 */
async function ejecutarOrden(id, ordenesDao, activosDao, transaccion) {
  return transaccion(async (tx) => {
    const orden = await ordenesDao.getById(id, tx);
    if (!orden) return null;

    if (orden.estado === "ejecutada") {
      throw new AppError("ORDEN_NO_MODIFICABLE", `La orden ${orden.id} ya está ejecutada: no se puede volver a ejecutar`, 409);
    }

    const activo = await obtenerActivoDeLaOrden(orden.activoId, activosDao, tx);
    verificarCarteraParaEjecutar(activo, orden);

    const nivel = nivelTrasEjecucion(activo, orden);
    const ejecutada = await ordenesDao.ejecutar(orden.id, nivel ? { nivel } : {}, tx);
    if (!ejecutada) {
      throw new Error(`La orden ${orden.id} dejó de estar viva durante su propia ejecución`);
    }
    return ejecutada;
  });
}

export default ejecutarOrden;
