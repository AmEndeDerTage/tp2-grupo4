/**
 * Controlador de autenticación.
 * El token vuelve en el cuerpo; el cliente lo manda después en cada pedido que escribe, en el header
 * «Authorization: Bearer <token>».
 */
class AuthController {
  #useCases;

  constructor(useCases) {
    this.#useCases = useCases;
  }

  // POST /auth/login
  login = async (req, res) => {
    res.json(await this.#useCases.login(req.body));
  };
}

export default AuthController;
