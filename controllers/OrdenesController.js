import AppError from "../errors/AppError.js";

/**
 * Controlador de Órdenes.
 * Traduce HTTP ↔ aplicación: saca los datos de `req` (ya validados por Zod), llama al caso de uso
 * y arma `res`. No contiene reglas de negocio ni conoce ningún DAO: recibe los casos de uso
 * ya armados por inyección de dependencias desde el Composition Root.
 * Los métodos son funciones flecha para no perder `this` al pasarlos como handlers de Express.
 */
class OrdenesController {
  #useCases;

  constructor(useCases) {
    this.#useCases = useCases;
  }

  // GET /ordenes?estado=&sentido=&activoId=&sort=&page=&limit=
  list = async (req, res) => {
    const resultado = await this.#useCases.getOrdenes(req.query);
    res.json(resultado);
  };

  // GET /ordenes/:id
  get = async (req, res) => {
    const orden = await this.#useCases.getOrdenById(req.params.id);
    if (!orden) throw new AppError("ORDEN_NO_ENCONTRADA", `No existe una orden con id ${req.params.id}`, 404);
    res.json(orden);
  };

  // POST /ordenes → 201 (las reglas de negocio las aplica el caso de uso; si alguna falla, el AppError llega al errorHandler)
  create = async (req, res) => {
    const orden = await this.#useCases.createOrden(req.body);
    res.status(201).json(orden);
  };

  // PUT /ordenes/:id (parcial: cantidad, precioLimite, validaHasta, motivo)
  update = async (req, res) => {
    const orden = await this.#useCases.updateOrden(req.params.id, req.body);
    if (!orden) throw new AppError("ORDEN_NO_ENCONTRADA", `No existe una orden con id ${req.params.id}`, 404);
    res.json(orden);
  };

  // DELETE /ordenes/:id → 204 sin cuerpo
  remove = async (req, res) => {
    const borrada = await this.#useCases.deleteOrden(req.params.id);
    if (!borrada) throw new AppError("ORDEN_NO_ENCONTRADA", `No existe una orden con id ${req.params.id}`, 404);
    res.status(204).send();
  };
}

// Se exporta la clase, no una instancia: quien la instancia (con los casos de uso inyectados) es el container
export default OrdenesController;
