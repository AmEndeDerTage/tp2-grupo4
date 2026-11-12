import AppError from "../errors/AppError.js";

/**
 * Controlador de Activos.
 * Traduce HTTP ↔ aplicación: saca los datos de `req` (ya validados por Zod), llama al caso de uso
 * y arma `res`. No contiene reglas de negocio ni conoce ningún DAO: recibe los casos de uso
 * ya armados por inyección de dependencias desde el Composition Root.
 * Los métodos son funciones flecha para no perder `this` al pasarlos como handlers de Express.
 */
class ActivosController {
  #useCases;

  constructor(useCases) {
    this.#useCases = useCases;
  }

  // GET /activos?nivel=&mercado=&sort=&page=&limit=
  list = async (req, res) => {
    const resultado = await this.#useCases.getActivos(req.query);
    res.json(resultado);
  };

  // GET /activos/:id
  get = async (req, res) => {
    const activo = await this.#useCases.getActivoById(req.params.id);
    if (!activo) throw new AppError("ACTIVO_NO_ENCONTRADO", `No existe un activo con id ${req.params.id}`, 404);
    res.json(activo);
  };

  // POST /activos → 201 con el header Location: la URL del activo creado (clase 13), donde un GET lo devuelve
  create = async (req, res) => {
    const activo = await this.#useCases.createActivo(req.body);
    res.status(201).location(`/activos/${activo.id}`).json(activo);
  };

  // PUT /activos/:id (parcial)
  update = async (req, res) => {
    const activo = await this.#useCases.updateActivo(req.params.id, req.body);
    if (!activo) throw new AppError("ACTIVO_NO_ENCONTRADO", `No existe un activo con id ${req.params.id}`, 404);
    res.json(activo);
  };

  // DELETE /activos/:id → 204 sin cuerpo
  remove = async (req, res) => {
    const borrado = await this.#useCases.deleteActivo(req.params.id);
    if (!borrado) throw new AppError("ACTIVO_NO_ENCONTRADO", `No existe un activo con id ${req.params.id}`, 404);
    res.status(204).send();
  };

  // GET /activos/:id/ordenes?estado=&sentido=&sort=&page=&limit= (la relación 1:N recorrida desde el activo)
  listOrdenes = async (req, res) => {
    const resultado = await this.#useCases.getOrdenesDeActivo(req.params.id, req.query);
    if (!resultado) throw new AppError("ACTIVO_NO_ENCONTRADO", `No existe un activo con id ${req.params.id}`, 404);
    res.json(resultado);
  };

  // GET /activos/:id/etiquetas (la relación N:N recorrida desde el activo)
  listEtiquetas = async (req, res) => {
    const etiquetas = await this.#useCases.getEtiquetasDeActivo(req.params.id);
    if (!etiquetas) throw new AppError("ACTIVO_NO_ENCONTRADO", `No existe un activo con id ${req.params.id}`, 404);
    res.json(etiquetas);
  };

  // GET /activos/:id/etiquetas/:etiquetaId → 200 con la etiqueta si el activo la tiene (un vínculo; es la URL del Location al asignar)
  getEtiqueta = async (req, res) => {
    const etiqueta = await this.#useCases.getEtiquetaDeActivo(req.params.id, req.params.etiquetaId);
    if (!etiqueta) throw new AppError("ACTIVO_NO_ENCONTRADO", `No existe un activo con id ${req.params.id}`, 404);
    res.json(etiqueta);
  };

  // POST /activos/:id/etiquetas/:etiquetaId → 201 con las etiquetas del activo (se creó un vínculo).
  // Location apunta al vínculo creado, que es la propia URL del pedido (con los ids ya validados por Zod)
  asignarEtiqueta = async (req, res) => {
    const etiquetas = await this.#useCases.asignarEtiqueta(req.params.id, req.params.etiquetaId);
    if (!etiquetas) throw new AppError("ACTIVO_NO_ENCONTRADO", `No existe un activo con id ${req.params.id}`, 404);
    res.status(201).location(`/activos/${req.params.id}/etiquetas/${req.params.etiquetaId}`).json(etiquetas);
  };

  // DELETE /activos/:id/etiquetas/:etiquetaId → 204 sin cuerpo (se borró el vínculo; la etiqueta sigue existiendo)
  quitarEtiqueta = async (req, res) => {
    const quitada = await this.#useCases.quitarEtiqueta(req.params.id, req.params.etiquetaId);
    if (!quitada) throw new AppError("ACTIVO_NO_ENCONTRADO", `No existe un activo con id ${req.params.id}`, 404);
    res.status(204).send();
  };
}

// Se exporta la clase, no una instancia: quien la instancia (con los casos de uso inyectados) es el container
export default ActivosController;
