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
 * Todo activo que sale de este DAO trae sus etiquetas anidadas (`etiquetas: [{ id, nombre }]`), igual que el include de
 * Sequelize; salvo getByTicker y ajustarCantidad, que son de uso interno de los casos de uso y del DAO de Órdenes.
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

  // Adjunta las etiquetas del activo, con las mismas columnas que trae el include de Sequelize (como #withRelations en Órdenes)
  async #conEtiquetas(activo) {
    return { ...activo, etiquetas: await this.getEtiquetas(activo.id) };
  }

  /**
   * Lista activos con filtros, orden y paginación: el equivalente en memoria de WHERE / ORDER BY / LIMIT.
   * filtros: { nivel, mercado, etiqueta (nombre), sort ("ticker" | "-ticker"), page, limit }
   * Devuelve { items, total }: `total` es la cantidad que cumple los filtros ANTES de paginar,
   * para que el caso de uso pueda armar la metadata de paginación.
   * Con `etiqueta`, quedan los activos que la tienen, cada uno con TODAS sus etiquetas anidadas. Una etiqueta que no
   * existe no es un error: el filtro no encuentra nada (total 0), como un nivel sin activos.
   */
  async getAll({ nivel, mercado, etiqueta, sort, page = 1, limit } = {}) {
    let conEtiqueta = null; // ids de los activos que tienen la etiqueta pedida (null = sin ese filtro)
    if (etiqueta !== undefined) {
      const buscada = await this.#etiquetasDao.getByNombre(etiqueta);
      conEtiqueta = new Set(buscada ? this.#vinculos.filter((v) => v.etiquetaId === buscada.id).map((v) => v.activoId) : []);
    }

    let resultado = this.#activos.filter(
      (a) =>
        (nivel === undefined || a.nivel === nivel) &&
        (mercado === undefined || a.mercado === mercado) &&
        (conEtiqueta === null || conEtiqueta.has(a.id))
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

    const items = await Promise.all(resultado.map((a) => this.#conEtiquetas(a)));
    return { items, total };
  }

  async getById(id, _tx) {
    const activo = this.#activos.find((a) => a.id === Number(id));
    return activo ? this.#conEtiquetas(activo) : null;
  }

  // Búsqueda exacta por ticker: la usa el caso de uso para la regla de ticker único (sin etiquetas: solo hace falta el id)
  async getByTicker(ticker, _tx) {
    const activo = this.#activos.find((a) => a.ticker === ticker);
    return activo ? { ...activo } : null;
  }

  // Asigna el id autoincremental e ignora cualquier `id` que venga en los datos
  async save(data) {
    const { id: _ignorado, ...datos } = data;
    const nuevo = { id: this.#nextId++, ...datos };
    this.#activos.push(nuevo);
    return this.#conEtiquetas(nuevo);
  }

  // Pisa solo los campos que vienen en `cambios`; el id nunca se modifica. Devuelve null si no existe.
  async update(id, cambios, _tx) {
    const indice = this.#activos.findIndex((a) => a.id === Number(id));
    if (indice === -1) return null;

    const { id: _ignorado, ...cambiosPermitidos } = cambios;
    const { etiquetas: _etiquetas, ...sinEtiquetas } = cambiosPermitidos; // las etiquetas se cambian por sus endpoints
    this.#activos[indice] = { ...this.#activos[indice], ...sinEtiquetas };
    return this.#conEtiquetas(this.#activos[indice]);
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

  // ¿El activo tiene esa etiqueta? (el caso de uso lo pregunta para responder ETIQUETA_YA_ASIGNADA / ETIQUETA_NO_ASIGNADA)
  async tieneEtiqueta(activoId, etiquetaId, _tx) {
    return this.#vinculos.some((v) => v.activoId === Number(activoId) && v.etiquetaId === Number(etiquetaId));
  }

  /**
   * Crea el vínculo activo–etiqueta. Las reglas (que el activo y la etiqueta existan, que no esté ya asignada) las verifica
   * el caso de uso; acá quedan como segunda barrera, igual que la clave foránea y la clave primaria compuesta de la base:
   * si se saltearan, en los dos modos el vínculo no se crea y el error termina en 500.
   */
  async asignarEtiqueta(activoId, etiquetaId, _tx) {
    if (!this.#activos.some((a) => a.id === Number(activoId)) || !(await this.#etiquetasDao.getById(etiquetaId))) {
      throw new Error(`Vínculo inválido: no existe el activo ${activoId} o la etiqueta ${etiquetaId} (clave foránea)`);
    }
    if (await this.tieneEtiqueta(activoId, etiquetaId)) {
      throw new Error(`Vínculo repetido: el activo ${activoId} ya tiene la etiqueta ${etiquetaId} (clave primaria)`);
    }
    this.#vinculos.push({ activoId: Number(activoId), etiquetaId: Number(etiquetaId) });
  }

  // Borra el vínculo. Devuelve true si lo borró, false si no existía.
  async quitarEtiqueta(activoId, etiquetaId, _tx) {
    const indice = this.#vinculos.findIndex((v) => v.activoId === Number(activoId) && v.etiquetaId === Number(etiquetaId));
    if (indice === -1) return false;

    this.#vinculos.splice(indice, 1);
    return true;
  }

  // Saca una etiqueta de todos los activos que la tienen (antes de borrarla). Devuelve cuántos vínculos borró.
  async quitarEtiquetaDeTodos(etiquetaId, _tx) {
    const antes = this.#vinculos.length;
    this.#vinculos = this.#vinculos.filter((v) => v.etiquetaId !== Number(etiquetaId));
    return antes - this.#vinculos.length;
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
