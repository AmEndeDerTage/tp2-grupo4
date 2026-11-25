import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import YAML from "yaml";
import createAuthRouter from "../../routes/authRoutes.js";
import createActivosRouter from "../../routes/activosRoutes.js";
import createOrdenesRouter from "../../routes/ordenesRoutes.js";
import createEtiquetasRouter from "../../routes/etiquetasRoutes.js";

/**
 * Tests de la documentación: que docs/openapi.yaml no pueda quedar desfasado del código sin que algo falle.
 * El YAML se escribe a mano, así que nada lo ata a las rutas: estos tests son ese lazo. Verifican que
 *  1. cada ruta de Express está documentada, y cada operación documentada existe en Express;
 *  2. el acceso documentado (pública, o con token y su 401) es el que la ruta tiene de verdad;
 *  3. el documento es coherente por dentro: ids de operación únicos, una respuesta 2xx por operación y ningún $ref roto.
 * No hace falta .env ni levantar el servidor: los routers se construyen con un controlador y unos middlewares falsos,
 * y la lista de rutas se lee de `router.stack`, donde Express la guarda.
 */

// Dobles: un controlador que tiene cualquier método que le pidan, y middlewares que se pueden reconocer después
const controlador = new Proxy({}, { get: () => (req, res) => res.end() });
const authenticate = (req, res, next) => next();
const loginLimiter = (req, res, next) => next();

// Dónde se monta cada router: tiene que coincidir con container/container.js
const MONTAJES = [
  ["/auth", createAuthRouter(controlador, { loginLimiter })],
  ["/activos", createActivosRouter(controlador, { authenticate })],
  ["/ordenes", createOrdenesRouter(controlador, { authenticate })],
  ["/etiquetas", createEtiquetasRouter(controlador, { authenticate })],
];

// "/activos" + "/:id/etiquetas/:etiquetaId" → "/activos/{id}/etiquetas/{etiquetaId}" (la sintaxis de OpenAPI)
const aRutaOpenApi = (prefijo, ruta) => (prefijo + (ruta === "/" ? "" : ruta)).replace(/:(\w+)/g, "{$1}");

// Las rutas reales, como { clave: "GET /activos/{id}", conToken: true | false }
const rutas = MONTAJES.flatMap(([prefijo, router]) =>
  router.stack
    .filter((capa) => capa.route)
    .flatMap((capa) =>
      Object.keys(capa.route.methods).map((metodo) => ({
        clave: `${metodo.toUpperCase()} ${aRutaOpenApi(prefijo, capa.route.path)}`,
        conToken: capa.route.stack.some((paso) => paso.handle === authenticate),
      }))
    )
);

// Las operaciones documentadas, con la misma forma
const spec = YAML.parse(readFileSync(new URL("../../docs/openapi.yaml", import.meta.url), "utf8"));
const METODOS = ["get", "post", "put", "delete", "patch"];
const documentadas = Object.entries(spec.paths).flatMap(([ruta, item]) =>
  METODOS.filter((metodo) => item[metodo]).map((metodo) => ({
    clave: `${metodo.toUpperCase()} ${ruta}`,
    conToken: (item[metodo].security ?? []).some((esquema) => "bearerAuth" in esquema),
    operacion: item[metodo],
  }))
);

describe("la documentación coincide con las rutas de Express", () => {
  it("el test encuentra las rutas (si la lista quedara vacía, todo lo demás pasaría sin verificar nada)", () => {
    expect(rutas.length).toBeGreaterThan(20);
  });

  it("cada ruta de Express está documentada", () => {
    const claves = documentadas.map((d) => d.clave);
    expect(rutas.map((r) => r.clave).filter((clave) => !claves.includes(clave))).toEqual([]);
  });

  it("cada operación documentada existe en Express", () => {
    const claves = rutas.map((r) => r.clave);
    expect(documentadas.map((d) => d.clave).filter((clave) => !claves.includes(clave))).toEqual([]);
  });

  it.each(rutas.map((r) => [r.clave, r.conToken]))("%s: ¿exige token? %s, y la documentación dice lo mismo", (clave, conToken) => {
    expect(documentadas.find((d) => d.clave === clave)?.conToken).toBe(conToken);
  });

  it.each(documentadas.filter((d) => d.conToken).map((d) => [d.clave, d.operacion]))("%s exige token y documenta el 401", (_, operacion) => {
    expect(operacion.responses).toHaveProperty("401");
  });

  it("el inicio de sesión lleva su límite de intentos, y es lo primero que corre", () => {
    const [, routerAuth] = MONTAJES[0];
    const login = routerAuth.stack.find((capa) => capa.route?.path === "/login").route;
    expect(login.stack[0].handle).toBe(loginLimiter);
  });
});

describe("el documento OpenAPI es coherente por dentro", () => {
  it("es OpenAPI 3 y declara el esquema de seguridad que usan las operaciones", () => {
    expect(spec.openapi).toMatch(/^3\./);
    expect(spec.components.securitySchemes.bearerAuth).toMatchObject({ type: "http", scheme: "bearer" });
  });

  it("cada operationId es único", () => {
    const ids = documentadas.map((d) => d.operacion.operationId);
    expect(ids.every(Boolean)).toBe(true);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(documentadas.map((d) => [d.clave, d.operacion]))("%s documenta al menos una respuesta 2xx", (_, operacion) => {
    expect(Object.keys(operacion.responses).some((status) => status.startsWith("2"))).toBe(true);
  });

  it("ningún $ref apunta a algo que no existe", () => {
    // Junta todos los $ref del documento, esté donde esté cada uno
    const refs = [];
    const recorrer = (nodo) => {
      if (Array.isArray(nodo)) return nodo.forEach(recorrer);
      if (nodo === null || typeof nodo !== "object") return;
      if (typeof nodo.$ref === "string") refs.push(nodo.$ref);
      Object.values(nodo).forEach(recorrer);
    };
    recorrer(spec);

    // "#/components/schemas/Activo" → spec.components.schemas.Activo
    const resolver = (ref) => ref.replace(/^#\//, "").split("/").reduce((nodo, clave) => nodo?.[clave], spec);
    expect(refs.length).toBeGreaterThan(50);
    expect(refs.filter((ref) => !ref.startsWith("#/") || resolver(ref) === undefined)).toEqual([]);
  });
});
