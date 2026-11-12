import { UniqueConstraintError } from "sequelize";
import { sequelize, ActivoModel } from "../models/index.js";
import { SEMILLA_ACTIVOS } from "../semilla.js";
import AppError from "../../errors/AppError.js";

// Columnas pedidas explícitamente (evita un SELECT *), en el mismo orden en que las devuelve el DAO en memoria
const ATRIBUTOS = ["id", "ticker", "nombre", "mercado", "ratio", "nivel", "cantidad", "topeCedears"];

/**
 * Adaptador DAO de Activos con Sequelize (SQLite).
 * Respeta la misma interfaz pública que ActivosMemoryDao: mismos métodos, mismos parámetros y objetos planos
 * con la misma forma. Por eso los casos de uso no distinguen uno de otro.
 * Los métodos que se usan dentro de una transacción reciben un `tx` opcional al final y lo pasan a cada consulta
 * (`transaction: tx`): así leen y escriben dentro de la transacción del caso de uso. Sin `tx`, van por fuera.
 */
class ActivosSequelizeDao {
  /**
   * Crea las tablas que falten y siembra la de activos si está vacía.
   * sync() crea TODAS las tablas de los modelos asociados, también `ordenes`.
   *
   * sync() simple y NO sync({ alter: true }) como en el ejemplo de la materia: en SQLite, `alter` reconstruye cada
   * tabla borrándola, y al borrar `activos` la clave foránea actúa sobre `ordenes`. Probado: con CASCADE el segundo
   * arranque pierde todas las órdenes y con RESTRICT el servidor no arranca; además se pierde el AUTOINCREMENT.
   * Costo: si cambia un modelo hay que borrar database.sqlite (son datos de prueba). En producción: migraciones.
   */
  async init() {
    await sequelize.sync();

    const cantidad = await ActivoModel.count();
    if (cantidad === 0) {
      await ActivoModel.bulkCreate(SEMILLA_ACTIVOS);
    }
  }

  /**
   * Lista activos: los filtros, el orden y la paginación los resuelve la base (WHERE / ORDER BY / LIMIT).
   * filtros: { nivel, mercado, sort ("ticker" | "-ticker"), page, limit }
   * Devuelve { items, total }: `total` es la cantidad que cumple los filtros ANTES de paginar.
   */
  async getAll({ nivel, mercado, sort, page = 1, limit } = {}) {
    const where = {};
    if (nivel !== undefined) where.nivel = nivel;
    if (mercado !== undefined) where.mercado = mercado;

    const order = [["id", "ASC"]]; // Desempate estable por id, igual que en memoria
    if (sort) order.unshift([sort.replace(/^-/, ""), sort.startsWith("-") ? "DESC" : "ASC"]);

    const { rows, count } = await ActivoModel.findAndCountAll({
      where,
      attributes: ATRIBUTOS,
      order,
      ...(limit && { limit, offset: (page - 1) * limit }),
    });
    // get({ plain: true }) convierte la instancia del ORM en un objeto plano
    return { items: rows.map((a) => a.get({ plain: true })), total: count };
  }

  async getById(id, tx) {
    const activo = await ActivoModel.findByPk(id, { attributes: ATRIBUTOS, transaction: tx });
    return activo ? activo.get({ plain: true }) : null;
  }

  // Búsqueda exacta por ticker: la usa el caso de uso para la regla de ticker único
  async getByTicker(ticker, tx) {
    const activo = await ActivoModel.findOne({ where: { ticker }, attributes: ATRIBUTOS, transaction: tx });
    return activo ? activo.get({ plain: true }) : null;
  }

  // La base asigna el id autoincremental; se ignora cualquier `id` que venga en los datos
  async save(data) {
    const { id: _ignorado, ...datos } = data;
    try {
      const nuevo = await ActivoModel.create(datos);
      return this.getById(nuevo.id);
    } catch (error) {
      this.#traducirTickerDuplicado(error, datos.ticker);
    }
  }

  // Pisa solo los campos que vienen en `cambios`; el id nunca se modifica. Devuelve null si no existe.
  async update(id, cambios, tx) {
    const activo = await ActivoModel.findByPk(id, { attributes: ATRIBUTOS, transaction: tx });
    if (!activo) return null;

    const { id: _ignorado, ...cambiosPermitidos } = cambios;
    try {
      await activo.update(cambiosPermitidos, { transaction: tx });
      return activo.get({ plain: true });
    } catch (error) {
      this.#traducirTickerDuplicado(error, cambiosPermitidos.ticker);
    }
  }

  /**
   * Las etiquetas de un activo, ordenadas por id: [{ id, nombre }]. Lista vacía si no tiene (o si el activo no existe).
   * activo.getEtiquetas() es uno de los métodos que genera belongsToMany; joinTableAttributes: [] evita que cada etiqueta
   * traiga además la fila de la tabla intermedia.
   */
  async getEtiquetas(activoId, tx) {
    const activo = await ActivoModel.findByPk(activoId, { attributes: ["id"], transaction: tx });
    if (!activo) return [];
    const etiquetas = await activo.getEtiquetas({
      attributes: ["id", "nombre"],
      joinTableAttributes: [],
      order: [["id", "ASC"]],
      transaction: tx,
    });
    return etiquetas.map((e) => e.get({ plain: true }));
  }

  // Devuelve true si borró, false si no existía. Sus vínculos con etiquetas los borra la base (ON DELETE CASCADE)
  async delete(id, tx) {
    const borrados = await ActivoModel.destroy({ where: { id }, transaction: tx });
    return borrados > 0;
  }

  /**
   * Dos pedidos simultáneos con el mismo ticker pasan los dos el chequeo de la regla 2 en el caso de uso, y el segundo
   * choca contra el UNIQUE de la base. Se traduce a su error de dominio: sin esto sería un 500 y en memoria, un 409.
   */
  #traducirTickerDuplicado(error, ticker) {
    if (error instanceof UniqueConstraintError) {
      throw new AppError("TICKER_DUPLICADO", `Ya existe un activo con el ticker ${ticker}`, 409);
    }
    throw error;
  }
}

// Instancia por defecto para la aplicación, y la clase para poder crear otras
export { ActivosSequelizeDao };
export default new ActivosSequelizeDao();
