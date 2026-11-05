import { Transaction } from "sequelize";
import { sequelize } from "./models/index.js";

/**
 * Transacciones: correr un trabajo (leer, verificar las reglas y escribir) como UNA sola operación.
 * Llegan a los casos de uso inyectadas como `transaccion(trabajo)`: el caso de uso decide QUÉ va junto;
 * CÓMO se garantiza depende de la persistencia, y lo elige la factory (getTransaccion en daoFactory.js).
 * `trabajo` recibe un `tx` que el caso de uso pasa tal cual a cada método del DAO: para él es opaco.
 * No se anidan: dentro de un trabajo no se abre otra transacción (con la cola de abajo, se esperaría a sí misma).
 */

/**
 * Memoria: corre el trabajo tal cual, sin `tx`. No hace falta más: no hay E/S real, así que el event loop no le da
 * el turno a otro pedido mientras dura el caso de uso. Lo que la memoria no tiene es rollback automático: si una
 * operación tiene dos pasos que pueden fallar, el DAO los ordena o deshace a mano (ver OrdenesMemoryDao.ejecutar).
 */
function transaccionEnMemoria(trabajo) {
  return trabajo(undefined);
}

/**
 * Sequelize (SQLite): transacción administrada de tipo IMMEDIATE, que espera su turno en una cola del proceso.
 *  - Administrada: si `trabajo` termina bien, Sequelize hace commit; si lanza (p. ej. el AppError de una regla), rollback.
 *  - IMMEDIATE: toma el lock de escritura de SQLite al empezar y no en la primera escritura. Así dos pedidos no pueden
 *    leer lo mismo y escribir los dos (la carrera A1): el segundo espera a que el primero confirme y lee lo nuevo.
 *  - Cola: el driver sqlite3 espera el lock DENTRO de los hilos de libuv (4 por defecto). Con varias transacciones
 *    esperando a la vez se ocupan todos y la que tiene el lock no consigue hilo para terminar. Probado: 20 pedidos
 *    simultáneos daban 16 errores 500 en 23 s; con la cola, 20 × 201 en 0,3 s. SQLite admite un solo escritor por vez,
 *    así que la cola no le quita nada. Vale para un proceso; con otra base (p. ej. Postgres) esta función se reemplaza
 *    por SELECT … FOR UPDATE o aislamiento SERIALIZABLE, sin tocar los casos de uso.
 */
let cola = Promise.resolve();

function transaccionSequelize(trabajo) {
  const turno = cola.then(() => sequelize.transaction({ type: Transaction.TYPES.IMMEDIATE }, (t) => trabajo(t)));
  // Un trabajo que falla no traba la cola: el error le llega a quien lo pidió por `turno`, no al siguiente
  cola = turno.catch(() => {});
  return turno;
}

export { transaccionEnMemoria, transaccionSequelize };
