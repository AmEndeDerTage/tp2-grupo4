import { describe, it, expect, vi, beforeAll } from "vitest";
import loginOperador from "../../../usecases/auth/loginOperador.js";
import makeAuthUseCases from "../../../usecases/auth/makeAuthUseCases.js";
import createPasswordHasher from "../../../security/passwordHasher.js";

// El caso de uso recibe todo por parámetro: las credenciales del operador, el hasheador y el servicio de tokens.
// El hasheador es el real, con el costo mínimo para que los tests sean rápidos; el servicio de tokens es un doble
// que solo anota qué le pidieron firmar.
const hasher = createPasswordHasher({ rounds: 4 });
const tokens = { expiresIn: "1h", sign: vi.fn(() => "token-firmado") };
let operador;

beforeAll(async () => {
  operador = { usuario: "operador", passwordHash: await hasher.hash("la-clave-correcta") };
});

describe("loginOperador", () => {
  it("feliz: con usuario y contraseña correctos devuelve el token, su tipo y cuánto dura", async () => {
    const respuesta = await loginOperador({ usuario: "operador", password: "la-clave-correcta" }, operador, hasher, tokens);

    expect(respuesta).toEqual({ token: "token-firmado", tipo: "Bearer", expiraEn: "1h" });
  });

  it("en el token va lo mínimo: de quién es (sub), y nada de la contraseña ni de su hash", async () => {
    tokens.sign.mockClear();
    await loginOperador({ usuario: "operador", password: "la-clave-correcta" }, operador, hasher, tokens);

    expect(tokens.sign).toHaveBeenCalledExactlyOnceWith({ sub: "operador" });
  });

  it("la respuesta no trae el hash", async () => {
    const respuesta = await loginOperador({ usuario: "operador", password: "la-clave-correcta" }, operador, hasher, tokens);

    expect(JSON.stringify(respuesta)).not.toContain(operador.passwordHash);
  });

  it.each([
    ["contraseña incorrecta", { usuario: "operador", password: "otra" }],
    ["usuario incorrecto con la contraseña correcta", { usuario: "admin", password: "la-clave-correcta" }],
    ["los dos incorrectos", { usuario: "admin", password: "otra" }],
    ["el usuario con otras mayúsculas", { usuario: "Operador", password: "la-clave-correcta" }],
  ])("%s → 401 INVALID_CREDENTIALS, el mismo error en todos los casos, y no se firma nada", async (_caso, credenciales) => {
    tokens.sign.mockClear();

    await expect(loginOperador(credenciales, operador, hasher, tokens)).rejects.toMatchObject({
      code: "INVALID_CREDENTIALS",
      statusCode: 401,
      message: "Usuario o contraseña incorrectos",
    });
    expect(tokens.sign).not.toHaveBeenCalled();
  });

  it("la contraseña se compara siempre, también cuando el usuario ya no coincide (el tiempo de respuesta no lo delata)", async () => {
    const comparar = vi.spyOn(hasher, "compare");

    await expect(loginOperador({ usuario: "nadie", password: "x" }, operador, hasher, tokens)).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(comparar).toHaveBeenCalledExactlyOnceWith("x", operador.passwordHash);
    comparar.mockRestore();
  });
});

describe("makeAuthUseCases", () => {
  it("arma el login con las dependencias inyectadas: el controlador lo llama solo con las credenciales", async () => {
    const auth = makeAuthUseCases({ operador, hasher, tokens });

    await expect(auth.login({ usuario: "operador", password: "la-clave-correcta" })).resolves.toMatchObject({ token: "token-firmado" });
  });
});

describe("el hasheador de contraseñas", () => {
  it("dos hashes de la misma contraseña son distintos (cada uno lleva su salt) y los dos la reconocen", async () => {
    const [a, b] = [await hasher.hash("misma"), await hasher.hash("misma")];

    expect(a).not.toBe(b);
    expect(await hasher.compare("misma", a)).toBe(true);
    expect(await hasher.compare("misma", b)).toBe(true);
    expect(await hasher.compare("otra", a)).toBe(false);
  });
});
