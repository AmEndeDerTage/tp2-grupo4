/**
 * Adaptador DAO en memoria para Activos.
 * Guarda los activos en un array privado. Todos los métodos son `async` para que la firma sea la misma
 * que la del adaptador Sequelize: el resto de la aplicación no distingue uno de otro.
 * Devuelve siempre copias ({ ...x }): nadie de afuera puede modificar el estado interno por accidente.
 */

// Semilla de ejemplo (datos inventados): un activo con posición (L3), uno listo para comprar (L2) y uno en seguimiento (L1)
const SEMILLA = [
  { id: 1, ticker: "KO", nombre: "Coca-Cola", mercado: "NYSE", ratio: 5, nivel: "L3", cantidad: 40, topeCedears: 100 },
  { id: 2, ticker: "AAPL", nombre: "Apple", mercado: "NASDAQ", ratio: 20, nivel: "L2", cantidad: 0, topeCedears: 30 },
  { id: 3, ticker: "GGAL", nombre: "Grupo Financiero Galicia", mercado: "BYMA", ratio: 1, nivel: "L1", cantidad: 0, topeCedears: 50 },
];

class ActivosMemoryDao {
  // Campos privados (ES2022): no se pueden leer ni modificar desde fuera de la clase
  #activos;
  #nextId;

  constructor(activosIniciales = SEMILLA) {
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
        const cmp = typeof valA === "number" ? valA - valB : String(valA).localeCompare(String(valB));
        return desc ? -cmp : cmp;
      });
    }

    if (limit) resultado = resultado.slice((page - 1) * limit, page * limit);

    return { items: resultado.map((a) => ({ ...a })), total };
  }

  async getById(id) {
    const activo = this.#activos.find((a) => a.id === Number(id));
    return activo ? { ...activo } : null;
  }

  // Búsqueda exacta por ticker: la usa el caso de uso para la regla de ticker único
  async getByTicker(ticker) {
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
  async update(id, cambios) {
    const indice = this.#activos.findIndex((a) => a.id === Number(id));
    if (indice === -1) return null;

    const { id: _ignorado, ...cambiosPermitidos } = cambios;
    this.#activos[indice] = { ...this.#activos[indice], ...cambiosPermitidos };
    return { ...this.#activos[indice] };
  }

  // Devuelve true si borró, false si no existía
  async delete(id) {
    const indice = this.#activos.findIndex((a) => a.id === Number(id));
    if (indice === -1) return false;

    this.#activos.splice(indice, 1);
    return true;
  }
}

// Instancia por defecto para la aplicación, y la clase para poder crear otras (p. ej. en tests, con otra semilla)
export { ActivosMemoryDao };
export default new ActivosMemoryDao();
