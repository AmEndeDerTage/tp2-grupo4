import { SEMILLA_ORDENES } from "../semilla.js";
import activosMemoryDao from "../activos/ActivosMemoryDao.js";

/**
 * Adaptador DAO en memoria para Órdenes (el lado "N" de la relación Activo 1:N Orden).
 * Respeta la misma interfaz pública que OrdenesSequelizeDao: el resto de la aplicación no distingue uno de otro.
 * Colabora con el DAO de Activos en memoria para adjuntar a cada orden un resumen de su activo
 * (`activo: { id, ticker }`), igual que el `include` de Sequelize. El ticker NO se guarda en la orden:
 * se lee del activo cada vez, así que si el activo cambia de ticker, la orden muestra el nuevo.
 * Devuelve siempre copias: nadie de afuera puede modificar el estado interno por accidente.
 */

class OrdenesMemoryDao {
  // Campos privados (ES2022): no se pueden leer ni modificar desde fuera de la clase
  #ordenes;
  #nextId;
  #activosDao;

  constructor(activosDao = activosMemoryDao, ordenesIniciales = SEMILLA_ORDENES) {
    this.#activosDao = activosDao;
    this.#ordenes = ordenesIniciales.map((o) => ({ ...o }));
    this.#nextId = this.#ordenes.reduce((max, o) => (o.id > max ? o.id : max), 0) + 1;
  }

  // Adjunta el resumen del activo, con las mismas columnas que trae el include de Sequelize
  async #withRelations(orden) {
    const activo = await this.#activosDao.getById(orden.activoId);
    return { ...orden, activo: activo ? { id: activo.id, ticker: activo.ticker } : null };
  }

  /**
   * Lista órdenes con filtros, orden y paginación: el equivalente en memoria de WHERE / ORDER BY / LIMIT.
   * filtros: { activoId, estado, sentido, sort ("precioLimite" | "-precioLimite"), page, limit }
   * Sin `limit` devuelve todas las que cumplen los filtros (los casos de uso lo usan para sumar órdenes vivas).
   * Devuelve { items, total }: `total` es la cantidad que cumple los filtros ANTES de paginar.
   */
  async getAll({ activoId, estado, sentido, sort, page = 1, limit } = {}) {
    let resultado = this.#ordenes.filter(
      (o) =>
        (activoId === undefined || o.activoId === Number(activoId)) &&
        (estado === undefined || o.estado === estado) &&
        (sentido === undefined || o.sentido === sentido)
    );
    const total = resultado.length;

    if (sort) {
      const desc = sort.startsWith("-");
      const campo = desc ? sort.slice(1) : sort;
      resultado.sort((a, b) => {
        const valA = a[campo];
        const valB = b[campo];
        if (valA === valB) return a.id - b.id; // desempate estable por id
        // Compara por valor (números) o por código de carácter (textos), igual que SQLite; localeCompare ordenaría distinto
        const cmp = valA < valB ? -1 : 1;
        return desc ? -cmp : cmp;
      });
    }

    if (limit) resultado = resultado.slice((page - 1) * limit, page * limit);

    const items = await Promise.all(resultado.map((o) => this.#withRelations(o)));
    return { items, total };
  }

  async getById(id) {
    const orden = this.#ordenes.find((o) => o.id === Number(id));
    return orden ? this.#withRelations(orden) : null;
  }

  // Toda orden nace "viva"; el id es autoincremental y se ignora cualquier id o estado que venga en los datos.
  // motivo ausente → null, como lo devuelve la base (así los dos modos responden igual).
  async save(data) {
    const { activoId, sentido, cantidad, precioLimite, validaHasta, motivo } = data;
    const nueva = {
      id: this.#nextId++,
      activoId,
      sentido,
      cantidad,
      precioLimite,
      validaHasta,
      estado: "viva",
      motivo: motivo ?? null,
    };
    this.#ordenes.push(nueva);
    return this.#withRelations(nueva);
  }

  // Pisa solo los campos que vienen en `cambios`; el id y el resumen del activo nunca se guardan. Null si no existe.
  async update(id, cambios) {
    const indice = this.#ordenes.findIndex((o) => o.id === Number(id));
    if (indice === -1) return null;

    const { id: _id, activo: _activo, ...cambiosPermitidos } = cambios;
    this.#ordenes[indice] = { ...this.#ordenes[indice], ...cambiosPermitidos };
    return this.#withRelations(this.#ordenes[indice]);
  }

  // Devuelve true si borró, false si no existía
  async delete(id) {
    const indice = this.#ordenes.findIndex((o) => o.id === Number(id));
    if (indice === -1) return false;

    this.#ordenes.splice(indice, 1);
    return true;
  }
}

// Instancia por defecto para la aplicación, y la clase para poder crear otras (p. ej. en tests, con otra semilla)
export { OrdenesMemoryDao };
export default new OrdenesMemoryDao();
