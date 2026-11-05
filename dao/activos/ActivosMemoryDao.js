import { SEMILLA_ACTIVOS } from "../semilla.js";

/**
 * Adaptador DAO en memoria para Activos.
 * Guarda los activos en un array privado. Todos los métodos son `async` para que la firma sea la misma
 * que la del adaptador Sequelize: el resto de la aplicación no distingue uno de otro.
 * Devuelve siempre copias ({ ...x }): nadie de afuera puede modificar el estado interno por accidente.
 * Los métodos que se usan dentro de una transacción reciben un `_tx` al final, por simetría con Sequelize, y lo ignoran:
 * en memoria no hay transacción que pasar (ver dao/transacciones.js).
 */

class ActivosMemoryDao {
  // Campos privados (ES2022): no se pueden leer ni modificar desde fuera de la clase
  #activos;
  #nextId;

  constructor(activosIniciales = SEMILLA_ACTIVOS) {
    this.#activos = activosIniciales.map((a) => ({ ...a }));
    this.#nextId = this.#activos.reduce((max, a) => (a.id > max ? a.id : max), 0) + 1;
  }

  /**
   * Lista activos con filtros, orden y paginación: el equivalente en memoria de WHERE / ORDER BY / LIMIT.
   * filtros: { nivel, mercado, sort ("ticker" | "-ticker"), page, limit }
   * Devuelve { items, total }: `total` es la cantidad que cumple los filtros ANTES de paginar,
   * para que el caso de uso pueda armar la metadata de paginación.
   */
  async getAll({ nivel, mercado, sort, page = 1, limit } = {}) {
    let resultado = this.#activos.filter(
      (a) => (nivel === undefined || a.nivel === nivel) && (mercado === undefined || a.mercado === mercado)
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

    return { items: resultado.map((a) => ({ ...a })), total };
  }

  async getById(id, _tx) {
    const activo = this.#activos.find((a) => a.id === Number(id));
    return activo ? { ...activo } : null;
  }

  // Búsqueda exacta por ticker: la usa el caso de uso para la regla de ticker único
  async getByTicker(ticker, _tx) {
    const activo = this.#activos.find((a) => a.ticker === ticker);
    return activo ? { ...activo } : null;
  }

  // Asigna el id autoincremental e ignora cualquier `id` que venga en los datos
  async save(data) {
    const { id: _ignorado, ...datos } = data;
    const nuevo = { id: this.#nextId++, ...datos };
    this.#activos.push(nuevo);
    return { ...nuevo };
  }

  // Pisa solo los campos que vienen en `cambios`; el id nunca se modifica. Devuelve null si no existe.
  async update(id, cambios, _tx) {
    const indice = this.#activos.findIndex((a) => a.id === Number(id));
    if (indice === -1) return null;

    const { id: _ignorado, ...cambiosPermitidos } = cambios;
    this.#activos[indice] = { ...this.#activos[indice], ...cambiosPermitidos };
    return { ...this.#activos[indice] };
  }

  // Devuelve true si borró, false si no existía
  async delete(id, _tx) {
    const indice = this.#activos.findIndex((a) => a.id === Number(id));
    if (indice === -1) return false;

    this.#activos.splice(indice, 1);
    return true;
  }
}

// Instancia por defecto para la aplicación, y la clase para poder crear otras (p. ej. en tests, con otra semilla)
export { ActivosMemoryDao };
export default new ActivosMemoryDao();
