import { Model, DataTypes } from "sequelize";
import { sequelize } from "../../connection/index.js";

/**
 * Modelo de la tabla `etiquetas`: rótulos libres para agrupar activos («dividendos», «defensivo»).
 * Es uno de los dos lados de la relación N:N Activo–Etiqueta (ver models/index.js).
 */
class EtiquetaModel extends Model {}

EtiquetaModel.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    nombre: {
      type: DataTypes.STRING(30),
      allowNull: false,
      unique: true, // Última barrera de la regla del nombre único (ver EtiquetasSequelizeDao)
    },
  },
  {
    sequelize,
    modelName: "Etiqueta",
    tableName: "etiquetas",
    timestamps: false,
  }
);

export default EtiquetaModel;
