# Checklist de buenas prácticas — API Activos y Órdenes

Autoevaluación del proyecto contra un checklist de buenas prácticas para una API REST en capas. Cada ítem tiene su **evidencia**: el comando, el test o el archivo que lo demuestra.

✅ se cumple · 🔧 no se cumplía y se corrigió en la última pasada · ⚠️ no se cumple, a sabiendas (está en *Limitaciones conocidas* del README) · — no aplica

## Arquitectura

| | Ítem | Evidencia |
|---|---|---|
| ✅ | Los controladores solo traducen HTTP ↔ caso de uso | `controllers/`: status, header `Location` y el 404 cuando el caso de uso devuelve `null`. Ninguna regla de negocio |
| ✅ | Los casos de uso no conocen Express | `grep -rnE "\b(req\|res)\." usecases/` → sin resultados |
| ✅ | Los casos de uso no leen `process.env` ni llaman a `new Date()` o `fetch` | `grep -rnE "process\.env\|new Date\(\|fetch\(" usecases/` → solo un comentario. El reloj (`utils/clock.js`) y el umbral del aviso de tope llegan inyectados |
| ✅ | Todas las dependencias se arman en un solo lugar | `container/container.js` (Composition Root) |
| ✅ | La persistencia se cambia sin tocar los casos de uso | `PERSISTENCE_TYPE=memory` o `sequelize`; `dao/daoFactory.js` es el único que elige. Ningún archivo de `usecases/`, `controllers/` ni `routes/` importa de `dao/` |

## REST y HTTP

| | Ítem | Evidencia |
|---|---|---|
| ✅ | URL con sustantivos en plural; el verbo HTTP dice la acción | `/activos`, `/ordenes`, `/etiquetas`. La acción que no es CRUD va como subrecurso: `POST /ordenes/{id}/ejecucion` |
| ✅ | Crear → `201` con `Location`; borrar → `204` sin cuerpo | Los cuatro `POST` que crean (`create` y `asignarEtiqueta` de los controladores); `remove` de cada controlador |
| ✅ | Cada error tiene el status correcto | `400` forma · `401` quién sos · `404` no existe · `409` choca con una regla o con el estado · `413` y `415` errores de transporte · `429` límites · `500` solo lo que no es culpa del pedido. El `403` no aplica: hay un solo operador, sin roles |
| ✅ | Una ruta inexistente responde `404` con el formato estándar | `middlewares/notFound.js` → `ROUTE_NOT_FOUND` |

## Validación y errores

| | Ítem | Evidencia |
|---|---|---|
| ✅ | Todo lo que entra (body, query, params) se valida antes del caso de uso | Cada ruta de `routes/` con cuerpo, consulta o parámetros tiene su `validate`, `validateQuery` o `validateParams` |
| ✅ | Todos los errores tienen el mismo formato | `middlewares/errorHandler.js`: `{ error: { code, message, details? } }` |
| ✅ | Un error inesperado responde `500` genérico, sin detalles internos | `errorHandler.js`: el detalle va a la consola del servidor, no a la respuesta |
| ✅ | Las reglas de negocio están en el caso de uso, no en el esquema de Zod | `usecases/ordenes/reglasOrden.js`. Zod valida la forma (`schemas/`); lo que necesita datos guardados o el reloj es regla |

## Seguridad

| | Ítem | Evidencia |
|---|---|---|
| ✅ | La contraseña se guarda hasheada (bcrypt) y nunca sale en una respuesta | `security/passwordHasher.js`; en `.env` va el hash. Test «la respuesta no trae el hash» en `tests/usecases/auth/loginOperador.test.js` |
| ✅ | El secreto del JWT no tiene valor por defecto y no está en el repositorio | `config/config.js` corta el arranque sin `JWT_SECRET`; `.env` está en `.gitignore` |
| ✅ | Cada endpoint de escritura está protegido | `authenticate` va primero en los 12 pedidos que escriben; `tests/docs/openapi.test.js` lo compara con la documentación. Permisos por dueño: no aplica (un solo operador) |
| ✅ | El login da el mismo error si falla el usuario o la contraseña | `tests/usecases/auth/loginOperador.test.js` (mismo `code`, mismo mensaje, y el hash se compara igual) |
| ✅ | Hay un límite de intentos fallidos de login | `middlewares/rateLimit.js`: al sexto intento fallido en un minuto → `429 TOO_MANY_ATTEMPTS` |
| ⚠️ | Un token deja de valer si cambia la contraseña | No: el JWT no guarda estado. Vence en `JWT_EXPIRES_IN` (1 h); para invalidar todos se cambia `JWT_SECRET` |
| ⚠️ | Los límites de pedidos funcionan con varias instancias del servidor | No: la cuenta vive en la memoria del proceso |
| ⚠️ | El tráfico viaja cifrado | No: HTTP. Por defecto escucha solo en `127.0.0.1` |

## Configuración y repositorio

| | Ítem | Evidencia |
|---|---|---|
| ✅ | `process.env` se lee en un solo archivo | `grep -rn "process.env" --include=*.js . \| grep -v node_modules` → solo `config/config.js` |
| ✅ | Hay un `.env.example` con todas las variables y ningún secreto real | Las 14 variables de `config/config.js`; el secreto y el hash son de ejemplo, y lo dicen |
| ✅ | `.gitignore` excluye `node_modules/`, `.env`, la base local, los logs y `coverage` | `.gitignore`; en la historia del repo nunca entró ninguno |
| ✅ | El `package-lock.json` está versionado | En el repo |
| ✅ | Las herramientas de desarrollo están en `devDependencies` | `vitest` |
| 🔧 | `package.json` declara la versión de Node | Faltaba. Agregado `"engines": { "node": ">=20.17" }`, la misma que pide el README |
| ✅ | Los valores que cambian según el entorno están en un solo lugar, también en las pruebas manuales | `requests.http` define `@base` una vez y todos los pedidos la usan |
| 🔧 | El arranque informa sus errores | `index.js` anunciaba «escucha» aunque el puerto estuviera ocupado (en Express 5 el callback de `listen` también recibe el error). Ahora lo informa y termina con código 1 |

## Persistencia

| | Ítem | Evidencia |
|---|---|---|
| ✅ | Los dos adaptadores respetan la misma interfaz | Mismos métodos en `dao/*/…MemoryDao.js` y `…SequelizeDao.js`; `requests.http` da las mismas respuestas en los dos modos |
| ✅ | Las reglas del tipo «leer, verificar y después escribir» resisten pedidos simultáneos | Van dentro de una transacción inyectada (`dao/transacciones.js`). Cinco altas iguales a la vez → un `201` y cuatro `409`, en los dos modos |
| ⚠️ | Hay migraciones de base | No: `sync()`. Si cambia un modelo hay que borrar `database.sqlite` |

## Integraciones externas

| | Ítem | Evidencia |
|---|---|---|
| — | APIs externas detrás de un gateway, con timeout y degradación | No aplica: la API no consume servicios externos. El único canal de salida son los notificadores (`notifications/`), detrás de un contrato; si uno falla, la operación responde igual |

## Tests

| | Ítem | Evidencia |
|---|---|---|
| ✅ | `npm test` corre sin `.env`, sin base y sin red | Corrido en un clon limpio, sin `.env` |
| ✅ | Cada regla de negocio tiene su caso feliz, su borde, su violación y «el estado no cambió» | `tests/usecases/`: los nombres de los tests lo dicen |
| ✅ | Los tests detectan bugs | Cada uno se verificó rompiendo el código a propósito: tiene que fallar |

## Documentación

| | Ítem | Evidencia |
|---|---|---|
| ✅ | Cada endpoint está documentado con sus parámetros, su cuerpo, sus respuestas y cada `code` de error | `docs/openapi.yaml`, en `/api-docs`: 22 operaciones |
| 🔧 | La documentación se genera del código o se verifica con tests | El YAML se escribe a mano y se verificaba con herramientas que no estaban en el repositorio. Ahora `tests/docs/openapi.test.js` falla si una ruta queda sin documentar, si se documenta una que no existe o si el acceso no coincide con el del router |
| ✅ | El README permite levantar el proyecto sin preguntarle nada a nadie | Probado en un clon limpio, siguiendo solo el README |
| 🔧 | Las limitaciones conocidas están escritas | README, sección *Limitaciones conocidas* (antes había solo las de seguridad) |
