import { UniqueConstraintError } from "sequelize";
import { EtiquetaModel } from "../models/index.js";
import { SEMILLA_ETIQUETAS } from "../semilla.js";
import AppError from "../../errors/AppError.js";

// Columnas pedidas explícitamente, en el mismo orden en que las devuelve el DAO en memoria
const ATRIBUTOS = ["id", "nombre"];

/**
 * Adaptador DAO de Etiquetas con Sequelize (SQLite). Misma interfaz pública que EtiquetasMemoryDao.
 * La tabla `etiquetas` ya la creó sequelize.sync() en ActivosSequelizeDao.init(): el container inicializa Activos primero.
 * Los métodos que se usan dentro de una transacción reciben un `tx` opcional al final y lo pasan a cada consulta.
 */
class EtiquetasSequelizeDao {
  // Siembra si la tabla está vacía
  async init() {
    const cantidad = await EtiquetaModel.count();
    if (cantidad === 0) {
      await EtiquetaModel.bulkCreate(SEMILLA_ETIQUETAS);
    }
  }

  /**
   * Lista etiquetas: el orden y la paginación los resuelve la base (ORDER BY / LIMIT).
   * Devuelve { items, total }: `total` es la cantidad ANTES de paginar.
   */
  async getAll({ sort, page = 1, limit } = {}) {
    const order = [["id", "ASC"]]; // Desempate estable por id, igual que en memoria
    if (sort) order.unshift([sort.replace(/^-/, ""), sort.startsWith("-") ? "DESC" : "ASC"]);

    const { rows, count } = await EtiquetaModel.findAndCountAll({
      attributes: ATRIBUTOS,
      order,
      ...(limit && { limit, offset: (page - 1) * limit }),
    });
    return { items: rows.map((e) => e.get({ plain: true })), total: count };
  }

  async getById(id, tx) {
    const etiqueta = await EtiquetaModel.findByPk(id, { attributes: ATRIBUTOS, transaction: tx });
    return etiqueta ? etiqueta.get({ plain: true }) : null;
  }

  // Búsqueda exacta por nombre: la usa el caso de uso para la regla del nombre único
  async getByNombre(nombre, tx) {
    const etiqueta = await EtiquetaModel.findOne({ where: { nombre }, attributes: ATRIBUTOS, transaction: tx });
    return etiqueta ? etiqueta.get({ plain: true }) : null;
  }

  // La base asigna el id autoincremental; se ignora cualquier `id` que venga en los datos
  async save(data, tx) {
    const { nombre } = data;
    try {
      const nueva = await EtiquetaModel.create({ nombre }, { transaction: tx });
      return this.getById(nueva.id, tx);
    } catch (error) {
      this.#traducirNombreDuplicado(error, nombre);
    }
  }

  // Pisa solo los campos que vienen en `cambios`; el id nunca se modifica. Devuelve null si no existe.
  async update(id, cambios, tx) {
    const etiqueta = await EtiquetaModel.findByPk(id, { attributes: ATRIBUTOS, transaction: tx });
    if (!etiqueta) return null;

    const { nombre } = cambios;
    try {
      if (nombre !== undefined) await etiqueta.update({ nombre }, { transaction: tx });
      return etiqueta.get({ plain: true });
    } catch (error) {
      this.#traducirNombreDuplicado(error, nombre);
    }
  }

  // Devuelve true si borró, false si no existía
  async delete(id, tx) {
    const borradas = await EtiquetaModel.destroy({ where: { id }, transaction: tx });
    return borradas > 0;
  }

  // Dos altas simultáneas con el mismo nombre pasan las dos el chequeo del caso de uso; la segunda choca contra el
  // UNIQUE de la base. Se traduce a su error de dominio (mismo criterio que el ticker, B11): sin esto sería un 500.
  #traducirNombreDuplicado(error, nombre) {
    if (error instanceof UniqueConstraintError) {
      throw new AppError("ETIQUETA_DUPLICADA", `Ya existe una etiqueta con el nombre ${nombre}`, 409);
    }
    throw error;
  }
}

export { EtiquetasSequelizeDao };
export default new EtiquetasSequelizeDao();
