import loginOperador from "./loginOperador.js";

/**
 * Factory de casos de uso de autenticación.
 * Recibe por nombre las credenciales del operador ({ usuario, passwordHash }), el hasheador y el servicio de tokens.
 */
function makeAuthUseCases({ operador, hasher, tokens }) {
  return {
    login: (credenciales) => loginOperador(credenciales, operador, hasher, tokens),
  };
}

export default makeAuthUseCases;
