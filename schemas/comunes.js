import { z } from "zod";

/**
 * Piezas de validación compartidas por los schemas de todas las entidades: lo que vale para cualquier texto libre
 * y para cualquier número, venga de donde venga.
 */

// Topes de cordura para los números: muy por encima de cualquier valor real, y lejos de donde las cuentas pierden
// precisión o dan Infinity (cantidad × precio llega como mucho a 1e18).
const MAX_CANTIDAD = 1_000_000_000;
const MAX_PRECIO = 1_000_000_000;
const MAX_RATIO = 1_000_000;

// Caracteres que no se ven y que un texto legítimo no necesita: de control (incluidos los escapes de terminal y el
// byte nulo), espacios de ancho cero y marcas que invierten el sentido de lectura.
const INVISIBLES = /[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/;

// ¿Es un texto bien formado y sin caracteres invisibles? isWellFormed() detecta los «medios caracteres»
// (un par sustituto partido), que cada motor de persistencia guardaría de una forma distinta.
const esTextoLimpio = (texto) => texto.isWellFormed() && !INVISIBLES.test(texto);
const MENSAJE_TEXTO_LIMPIO = "no puede tener caracteres de control ni invisibles";

/**
 * Entero positivo que llega como texto, en la URL o en la query: solo dígitos.
 * Convertir con Number() aceptaría también "0x10", "1e2", "+1" o " 10", que son otras formas de escribir un número
 * y no lo que un cliente de esta API manda. Hasta 15 dígitos: más allá un entero deja de ser exacto.
 */
const enteroPositivoDeTexto = (nombre) =>
  z
    .string({ error: `${nombre} debe ser un número entero positivo` })
    .regex(/^\d{1,15}$/, `${nombre} debe ser un número entero positivo`)
    .transform(Number)
    .refine((n) => n > 0, `${nombre} debe ser mayor a 0`);

export { MAX_CANTIDAD, MAX_PRECIO, MAX_RATIO, esTextoLimpio, MENSAJE_TEXTO_LIMPIO, enteroPositivoDeTexto };
