import { SEMILLA_ETIQUETAS } from "../semilla.js";

/**
 * Adaptador DAO en memoria para Etiquetas.
 * Misma interfaz pública que EtiquetasSequelizeDao: mismos métodos, mismos parámetros y objetos planos con la misma forma.
 * Devuelve siempre copias ({ ...x }): nadie de afuera puede modificar el estado interno por accidente.
 * Los métodos que se usan dentro de una transacción reciben un `_tx` al final, por simetría con Sequelize, y lo ignoran
 * (ver dao/transacciones.js).
 */
class EtiquetasMemoryDao {
  #etiquetas;
  #nextId;

  constructor(etiquetasIniciales = SEMILLA_ETIQUETAS) {
    this.#etiquetas = etiquetasIniciales.map((e) => ({ ...e }));
    this.#nextId = this.#etiquetas.reduce((max, e) => (e.id > max ? e.id : max), 0) + 1;
  }

  /**
   * Lista etiquetas con orden y paginación: el equivalente en memoria de ORDER BY / LIMIT.
   * filtros: { sort ("nombre" | "-nombre" | "id" | "-id"), page, limit }
   * Devuelve { items, total }: `total` es la cantidad ANTES de paginar.
   */
  async getAll({ sort, page = 1, limit } = {}) {
    let resultado = [...this.#etiquetas];
    const total = resultado.length;

    if (sort) {
      const desc = sort.startsWith("-");
      const campo = desc ? sort.slice(1) : sort;
      resultado.sort((a, b) => {
        if (a[campo] === b[campo]) return a.id - b.id; // desempate estable por id
        // Por código de carácter, igual que SQLite (ver C2 en el registro de divergencias)
        const cmp = a[campo] < b[campo] ? -1 : 1;
        return desc ? -cmp : cmp;
      });
    }

    if (limit) resultado = resultado.slice((page - 1) * limit, page * limit);

    return { items: resultado.map((e) => ({ ...e })), total };
  }

  async getById(id, _tx) {
    const etiqueta = this.#etiquetas.find((e) => e.id === Number(id));
    return etiqueta ? { ...etiqueta } : null;
  }

  // Búsqueda exacta por nombre: la usa el caso de uso para la regla del nombre único
  async getByNombre(nombre, _tx) {
    const etiqueta = this.#etiquetas.find((e) => e.nombre === nombre);
    return etiqueta ? { ...etiqueta } : null;
  }

  // Asigna el id autoincremental e ignora cualquier `id` que venga en los datos
  async save(data, _tx) {
    const { id: _ignorado, nombre } = data;
    const nueva = { id: this.#nextId++, nombre };
    this.#etiquetas.push(nueva);
    return { ...nueva };
  }

  // Pisa solo los campos que vienen en `cambios`; el id nunca se modifica. Devuelve null si no existe.
  async update(id, cambios, _tx) {
    const etiqueta = this.#etiquetas.find((e) => e.id === Number(id));
    if (!etiqueta) return null;

    if (cambios.nombre !== undefined) etiqueta.nombre = cambios.nombre;
    return { ...etiqueta };
  }

  // Devuelve true si borró, false si no existía
  async delete(id, _tx) {
    const indice = this.#etiquetas.findIndex((e) => e.id === Number(id));
    if (indice === -1) return false;

    this.#etiquetas.splice(indice, 1);
    return true;
  }
}

// Instancia por defecto para la aplicación, y la clase para poder crear otras (p. ej. en tests, con otra semilla)
export { EtiquetasMemoryDao };
export default new EtiquetasMemoryDao();
