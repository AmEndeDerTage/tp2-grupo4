import { describe, it, expect } from "vitest";
import { esPruebaHostil, MENSAJE_PRUEBA_HOSTIL } from "../../security/pruebaHostil.js";

// security/pruebaHostil.js es una función pura: recibe el code del error y el pedido, y dice si el rechazo
// tiene pinta de ataque. Se prueba sin servidor: alcanza con un objeto que tenga originalUrl y body.
const pedido = (originalUrl, body) => ({ originalUrl, body });
const hostil = (url, body, code = "VALIDATION_ERROR") => esPruebaHostil(code, pedido(url, body));

describe("esPruebaHostil — por el code del rechazo", () => {
  it.each(["PAYLOAD_TOO_LARGE", "UNSUPPORTED_MEDIA_TYPE", "BAD_REQUEST"])("%s: ningún uso normal lo produce, alcanza con el code", (code) => {
    expect(hostil("/etiquetas", undefined, code)).toBe(true);
  });

  it.each(["VALIDATION_ERROR", "INVALID_JSON", "ROUTE_NOT_FOUND", "ACTIVO_NO_ENCONTRADO", "TOPE_EXCEDIDO"])(
    "%s: un error común, sin firma en el pedido, no lo es",
    (code) => {
      expect(hostil("/activos/abc?nivel=L9", { nombre: "Coca-Cola" }, code)).toBe(false);
    }
  );
});

describe("esPruebaHostil — por las firmas, en la URL", () => {
  it.each([
    ["inyección SQL: condición siempre verdadera", "/activos/1%20OR%201=1"],
    ["inyección SQL: comilla y comentario", "/activos/1'%20--"],
    ["inyección SQL: comilla y OR entre comillas", "/activos?etiqueta=x'%20OR%20'1'='1"],
    ["inyección SQL: sentencia pegada con punto y coma", "/activos?sort=id;DROP%20TABLE%20activos"],
    ["inyección SQL: UNION SELECT", "/activos?nivel=L2'%20UNION%20SELECT%20*%20FROM%20activos--"],
    ["HTML inyectado", "/activos?etiqueta=<script>alert(1)</script>"],
    ["recorrido de directorios, codificado", "/activos/..%2f..%2fetc%2fpasswd"],
    ["archivo de configuración", "/.env"],
    ["archivo de la base", "/database.sqlite"],
    ["panel de administración", "/admin"],
    ["operador de consulta", "/activos?nivel[$ne]=L9"],
    ["contaminación de prototipo", "/activos?__proto__[polluted]=si"],
    ["byte nulo", "/activos/1%00"],
  ])("%s", (_familia, url) => {
    expect(hostil(url)).toBe(true);
  });

  it("una URL mal codificada no rompe al detector: se revisa tal como llegó", () => {
    expect(hostil("/activos/%E0%A4%A")).toBe(false);
    expect(hostil("/activos/%E0%A4%A/../x")).toBe(true);
  });
});

describe("esPruebaHostil — por las firmas, en el cuerpo", () => {
  it("un texto del cuerpo con inyección SQL", () => {
    expect(hostil("/activos", { ticker: "x' OR 1=1--", nombre: "n" })).toBe(true);
  });

  it("un operador como clave, anidado", () => {
    expect(hostil("/activos", { ticker: { $ne: null } })).toBe(true);
  });

  it("__proto__ y constructor.prototype como claves (así llegan en un JSON)", () => {
    expect(hostil("/etiquetas", JSON.parse('{"__proto__":{"admin":true}}'))).toBe(true);
    expect(hostil("/ordenes/1", { estado: "ejecutada", constructor: { prototype: { x: 1 } } })).toBe(true);
  });

  it("HTML en un texto dentro de una lista", () => {
    expect(hostil("/activos", { etiquetaIds: ["<img src=x onerror=alert(1)>"] })).toBe(true);
  });
});

describe("esPruebaHostil — lo que NO es una prueba hostil", () => {
  it.each([
    ["apóstrofo y & en un nombre", { nombre: "McDonald's & Sons", mercado: "LSE" }],
    ["«and» y «=» en un nombre", { nombre: "Procter and Gamble = P&G", nivel: "L7" }],
    ["«update», «;» y «and» en un motivo", { motivo: "vender; update de la tesis: ratio = 5 and tope = 100" }],
    ["paréntesis, «--» y «admin» en un motivo", { motivo: "Compra (ver nota); precio <= 55 -- revisar el admin de la cuenta" }],
    ["comillas y palabras sueltas de SQL", { motivo: 'Tesis: "select" drop en la tabla de precios', cantidad: -1 }],
    ["sin cuerpo", undefined],
    ["un cuerpo que no es un objeto", 5],
  ])("%s", (_caso, body) => {
    expect(hostil("/ordenes", body)).toBe(false);
  });

  it.each(["/activos/abc", "/activo/1", "/ordenes/1/ejecutar", "/activos?sort=precio", "/activos?limit=500"])("ruta o parámetro mal escrito: %s", (url) => {
    expect(hostil(url)).toBe(false);
  });
});

describe("esPruebaHostil — el detector no es un punto débil", () => {
  it("revisa una cantidad acotada de texto: lo que queda más allá no se mira", () => {
    const lejos = "a".repeat(2000) + "' OR 1=1--";
    expect(hostil("/activos", { nombre: lejos })).toBe(false);
    const muchos = Object.fromEntries(Array.from({ length: 300 }, (_, i) => ["k" + i, "x"]));
    expect(hostil("/activos", { ...muchos, ultimo: "' OR 1=1--" })).toBe(false);
  });

  it("100 kb armados contra cada firma se revisan en menos de 200 ms", () => {
    const textos = ["' ".padEnd(100000, " "), "or ".repeat(33000), "update " + "a".repeat(99000), "< ".repeat(50000), "'     ".repeat(16000), "and a = ".repeat(12000)];
    const t0 = performance.now();
    for (const texto of textos) hostil("/x", Object.fromEntries(Array.from({ length: 300 }, (_, i) => ["k" + i, texto])));
    expect(performance.now() - t0).toBeLessThan(200);
  });
});

describe("el mensaje", () => {
  it("es un texto fijo, escrito en un solo lugar", () => {
    expect(MENSAJE_PRUEBA_HOSTIL).toBe("Osvaldo Ojeda: you shall not pass!");
  });
});
