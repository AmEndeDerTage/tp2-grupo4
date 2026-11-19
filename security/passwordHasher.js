import bcrypt from "bcryptjs";

/**
 * Hasheador de contraseñas. Contrato: hash(plain) y compare(plain, hash).
 * Un hash es de una sola vía: con él se puede comprobar una contraseña, pero no recuperarla. bcrypt además mezcla
 * cada contraseña con un valor aleatorio (salt) que queda guardado dentro del propio hash, y es lento a propósito
 * (rounds: cada +1 duplica el tiempo), para que probar millones de contraseñas no sea viable.
 * Quien lo usa no sabe que atrás hay bcryptjs: recibe este objeto ya armado, igual que un DAO o un notificador.
 */
function createPasswordHasher({ rounds }) {
  return {
    hash: (plain) => bcrypt.hash(plain, rounds),
    compare: (plain, hash) => bcrypt.compare(plain, hash),
  };
}

export default createPasswordHasher;
