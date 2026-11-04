import { EventEmitter } from "node:events";

/**
 * Bus de eventos de la aplicación: un EventEmitter de Node (en memoria, un solo proceso).
 * Se crea UNA sola vez, en el Composition Root, y se inyecta: quien emite (los casos de uso)
 * y quien escucha (alerts/) tienen que hablar por el mismo bus, sin conocerse entre sí.
 */
function createEventBus() {
  return new EventEmitter();
}

export default createEventBus;
