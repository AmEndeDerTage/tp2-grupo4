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

  // POST /activos → 201
  create = async (req, res) => {
    const activo = await this.#useCases.createActivo(req.body);
    res.status(201).json(activo);
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
}

// Se exporta la clase, no una instancia: quien la instancia (con los casos de uso inyectados) es el container
export default ActivosController;
