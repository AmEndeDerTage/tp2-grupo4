import AppError from "../errors/AppError.js";

/**
 * Controlador de Etiquetas.
 * Traduce HTTP ↔ aplicación: saca los datos de `req` (ya validados por Zod), llama al caso de uso y arma `res`.
 * No contiene reglas de negocio ni conoce ningún DAO: recibe los casos de uso ya armados desde el Composition Root.
 * Los métodos son funciones flecha para no perder `this` al pasarlos como handlers de Express.
 */
class EtiquetasController {
  #useCases;

  constructor(useCases) {
    this.#useCases = useCases;
  }

  // GET /etiquetas?sort=&page=&limit=
  list = async (req, res) => {
    res.json(await this.#useCases.getEtiquetas(req.query));
  };

  // GET /etiquetas/:id
  get = async (req, res) => {
    const etiqueta = await this.#useCases.getEtiquetaById(req.params.id);
    if (!etiqueta) throw new AppError("ETIQUETA_NO_ENCONTRADA", `No existe una etiqueta con id ${req.params.id}`, 404);
    res.json(etiqueta);
  };

  // POST /etiquetas → 201
  create = async (req, res) => {
    const etiqueta = await this.#useCases.createEtiqueta(req.body);
    res.status(201).json(etiqueta);
  };

  // PUT /etiquetas/:id (parcial)
  update = async (req, res) => {
    const etiqueta = await this.#useCases.updateEtiqueta(req.params.id, req.body);
    if (!etiqueta) throw new AppError("ETIQUETA_NO_ENCONTRADA", `No existe una etiqueta con id ${req.params.id}`, 404);
    res.json(etiqueta);
  };

  // DELETE /etiquetas/:id → 204 sin cuerpo
  remove = async (req, res) => {
    const borrada = await this.#useCases.deleteEtiqueta(req.params.id);
    if (!borrada) throw new AppError("ETIQUETA_NO_ENCONTRADA", `No existe una etiqueta con id ${req.params.id}`, 404);
    res.status(204).send();
  };
}

// Se exporta la clase, no una instancia: quien la instancia (con los casos de uso inyectados) es el container
export default EtiquetasController;
