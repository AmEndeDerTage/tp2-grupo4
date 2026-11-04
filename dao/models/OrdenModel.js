import { Model, DataTypes } from "sequelize";
import { sequelize } from "../../connection/index.js";

/**
 * Modelo de la tabla `ordenes`, el lado "N" de la relación Activo 1:N Orden.
 * activoId se declara acá para que sea NOT NULL: una orden no existe sin su activo.
 * La clave foránea (a qué tabla apunta y qué pasa al borrar) la define la asociación, en models/index.js.
 */
class OrdenModel extends Model {}

OrdenModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    activoId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sentido: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    cantidad: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // FLOAT: ver el comentario de ratio en ActivoModel. La regla 3 compara precios con ===: necesita un number.
    precioLimite: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    // DATEONLY: fecha sin hora; se guarda y se devuelve como texto AAAA-MM-DD, igual que en memoria
    validaHasta: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    estado: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: "viva",
    },
    motivo: {
      type: DataTypes.STRING(400),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Orden",
    tableName: "ordenes",
    timestamps: false,
  }
);

export default OrdenModel;
