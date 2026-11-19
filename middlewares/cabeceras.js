/**
 * Cabeceras de seguridad: instrucciones para el navegador que recibe la respuesta. Van en todas, también en los errores.
 *  - sin X-Powered-By: no hace falta anunciar con qué está hecho el servidor
 *  - X-Content-Type-Options: nosniff → el navegador respeta el Content-Type y no «adivina» (un JSON no se ejecuta como HTML)
 *  - X-Frame-Options y frame-ancestors → ninguna otra página puede mostrar esta adentro de un marco y hacer clickear a ciegas
 *  - Content-Security-Policy → de dónde puede cargar cosas la página: solo de este mismo servidor
 *    (los estilos escritos en la propia página y las imágenes embebidas se permiten porque Swagger UI los usa)
 *  - Referrer-Policy → al seguir un enlace no se le cuenta al otro sitio de dónde se viene
 *  - Cross-Origin-Resource-Policy → otra página no puede incrustar respuestas de esta API como si fueran un recurso suyo
 */
const CABECERAS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy": "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'",
  "Referrer-Policy": "no-referrer",
  "Cross-Origin-Resource-Policy": "same-origin",
};

function cabeceras(req, res, next) {
  res.removeHeader("X-Powered-By");
  res.set(CABECERAS);
  next();
}

export default cabeceras;
