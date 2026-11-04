import { ActivoModel, OrdenModel } from "../models/index.js";
import { SEMILLA_ORDENES } from "../semilla.js";

// Columnas pedidas explícitamente, en el mismo orden en que las devuelve el DAO en memoria
const ATRIBUTOS = ["id", "activoId", "sentido", "cantidad", "precioLimite", "validaHasta", "estado", "motivo"];

// Trae el activo de cada orden en la misma consulta (JOIN): el equivalente de #withRelations en memoria
const INCLUDE = [{ model: ActivoModel, as: "activo", attributes: ["id", "ticker"] }];

/**
 * Adaptador DAO de Órdenes con Sequelize (SQLite), el lado "N" de la relación Activo 1:N Orden.
 * Respeta la misma interfaz pública que OrdenesMemoryDao.
 * La tabla `ordenes` ya la creó sequelize.sync() en ActivosSequelizeDao.init(): el container inicializa Activos primero.
 */
class OrdenesSequelizeDao {
  // Siembra si la tabla está vacía. Va después de la semilla de Activos: la clave foránea exige que el activo exista.
  async init() {
    const cantidad = await OrdenModel.count();
    if (cantidad === 0) {
      await OrdenModel.bulkCreate(SEMILLA_ORDENES);
    }
  }

  /**
   * Lista órdenes: los filtros, el orden y la paginación los resuelve la base (WHERE / ORDER BY / LIMIT).
   * filtros: { activoId, estado, sentido, sort ("precioLimite" | "-precioLimite"), page, limit }
   * Sin `limit` devuelve todas las que cumplen los filtros (los casos de uso lo usan para sumar órdenes vivas).
   * Devuelve { items, total }: `total` es la cantidad que cumple los filtros ANTES de paginar.
   */
  async getAll({ activoId, estado, sentido, sort, page = 1, limit } = {}) {
    const where = {};
    if (activoId !== undefined) where.activoId = activoId;
    if (estado !== undefined) where.estado = estado;
    if (sentido !== undefined) where.sentido = sentido;

    const order = [["id", "ASC"]]; // Desempate estable por id, igual que en memoria
    if (sort) order.unshift([sort.replace(/^-/, ""), sort.startsWith("-") ? "DESC" : "ASC"]);

    const { rows, count } = await OrdenModel.findAndCountAll({
      where,
      attributes: ATRIBUTOS,
      include: INCLUDE,
      order,
      ...(limit && { limit, offset: (page - 1) * limit }),
    });
    return { items: rows.map((o) => o.get({ plain: true })), total: count };
  }

  async getById(id) {
    const orden = await OrdenModel.findByPk(id, { attributes: ATRIBUTOS, include: INCLUDE });
    return orden ? orden.get({ plain: true }) : null;
  }
}

// Instancia por defecto para la aplicación, y la clase para poder crear otras
export { OrdenesSequelizeDao };
export default new OrdenesSequelizeDao();
