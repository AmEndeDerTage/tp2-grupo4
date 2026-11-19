import { describe, it, expect } from "vitest";
import { createHmac } from "node:crypto";
import createTokenService from "../../security/tokenService.js";

// security/tokenService.js se prueba solo: firma y verifica sin servidor ni base. Cada ataque conocido a un JWT
// (cambiar el contenido, declarar que no lleva firma, firmar con otro secreto, usar uno vencido) tiene su test.
const SECRETO = "un-secreto-de-prueba-de-mas-de-32-caracteres";
const tokens = createTokenService({ secret: SECRETO, expiresIn: "1h" });
const b64 = (objeto) => Buffer.from(JSON.stringify(objeto)).toString("base64url");
const firmar = (encabezado, contenido, secreto) => {
  const datos = `${b64(encabezado)}.${b64(contenido)}`;
  return `${datos}.${createHmac("sha256", secreto).update(datos).digest("base64url")}`;
};
const enUnaHora = () => Math.floor(Date.now() / 1000) + 3600;

describe("tokenService — firmar y verificar", () => {
  it("feliz: lo que firma lo verifica, y devuelve el contenido con su vencimiento", () => {
    const contenido = tokens.verify(tokens.sign({ sub: "operador" }));
    expect(contenido.sub).toBe("operador");
    expect(contenido.exp - contenido.iat).toBe(3600);
  });

  it("el contenido de un token se puede leer sin el secreto: no es confidencial", () => {
    const [, contenido] = tokens.sign({ sub: "operador" }).split(".");
    expect(JSON.parse(Buffer.from(contenido, "base64url").toString()).sub).toBe("operador");
  });

  it("informa la vida de los tokens que emite", () => {
    expect(tokens.expiresIn).toBe("1h");
  });
});

describe("tokenService — tokens que no deben pasar (401)", () => {
  const invalido = { code: "TOKEN_INVALID", statusCode: 401 };
  const [encabezado, contenido, firma] = tokens.sign({ sub: "operador" }).split(".");

  it("contenido cambiado con la firma original", () => {
    expect(() => tokens.verify(`${encabezado}.${b64({ sub: "otro", exp: enUnaHora() })}.${firma}`)).toThrow(expect.objectContaining(invalido));
  });

  it("firma cambiada", () => {
    const otra = firma.startsWith("A") ? "B" + firma.slice(1) : "A" + firma.slice(1);
    expect(() => tokens.verify(`${encabezado}.${contenido}.${otra}`)).toThrow(expect.objectContaining(invalido));
  });

  it.each(["none", "None", "NONE"])("declarado sin firma (alg: %s)", (alg) => {
    expect(() => tokens.verify(`${b64({ alg, typ: "JWT" })}.${b64({ sub: "operador", exp: enUnaHora() })}.`)).toThrow(expect.objectContaining(invalido));
  });

  it("bien armado pero firmado con otro secreto", () => {
    expect(() => tokens.verify(firmar({ alg: "HS256", typ: "JWT" }, { sub: "operador", exp: enUnaHora() }, "secret"))).toThrow(expect.objectContaining(invalido));
  });

  it("firmado con el secreto correcto pero con otro algoritmo que el fijado", () => {
    const datos = `${b64({ alg: "HS512", typ: "JWT" })}.${b64({ sub: "operador", exp: enUnaHora() })}`;
    const hs512 = `${datos}.${createHmac("sha512", SECRETO).update(datos).digest("base64url")}`;
    expect(() => tokens.verify(hs512)).toThrow(expect.objectContaining(invalido));
  });

  it.each(["", "abc", "a.b.c", "....."])("un texto que no es un token: «%s»", (texto) => {
    expect(() => tokens.verify(texto)).toThrow(expect.objectContaining(invalido));
  });

  it("vencido: TOKEN_EXPIRED, para que el cliente sepa que tiene que iniciar sesión de nuevo", () => {
    const vencido = firmar({ alg: "HS256", typ: "JWT" }, { sub: "operador", iat: 1, exp: 2 }, SECRETO);
    expect(() => tokens.verify(vencido)).toThrow(expect.objectContaining({ code: "TOKEN_EXPIRED", statusCode: 401 }));
  });
});
