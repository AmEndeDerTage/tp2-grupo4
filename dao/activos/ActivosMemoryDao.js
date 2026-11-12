import { SEMILLA_ACTIVOS, SEMILLA_ACTIVO_ETIQUETAS } from "../semilla.js";
import etiquetasMemoryDao from "../etiquetas/EtiquetasMemoryDao.js";

/**
 * Adaptador DAO en memoria para Activos.
 * Guarda los activos en un array privado. Todos los métodos son `async` para que la firma sea la misma
 * que la del adaptador Sequelize: el resto de la aplicación no distingue uno de otro.
 * Devuelve siempre copias ({ ...x }): nadie de afuera puede modificar el estado interno por accidente.
 * Los métodos que se usan dentro de una transacción reciben un `_tx` al final, por simetría con Sequelize, y lo ignoran:
 * en memoria no hay transacción que pasar (ver dao/transacciones.js).
 *
 * Relación N:N con Etiquetas: los vínculos (el equivalente de la tabla intermedia activo_etiquetas) viven acá, en un
 * array de pares { activoId, etiquetaId }, porque el vínculo se maneja como «las etiquetas del activo». Para devolver
 * el nombre de cada etiqueta colabora con el DAO de Etiquetas en memoria, inyectado por constructor (como Órdenes con Activos).
 */

class ActivosMemoryDao {
  // Campos privados (ES2022): no se pueden leer ni modificar desde fuera de la clase
  #activos;
  #nextId;
  #vinculos;
  #etiquetasDao;

  constructor(activosIniciales = SEMILLA_ACTIVOS, vinculosIniciales = SEMILLA_ACTIVO_ETIQUETAS, etiquetasDao = etiquetasMemoryDao) {
    this.#activos = activosIniciales.map((a) => ({ ...a }));
    this.#nextId = this.#activos.reduce((max, a) => (a.id > max ? a.id : max), 0) + 1;
    this.#vinculos = vinculosIniciales.map((v) => ({ ...v }));
    this.#etiquetasDao = etiquetasDao;
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

  /**
   * Mueve la cartera: suma `delta` a la cantidad (negativo = resta) y aplica `cambios` extra (p. ej. { nivel: "L3" }).
   * Condicional, como adjustStock del profesor: si el activo no existe o la cantidad quedaría negativa, no toca nada
   * y devuelve null. Entre la comprobación y la modificación no hay ningún await: ningún otro pedido puede meterse
   * en el medio, así que comprobar-y-modificar es atómico sin transacción. La usa OrdenesMemoryDao.ejecutar.
   */
  async ajustarCantidad(id, delta, cambios = {}, _tx) {
    const activo = this.#activos.find((a) => a.id === Number(id));
    if (!activo || activo.cantidad + delta < 0) return null;

    const { id: _ignorado, cantidad: _cantidad, ...cambiosPermitidos } = cambios;
    activo.cantidad += delta;
    Object.assign(activo, cambiosPermitidos);
    return { ...activo };
  }

  /**
   * Las etiquetas de un activo, ordenadas por id: [{ id, nombre }]. Lista vacía si no tiene (o si el activo no existe:
   * de eso se ocupa el caso de uso). Recorre la N:N desde el lado del activo, como activo.getEtiquetas() en Sequelize.
   */
  async getEtiquetas(activoId, _tx) {
    const ids = this.#vinculos
      .filter((v) => v.activoId === Number(activoId))
      .map((v) => v.etiquetaId)
      .sort((a, b) => a - b);
    const etiquetas = await Promise.all(ids.map((etiquetaId) => this.#etiquetasDao.getById(etiquetaId)));
    return etiquetas.filter(Boolean).map(({ id, nombre }) => ({ id, nombre }));
  }

  // Devuelve true si borró, false si no existía.
  // Se lleva sus vínculos con etiquetas, como el ON DELETE CASCADE de activo_etiquetas en la base: un vínculo colgado
  // de un activo que ya no existe haría que los dos modos respondan distinto.
  async delete(id, _tx) {
    const indice = this.#activos.findIndex((a) => a.id === Number(id));
    if (indice === -1) return false;

    this.#activos.splice(indice, 1);
    this.#vinculos = this.#vinculos.filter((v) => v.activoId !== Number(id));
    return true;
  }
}

// Instancia por defecto para la aplicación, y la clase para poder crear otras (p. ej. en tests, con otra semilla)
export { ActivosMemoryDao };
export default new ActivosMemoryDao();
