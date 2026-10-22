import AppError from "../errors/AppError.js";

// Middleware 404: se monta después de todos los routers, así que solo lo alcanza una ruta inexistente
function notFound(req, res, next) {
  next(new AppError("ROUTE_NOT_FOUND", `La ruta ${req.method} ${req.originalUrl} no existe`, 404));
}

export default notFound;
