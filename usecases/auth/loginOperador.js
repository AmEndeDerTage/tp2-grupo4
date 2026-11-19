import AppError from "../../errors/AppError.js";

/**
 * Caso de uso: iniciar sesión.
 * Compara lo recibido con las credenciales del operador y, si coinciden, firma un token.
 * El error es el mismo si falla el usuario o la contraseña: así la respuesta no dice cuál de los dos estaba bien.
 * La contraseña se compara siempre, aunque el usuario ya no coincida: si no, una respuesta más rápida lo delataría.
 */
async function loginOperador({ usuario, password }, operador, hasher, tokens) {
  const passwordOk = await hasher.compare(password, operador.passwordHash);
  if (usuario !== operador.usuario || !passwordOk) {
    throw new AppError("INVALID_CREDENTIALS", "Usuario o contraseña incorrectos", 401);
  }

  // En el payload va lo mínimo: sub («subject») dice de quién es el token. No es secreto: cualquiera puede leerlo.
  return { token: tokens.sign({ sub: operador.usuario }), tipo: "Bearer", expiraEn: tokens.expiresIn };
}

export default loginOperador;
