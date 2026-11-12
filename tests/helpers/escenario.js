import { vi } from "vitest";
import { ActivosMemoryDao } from "../../dao/activos/ActivosMemoryDao.js";
import { OrdenesMemoryDao } from "../../dao/ordenes/OrdenesMemoryDao.js";
import { EtiquetasMemoryDao } from "../../dao/etiquetas/EtiquetasMemoryDao.js";
import makeActivoUseCases from "../../usecases/activos/makeActivoUseCases.js";
import makeOrdenUseCases from "../../usecases/ordenes/makeOrdenUseCases.js";
import makeEtiquetaUseCases from "../../usecases/etiquetas/makeEtiquetaUseCases.js";

/**
 * Arma lo mismo que el container (DAOs → casos de uso), pero para un test:
 *  - DAOs en memoria NUEVOS en cada llamada, con los datos que el test declara (no la semilla de la app):
 *    ningún test ve lo que escribió otro, y los números que deciden la regla están escritos en el propio test.
 *  - `events` es un espía (vi.fn()): no avisa nada, anota con qué lo llamaron.
 *  - `transaccion` es la de memoria (corre el trabajo tal cual), igual que transaccionEnMemoria de dao/transacciones.js.
 *    Se escribe acá para no importar ese módulo, que arrastra Sequelize: los tests no cargan nada de la base.
 *  - `topeCercaPct` se puede cambiar por test (por defecto 90, el del .env.example): llega inyectado, como en el container.
 */
function crearEscenario({ activos = [], ordenes = [], etiquetas = [], vinculos = [], topeCercaPct = 90 } = {}) {
  const etiquetasDao = new EtiquetasMemoryDao(etiquetas);
  const activosDao = new ActivosMemoryDao(activos, vinculos, etiquetasDao);
  const ordenesDao = new OrdenesMemoryDao(activosDao, ordenes);
  const events = { emit: vi.fn() };
  const transaccion = (trabajo) => trabajo(undefined);

  const deps = { activosDao, ordenesDao, etiquetasDao, events, transaccion, topeCercaPct };
  return {
    dao: { activos: activosDao, ordenes: ordenesDao, etiquetas: etiquetasDao },
    events,
    activos: makeActivoUseCases(deps),
    ordenes: makeOrdenUseCases(deps),
    etiquetas: makeEtiquetaUseCases(deps),
  };
}

/** Foto de todo lo guardado, para comprobar que un rechazo no cambió nada (el cuarto caso de cada regla). */
async function estado(esc) {
  const [activos, ordenes, etiquetas] = await Promise.all([
    esc.dao.activos.getAll(),
    esc.dao.ordenes.getAll(),
    esc.dao.etiquetas.getAll(),
  ]);
  return { activos: activos.items, ordenes: ordenes.items, etiquetas: etiquetas.items };
}

// Datos de prueba con valores por defecto válidos: cada test escribe solo los campos que le importan.
const unActivo = (campos = {}) => ({
  id: 1,
  ticker: "KO",
  nombre: "Coca-Cola",
  mercado: "NYSE",
  ratio: 5,
  nivel: "L3",
  cantidad: 40,
  topeCedears: 100,
  ...campos,
});

const unaOrden = (campos = {}) => ({
  id: 1,
  activoId: 1,
  sentido: "compra",
  cantidad: 10,
  precioLimite: 50,
  validaHasta: "2026-12-31",
  estado: "viva",
  motivo: null,
  ...campos,
});

// Lo que llega del body ya validado por Zod para POST /ordenes
const pedidoDeOrden = (campos = {}) => ({ activoId: 1, sentido: "compra", cantidad: 5, precioLimite: 50, validaHasta: "2026-12-31", ...campos });

export { crearEscenario, estado, unActivo, unaOrden, pedidoDeOrden };
