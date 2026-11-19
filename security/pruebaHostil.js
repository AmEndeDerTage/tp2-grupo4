/**
 * Reconocimiento de pruebas de vulnerabilidad.
 * No decide si un pedido se acepta: eso lo siguen decidiendo la validación y las reglas. Solo mira los pedidos que
 * YA fueron rechazados (4xx) y dice si el rechazo tiene pinta de ataque; en ese caso el errorHandler cambia el
 * mensaje, y nada más: el status y el code quedan como estaban, así que un cliente legítimo no pierde nada.
 */

// El texto que recibe quien prueba una vulnerabilidad, en lugar del mensaje habitual. Único lugar donde está escrito.
const MENSAJE_PRUEBA_HOSTIL = "Osvaldo Ojeda: you shall not pass!";

// Rechazos que ningún uso normal de la API produce: con solo ver el code alcanza.
// Los tres primeros son pedidos que ni se pudieron leer; después, un token que no firmó este servidor y los dos límites de pedidos.
const CODIGOS_HOSTILES = new Set(["PAYLOAD_TOO_LARGE", "UNSUPPORTED_MEDIA_TYPE", "BAD_REQUEST", "TOKEN_INVALID", "TOO_MANY_REQUESTS", "TOO_MANY_ATTEMPTS"]);

// Firmas: fragmentos típicos de cada familia de ataque. Se buscan en la URL y en los textos del cuerpo.
// Todas tienen repeticiones acotadas ({0,5}, {1,30}): el tiempo de revisión crece en proporción al texto y nunca más,
// para que el propio detector no sea un punto débil.
const FIRMAS = [
  // Inyección SQL: una comilla que cierra el texto y sigue con sintaxis, una condición siempre verdadera, una sentencia
  /['"`]\s{0,5}\)?\s{0,5}(--|\b(or|and|union)\s)/i,
  /\b(or|and)\s{1,5}(['"]?)(\w{1,20})\2\s{0,5}=\s{0,5}\2\3\2(?!\w)/i,
  /\b(union\s{1,5}(all\s{1,5})?select|drop\s{1,5}table|insert\s{1,5}into|delete\s{1,5}from|update\s{1,5}\w{1,30}\s{1,5}set|alter\s{1,5}table)\b/i,
  // HTML y JavaScript inyectados
  /<\s{0,5}\/?\s{0,5}(script|img|svg|iframe|object|embed)\b|\bon(error|load|click)\s{0,5}=|javascript:/i,
  // Recorrido de directorios y archivos que no son de la API
  /\.\.[/\\]|[/\\]\.\.|\/etc\/passwd|\.env\b|\.git\b|\.sqlite\b|package(-lock)?\.json|node_modules|wp-(login|admin)|phpmyadmin|\/admin\b/i,
  // Contaminación de prototipo y operadores de consulta
  /__proto__|^(constructor|prototype)$|constructor\W{1,6}prototype|\$(ne|gt|gte|lt|lte|in|nin|or|and|where|regex)\b|\[(ne|gt|gte|lt|lte)\]/i,
  // Byte nulo
  /\u0000|%00/,
];

// Cuánto texto se revisa como máximo: lo que queda más allá no se mira (y recibe el mensaje común)
const MAX_TEXTOS = 200;
const MAX_LARGO = 2000;

// Junta, sin pasarse de los máximos, las claves y los textos de un cuerpo ya interpretado (objetos y listas anidados)
function textosDe(valor, textos = [], nivel = 0) {
  if (textos.length >= MAX_TEXTOS || nivel > 6) return textos;
  if (typeof valor === "string") textos.push(valor.slice(0, MAX_LARGO));
  else if (valor && typeof valor === "object") {
    for (const clave of Object.keys(valor)) {
      if (textos.length >= MAX_TEXTOS) break;
      textos.push(clave.slice(0, MAX_LARGO));
      textosDe(valor[clave], textos, nivel + 1);
    }
  }
  return textos;
}

// La URL tal como la escribió el cliente y, si se puede, decodificada (%27 → ')
function urlLegible(url) {
  try {
    return `${url} ${decodeURIComponent(url)}`.slice(0, 2 * MAX_LARGO);
  } catch {
    return url.slice(0, MAX_LARGO);
  }
}

/**
 * ¿El pedido rechazado es una prueba de vulnerabilidad?
 * @param {string} code el code del error que se está por responder
 * @param {import("express").Request} req
 */
function esPruebaHostil(code, req) {
  if (CODIGOS_HOSTILES.has(code)) return true;
  const textos = [urlLegible(req.originalUrl), ...textosDe(req.body)];
  return textos.some((texto) => FIRMAS.some((firma) => firma.test(texto)));
}

export { esPruebaHostil, MENSAJE_PRUEBA_HOSTIL };
