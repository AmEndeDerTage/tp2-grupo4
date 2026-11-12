import { sequelize } from "../../connection/index.js";
import ActivoModel from "./ActivoModel.js";
import OrdenModel from "./OrdenModel.js";
import EtiquetaModel from "./EtiquetaModel.js";

// -----------------------------------------------------------------------------
// ASOCIACIONES: acá se centraliza cómo se relacionan las tablas
// -----------------------------------------------------------------------------
// Relación 1:N: un activo tiene muchas órdenes y cada orden pertenece a un activo.
// Se declara de los dos lados porque cada uno habilita consultas desde su punto de vista;
// `as` es el nombre con el que aparece el otro modelo (include: [{ model: ActivoModel, as: "activo" }]).
//
// onDelete RESTRICT: la base se niega a borrar un activo con órdenes. La regla 8 (deleteActivo) ya lo impide
// con un 409; esto es la segunda barrera si esa regla se salteara. Sin declararlo, Sequelize usa CASCADE
// y un error en la regla borraría las órdenes en silencio, historial incluido.
ActivoModel.hasMany(OrdenModel, { foreignKey: "activoId", as: "ordenes", onDelete: "RESTRICT" });
OrdenModel.belongsTo(ActivoModel, { foreignKey: "activoId", as: "activo", onDelete: "RESTRICT" });

// Exportamos la conexión (para sync) y los modelos ya asociados: los DAOs importan siempre desde este archivo
export { sequelize, ActivoModel, OrdenModel, EtiquetaModel };
