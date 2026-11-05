import { Op, literal } from "sequelize";
import { ActivoModel, OrdenModel } from "../models/index.js";
import { SEMILLA_ORDENES } from "../semilla.js";
import { transaccionSequelize } from "../transacciones.js";

// Columnas pedidas explícitamente, en el mismo orden en que las devuelve el DAO en memoria
const ATRIBUTOS = ["id", "activoId", "sentido", "cantidad", "precioLimite", "validaHasta", "estado", "motivo"];

// Trae el activo de cada orden en la misma consulta (JOIN): el equivalente de #withRelations en memoria
const INCLUDE = [{ model: ActivoModel, as: "activo", attributes: ["id", "ticker"] }];

/**
 * Adaptador DAO de Órdenes con Sequelize (SQLite), el lado "N" de la relación Activo 1:N Orden.
 * Respeta la misma interfaz pública que OrdenesMemoryDao.
 * La tabla `ordenes` ya la creó sequelize.sync() en ActivosSequelizeDao.init(): el container inicializa Activos primero.
 * Los métodos que se usan dentro de una transacción reciben un `tx` opcional al final y lo pasan a cada consulta.
 * Ojo con las relecturas (save y update releen con getById): también llevan `tx`. Una fila recién escrita en una
 * transacción todavía no confirmada solo es visible dentro de esa transacción.
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
  async getAll({ activoId, estado, sentido, sort, page = 1, limit } = {}, tx) {
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
      transaction: tx,
      ...(limit && { limit, offset: (page - 1) * limit }),
    });
    return { items: rows.map((o) => o.get({ plain: true })), total: count };
  }

  async getById(id, tx) {
    const orden = await OrdenModel.findByPk(id, { attributes: ATRIBUTOS, include: INCLUDE, transaction: tx });
    return orden ? orden.get({ plain: true }) : null;
  }

  // Toda orden nace "viva"; la base asigna el id y se ignora cualquier id o estado que venga en los datos.
  // motivo ausente → null. Después de crear se relee para devolverla con su activo, igual que en memoria.
  async save(data, tx) {
    const { activoId, sentido, cantidad, precioLimite, validaHasta, motivo } = data;
    const nueva = await OrdenModel.create(
      { activoId, sentido, cantidad, precioLimite, validaHasta, estado: "viva", motivo: motivo ?? null },
      { transaction: tx }
    );
    return this.getById(nueva.id, tx);
  }

  // Pisa solo los campos que vienen en `cambios`; el id y el resumen del activo nunca se guardan. Null si no existe.
  async update(id, cambios, tx) {
    const orden = await OrdenModel.findByPk(id, { attributes: ATRIBUTOS, transaction: tx });
    if (!orden) return null;

    const { id: _id, activo: _activo, ...cambiosPermitidos } = cambios;
    await orden.update(cambiosPermitidos, { transaction: tx });
    return this.getById(id, tx);
  }

  /**
   * Ejecuta una orden viva en UNA transacción, con dos UPDATE condicionales (el patrón lend() del profesor):
   *  1. la orden pasa a "ejecutada" solo si sigue "viva" (WHERE estado = 'viva');
   *  2. la cartera del activo se mueve (+ en compra, − en venta) solo si no queda negativa
   *     (WHERE cantidad >= lo que se vende), junto con `cambiosActivo` (p. ej. { nivel: "L3" }).
   * Devuelve la orden ejecutada, o null si no existe o no estaba viva.
   * Si el 1 no encuentra fila, todavía no cambió nada: devuelve null. Si el 2 no encuentra fila, el 1 YA se escribió:
   * se LANZA un error para que la transacción haga rollback y la orden vuelva a "viva" (devolver null confirmaría el 1).
   * Usa la transacción del caso de uso (`tx`); si no recibe ninguna, abre la suya, como lend().
   */
  async ejecutar(id, cambiosActivo = {}, tx) {
    const trabajo = async (t) => {
      const orden = await OrdenModel.findByPk(id, { attributes: ["id", "activoId", "sentido", "cantidad"], transaction: t });
      if (!orden) return false;

      const [marcadas] = await OrdenModel.update({ estado: "ejecutada" }, { where: { id, estado: "viva" }, transaction: t });
      if (marcadas === 0) return false;

      const delta = orden.sentido === "compra" ? orden.cantidad : -orden.cantidad;
      const { id: _id, cantidad: _cantidad, ...cambiosPermitidos } = cambiosActivo;
      const [ajustados] = await ActivoModel.update(
        { cantidad: literal(`cantidad + ${delta}`), ...cambiosPermitidos },
        { where: { id: orden.activoId, cantidad: { [Op.gte]: Math.max(0, -delta) } }, transaction: t }
      );
      if (ajustados === 0) {
        throw new Error(`No se pudo mover la cartera del activo ${orden.activoId} al ejecutar la orden ${id}`);
      }
      return true;
    };

    const ejecutada = tx ? await trabajo(tx) : await transaccionSequelize(trabajo);
    return ejecutada ? this.getById(id, tx) : null;
  }

  // Devuelve true si borró, false si no existía
  async delete(id, tx) {
    const borrados = await OrdenModel.destroy({ where: { id }, transaction: tx });
    return borrados > 0;
  }
}

// Instancia por defecto para la aplicación, y la clase para poder crear otras
export { OrdenesSequelizeDao };
export default new OrdenesSequelizeDao();
