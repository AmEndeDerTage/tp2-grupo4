import { sequelize } from "../../connection/index.js";
import ActivoModel from "./ActivoModel.js";
import OrdenModel from "./OrdenModel.js";
import EtiquetaModel from "./EtiquetaModel.js";
import ActivoEtiquetaModel from "./ActivoEtiquetaModel.js";

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

// Relación N:N: un activo tiene muchas etiquetas y una etiqueta está en muchos activos, a través de la tabla
// intermedia activo_etiquetas (como Users–Books a través de Loans en el ejemplo de la materia).
// Se declara en los dos sentidos porque cada uno habilita las consultas y los métodos desde su lado:
//   - desde el activo (as: "etiquetas"): include de sus etiquetas, activo.getEtiquetas(), activo.hasEtiqueta()
//   - desde la etiqueta (as: "activos"): etiqueta.getActivos(), que usa el filtro GET /activos?etiqueta=
// onDelete CASCADE en los dos lados: el vínculo no sobrevive a ninguno de sus extremos. Borrar una etiqueta la saca de
// todos los activos (decisión de S6b) y borrar un activo (sin órdenes: regla 8) se lleva sus vínculos. Es lo que Sequelize
// pone por defecto en una N:N; se declara para que se lea. A diferencia de las órdenes, un vínculo no es historia.
ActivoModel.belongsToMany(EtiquetaModel, {
  through: ActivoEtiquetaModel,
  foreignKey: "activoId",
  otherKey: "etiquetaId",
  as: "etiquetas",
  onDelete: "CASCADE",
});
EtiquetaModel.belongsToMany(ActivoModel, {
  through: ActivoEtiquetaModel,
  foreignKey: "etiquetaId",
  otherKey: "activoId",
  as: "activos",
  onDelete: "CASCADE",
});

// Exportamos la conexión (para sync) y los modelos ya asociados: los DAOs importan siempre desde este archivo
export { sequelize, ActivoModel, OrdenModel, EtiquetaModel, ActivoEtiquetaModel };
